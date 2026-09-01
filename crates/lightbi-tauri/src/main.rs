#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{body::Body, Router};
use http_body_util::BodyExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    net::IpAddr,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tower::ServiceExt;

#[cfg(target_os = "windows")]
const API_BASE_URL: &str = "http://lightbi.localhost";
#[cfg(not(target_os = "windows"))]
const API_BASE_URL: &str = "lightbi://localhost";

#[derive(Clone)]
struct InProcessCore {
    runtime: Arc<tokio::runtime::Runtime>,
    router: Router,
}

#[derive(Clone)]
struct EmbeddedCore(Arc<Mutex<Option<InProcessCore>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeConfig {
    api_base_url: &'static str,
    product_channel: &'static str,
    native: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseState {
    edition: &'static str,
    status: &'static str,
    key_required: bool,
    feature_restrictions: Vec<&'static str>,
}

#[tauri::command]
fn runtime_config() -> RuntimeConfig {
    RuntimeConfig {
        api_base_url: API_BASE_URL,
        product_channel: "beta",
        native: true,
    }
}

#[tauri::command]
fn license_state() -> LicenseState {
    LicenseState {
        edition: "LightBI Beta",
        status: "beta_unrestricted",
        key_required: false,
        feature_restrictions: Vec::new(),
    }
}

#[tauri::command]
fn backend_status(state: State<'_, EmbeddedCore>) -> bool {
    state.0.lock().map(|core| core.is_some()).unwrap_or(false)
}


#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeHttpRequest {
    url: String,
    method: String,
    #[serde(default)]
    headers: HashMap<String, String>,
    body: Option<Vec<u8>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeHttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

fn native_http_url(value: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(value).map_err(|error| format!("Invalid external URL: {error}"))?;
    let local_debug_http = cfg!(debug_assertions)
        && url.scheme() == "http"
        && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"));
    if url.scheme() != "https" && !local_debug_http {
        return Err("Native external requests require HTTPS.".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Credentials embedded in external URLs are not allowed.".to_string());
    }
    if let Some(host) = url.host_str() {
        if let Ok(ip) = host.parse::<IpAddr>() {
            let blocked = match ip {
                IpAddr::V4(ip) => ip.is_private() || ip.is_loopback() || ip.is_link_local() || ip.is_unspecified() || ip.is_multicast(),
                IpAddr::V6(ip) => ip.is_loopback() || ip.is_unspecified() || ip.is_multicast() || ip.is_unique_local() || ip.is_unicast_link_local(),
            };
            if blocked && !local_debug_http {
                return Err("Private or local network targets are not allowed for native external requests.".to_string());
            }
        }
    }
    Ok(url)
}

#[tauri::command]
async fn native_http_request(request: NativeHttpRequest) -> Result<NativeHttpResponse, String> {
    let url = native_http_url(&request.url)?;
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| "Unsupported HTTP method.".to_string())?;
    if !matches!(method, reqwest::Method::GET | reqwest::Method::POST | reqwest::Method::PUT | reqwest::Method::PATCH | reqwest::Method::DELETE | reqwest::Method::HEAD) {
        return Err("Unsupported HTTP method.".to_string());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(8))
        .timeout(Duration::from_secs(45))
        .user_agent("LightBI-Native/0.9")
        .build()
        .map_err(|error| format!("Could not initialize native HTTP client: {error}"))?;
    let mut builder = client.request(method, url);
    for (name, value) in request.headers {
        let name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| format!("Invalid HTTP header name: {name}"))?;
        let value = reqwest::header::HeaderValue::from_str(&value)
            .map_err(|_| "Invalid HTTP header value.".to_string())?;
        builder = builder.header(name, value);
    }
    if let Some(body) = request.body {
        builder = builder.body(body);
    }
    let response = builder.send().await.map_err(|error| format!("Native HTTP request failed: {error}"))?;
    let status = response.status().as_u16();
    if response.content_length().unwrap_or(0) > 256 * 1024 * 1024 {
        return Err("External response exceeds the 256 MiB native safety boundary.".to_string());
    }
    let headers = response.headers().iter().filter_map(|(name, value)| {
        value.to_str().ok().map(|value| (name.to_string(), value.to_string()))
    }).collect();
    let body = response.bytes().await.map_err(|error| format!("Could not read native HTTP response: {error}"))?.to_vec();
    if body.len() > 256 * 1024 * 1024 {
        return Err("External response exceeds the 256 MiB native safety boundary.".to_string());
    }
    Ok(NativeHttpResponse { status, headers, body })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveExportFileRequest {
    suggested_name: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    extensions: Vec<String>,
    bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedExportFile {
    file_name: String,
    path: String,
}

fn safe_suggested_file_name(value: &str) -> String {
    Path::new(value)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("LightBI-export")
        .chars()
        .filter(|character| !matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'))
        .take(180)
        .collect()
}

#[tauri::command]
async fn save_export_file(request: SaveExportFileRequest) -> Result<Option<SavedExportFile>, String> {
    let suggested_name = safe_suggested_file_name(&request.suggested_name);
    let description = if request.description.trim().is_empty() { "LightBI export".to_string() } else { request.description.trim().to_string() };
    let extensions: Vec<String> = request.extensions.into_iter()
        .map(|value| value.trim_start_matches('.').to_ascii_lowercase())
        .filter(|value| !value.is_empty() && value.len() <= 12 && value.chars().all(|character| character.is_ascii_alphanumeric()))
        .collect();
    let extension_refs: Vec<&str> = extensions.iter().map(String::as_str).collect();
    let mut dialog = rfd::AsyncFileDialog::new().set_file_name(&suggested_name);
    if !extension_refs.is_empty() {
        dialog = dialog.add_filter(&description, &extension_refs);
    }
    let Some(handle) = dialog.save_file().await else { return Ok(None); };
    let path = handle.path().to_path_buf();
    tokio::fs::write(&path, request.bytes).await.map_err(|error| format!("Could not save export: {error}"))?;
    let file_name = path.file_name().and_then(|name| name.to_str()).unwrap_or(&suggested_name).to_string();
    Ok(Some(SavedExportFile { file_name, path: path.to_string_lossy().to_string() }))
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct PreparedUpdateMetadata {
    version: String,
    platform: String,
    architecture: String,
    artifact: String,
    source_url: String,
    sha256: String,
    verified: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PreparedUpdateResult {
    version: String,
    artifact: String,
    sha256: String,
    reused: bool,
    ready: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
    phase: &'static str,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
    percent: Option<u8>,
}

fn valid_update_version(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-'))
}

fn valid_update_filename(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 180
        && !value.starts_with('.')
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_')
        })
}

fn validate_update_request(
    version: &str,
    platform: &str,
    architecture: &str,
    url: &str,
    sha256: &str,
    filename: &str,
) -> Result<(), String> {
    if !valid_update_version(version)
        || !valid_update_filename(filename)
        || !url.starts_with("https://")
        || sha256.len() != 64
        || !sha256.chars().all(|value| value.is_ascii_hexdigit())
    {
        return Err("Update metadata is invalid.".to_string());
    }
    if platform != std::env::consts::OS || architecture != std::env::consts::ARCH {
        return Err("Update artifact does not match this device.".to_string());
    }
    #[cfg(target_os = "windows")]
    if !filename.to_ascii_lowercase().ends_with(".exe") {
        return Err("Windows update artifact must be an executable installer.".to_string());
    }
    #[cfg(target_os = "linux")]
    if !filename.to_ascii_lowercase().ends_with(".deb") {
        return Err("Linux update artifact must be a Debian package.".to_string());
    }
    Ok(())
}

async fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|error| format!("Could not open the staged update: {error}"))?;
    let mut digest = Sha256::new();
    let mut buffer = vec![0_u8; 128 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .await
            .map_err(|error| format!("Could not verify the staged update: {error}"))?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

async fn valid_staged_update(
    directory: &Path,
    expected: &PreparedUpdateMetadata,
) -> Result<Option<PreparedUpdateMetadata>, String> {
    let metadata_path = directory.join("staged.json");
    let raw = match tokio::fs::read(&metadata_path).await {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Could not read staged update metadata: {error}")),
    };
    let metadata: PreparedUpdateMetadata = match serde_json::from_slice(&raw) {
        Ok(value) => value,
        Err(_) => return Ok(None),
    };
    if metadata.version == expected.version
        && metadata.platform == expected.platform
        && metadata.architecture == expected.architecture
        && !metadata.sha256.eq_ignore_ascii_case(&expected.sha256)
    {
        return Err(
            "The immutable release version now has a different checksum. Update was blocked."
                .to_string(),
        );
    }
    if metadata != *expected || !metadata.verified || !valid_update_filename(&metadata.artifact) {
        return Ok(None);
    }
    let artifact_path = directory.join(&metadata.artifact);
    let actual = match sha256_file(&artifact_path).await {
        Ok(value) => value,
        Err(_) => return Ok(None),
    };
    if !actual.eq_ignore_ascii_case(&expected.sha256) {
        return Ok(None);
    }
    Ok(Some(metadata))
}

#[tauri::command]
fn account_session_token() -> Result<Option<String>, String> {
    let entry =
        keyring::Entry::new("digital.thaiduy.lightbi", "account-session").map_err(|error| {
            format!("Could not open the operating-system credential vault: {error}")
        })?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("Could not read the account session: {error}")),
    }
}

#[tauri::command]
fn store_account_session_token(token: Option<String>) -> Result<(), String> {
    let entry =
        keyring::Entry::new("digital.thaiduy.lightbi", "account-session").map_err(|error| {
            format!("Could not open the operating-system credential vault: {error}")
        })?;
    match token.filter(|value| !value.trim().is_empty()) {
        Some(value) => entry
            .set_password(&value)
            .map_err(|error| format!("Could not store the account session: {error}")),
        None => match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!("Could not clear the account session: {error}")),
        },
    }
}

#[tauri::command]
async fn prepare_verified_update(
    app: AppHandle,
    version: String,
    platform: String,
    architecture: String,
    url: String,
    sha256: String,
    filename: String,
) -> Result<PreparedUpdateResult, String> {
    validate_update_request(&version, &platform, &architecture, &url, &sha256, &filename)?;
    let update_root = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("Could not resolve the LightBI update cache: {error}"))?
        .join("updates");
    let directory = update_root.join(&version);
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|error| format!("Could not prepare the updater directory: {error}"))?;
    let expected = PreparedUpdateMetadata {
        version: version.clone(),
        platform,
        architecture,
        artifact: filename.clone(),
        source_url: url.clone(),
        sha256: sha256.to_ascii_lowercase(),
        verified: true,
    };
    if valid_staged_update(&directory, &expected).await?.is_some() {
        return Ok(PreparedUpdateResult {
            version,
            artifact: filename,
            sha256: expected.sha256,
            reused: true,
            ready: true,
        });
    }

    let metadata_path = directory.join("staged.json");
    if let Ok(raw) = tokio::fs::read(&metadata_path).await {
        if let Ok(previous) = serde_json::from_slice::<PreparedUpdateMetadata>(&raw) {
            if valid_update_filename(&previous.artifact) {
                let _ = tokio::fs::remove_file(directory.join(previous.artifact)).await;
            }
        }
        let _ = tokio::fs::remove_file(&metadata_path).await;
    }
    let artifact_path = directory.join(&filename);
    let partial_path = directory.join(format!("{filename}.tmp"));
    let metadata_partial = directory.join("staged.json.tmp");
    let _ = tokio::fs::remove_file(&partial_path).await;
    let _ = tokio::fs::remove_file(&metadata_partial).await;
    let _ = tokio::fs::remove_file(&artifact_path).await;

    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(30 * 60))
        .build()
        .map_err(|error| format!("Could not initialize update download: {error}"))?;
    let mut response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| format!("Update download failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Update download returned HTTP {}.",
            response.status()
        ));
    }
    if response.url().scheme() != "https" {
        return Err("Update download redirected to an insecure URL.".to_string());
    }
    let total = response.content_length();
    if total.is_some_and(|size| size > 1024 * 1024 * 1024) {
        return Err("Update artifact exceeds the 1 GiB safety limit.".to_string());
    }
    let mut file = tokio::fs::File::create(&partial_path)
        .await
        .map_err(|error| format!("Could not create the partial update: {error}"))?;
    let mut digest = Sha256::new();
    let mut downloaded = 0_u64;
    loop {
        let chunk = match response.chunk().await {
            Ok(value) => value,
            Err(error) => {
                let _ = tokio::fs::remove_file(&partial_path).await;
                return Err(format!("Update download was interrupted: {error}"));
            }
        };
        let Some(chunk) = chunk else {
            break;
        };
        if let Err(error) = file.write_all(&chunk).await {
            let _ = tokio::fs::remove_file(&partial_path).await;
            return Err(format!("Could not write the partial update: {error}"));
        }
        digest.update(&chunk);
        downloaded += chunk.len() as u64;
        if downloaded > 1024 * 1024 * 1024 {
            let _ = tokio::fs::remove_file(&partial_path).await;
            return Err("Update artifact exceeded the 1 GiB safety limit.".to_string());
        }
        let percent = total
            .filter(|value| *value > 0)
            .map(|value| ((downloaded.saturating_mul(100) / value).min(100)) as u8);
        let _ = app.emit(
            "lightbi://update-progress",
            UpdateProgress {
                phase: "downloading",
                downloaded_bytes: downloaded,
                total_bytes: total,
                percent,
            },
        );
    }
    file.flush()
        .await
        .map_err(|error| format!("Could not flush the partial update: {error}"))?;
    file.sync_all()
        .await
        .map_err(|error| format!("Could not sync the partial update: {error}"))?;
    drop(file);
    let _ = app.emit(
        "lightbi://update-progress",
        UpdateProgress {
            phase: "verifying",
            downloaded_bytes: downloaded,
            total_bytes: total,
            percent: Some(100),
        },
    );
    let actual = format!("{:x}", digest.finalize());
    if !actual.eq_ignore_ascii_case(&sha256) {
        let _ = tokio::fs::remove_file(&partial_path).await;
        return Err("Update verification failed. The partial artifact was discarded.".to_string());
    }
    tokio::fs::rename(&partial_path, &artifact_path)
        .await
        .map_err(|error| format!("Could not atomically stage the verified update: {error}"))?;
    let metadata_bytes = serde_json::to_vec_pretty(&expected)
        .map_err(|error| format!("Could not serialize staged update metadata: {error}"))?;
    tokio::fs::write(&metadata_partial, metadata_bytes)
        .await
        .map_err(|error| format!("Could not write staged update metadata: {error}"))?;
    tokio::fs::rename(&metadata_partial, &metadata_path)
        .await
        .map_err(|error| format!("Could not finalize staged update metadata: {error}"))?;
    let _ = app.emit(
        "lightbi://update-progress",
        UpdateProgress {
            phase: "ready",
            downloaded_bytes: downloaded,
            total_bytes: total,
            percent: Some(100),
        },
    );
    Ok(PreparedUpdateResult {
        version,
        artifact: filename,
        sha256: expected.sha256,
        reused: false,
        ready: true,
    })
}


#[cfg(target_os = "windows")]
fn launch_windows_installer_with_elevation(path: &Path) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let operation: Vec<u16> = OsStr::new("runas").encode_wide().chain(Some(0)).collect();
    let file: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    if result as isize <= 32 {
        return Err(format!(
            "Could not request permission to start the verified installer (ShellExecuteW code {}).",
            result as isize
        ));
    }
    Ok(())
}

#[tauri::command]
async fn apply_prepared_update(
    app: AppHandle,
    version: String,
    platform: String,
    architecture: String,
    url: String,
    sha256: String,
    filename: String,
) -> Result<(), String> {
    validate_update_request(&version, &platform, &architecture, &url, &sha256, &filename)?;
    let directory = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("Could not resolve the LightBI update cache: {error}"))?
        .join("updates")
        .join(&version);
    let expected = PreparedUpdateMetadata {
        version,
        platform,
        architecture,
        artifact: filename,
        source_url: url,
        sha256: sha256.to_ascii_lowercase(),
        verified: true,
    };
    let metadata = valid_staged_update(&directory, &expected)
        .await?
        .ok_or_else(|| {
            "The prepared update is missing, stale, partial, or modified.".to_string()
        })?;
    let path = directory.join(metadata.artifact);
    #[cfg(target_os = "windows")]
    {
        launch_windows_installer_with_elevation(&path)?;
        app.exit(0);
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let _ = app;
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|error| format!("Could not open the verified Debian package: {error}"))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = app;
        Err("Applying prepared updates is not available for this operating system.".to_string())
    }
}

fn error_response(status: u16, message: &str) -> tauri::http::Response<Vec<u8>> {
    tauri::http::Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .header("access-control-allow-origin", "*")
        .body(format!(r#"{{"error":{}}}"#, serde_json::to_string(message).unwrap()).into_bytes())
        .expect("valid LightBI error response")
}

fn main() {
    let embedded_core = EmbeddedCore(Arc::new(Mutex::new(None)));
    let protocol_core = embedded_core.clone();
    let setup_core = embedded_core.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .register_asynchronous_uri_scheme_protocol(
            "lightbi",
            move |_context, request, responder| {
                let core = protocol_core
                    .0
                    .lock()
                    .ok()
                    .and_then(|guard| guard.as_ref().cloned());
                let Some(core) = core else {
                    responder.respond(error_response(503, "LightBI core is not ready."));
                    return;
                };

                let request = request.map(Body::from);
                core.runtime.spawn(async move {
                    let response = match core.router.oneshot(request).await {
                        Ok(response) => response,
                        Err(error) => {
                            responder.respond(error_response(
                                500,
                                &format!("LightBI core request failed: {error}"),
                            ));
                            return;
                        }
                    };
                    let (parts, body) = response.into_parts();
                    let bytes = match body.collect().await {
                        Ok(collected) => collected.to_bytes().to_vec(),
                        Err(error) => {
                            responder.respond(error_response(
                                500,
                                &format!("LightBI core response failed: {error}"),
                            ));
                            return;
                        }
                    };
                    let mut builder = tauri::http::Response::builder().status(parts.status);
                    for (name, value) in &parts.headers {
                        builder = builder.header(name, value);
                    }
                    match builder.body(bytes) {
                        Ok(response) => responder.respond(response),
                        Err(error) => responder.respond(error_response(
                            500,
                            &format!("LightBI response could not be built: {error}"),
                        )),
                    }
                });
            },
        )
        .setup(move |app| {
            let data_dir = app.path().app_data_dir().map_err(|error| {
                format!("Could not resolve the LightBI data directory: {error}")
            })?;
            std::fs::create_dir_all(&data_dir)
                .map_err(|error| format!("Could not create the LightBI data directory: {error}"))?;
            std::env::set_var("LIGHTBI_DATA_DIR", data_dir);

            let runtime = Arc::new(
                tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .map_err(|error| {
                        format!("Could not initialize the embedded LightBI runtime: {error}")
                    })?,
            );
            let router = runtime.block_on(lightbi_server::build_router());
            *setup_core
                .0
                .lock()
                .map_err(|_| "Could not initialize the LightBI core state.".to_string())? =
                Some(InProcessCore { runtime, router });
            app.manage(setup_core.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_config,
            license_state,
            backend_status,
            native_http_request,
            save_export_file,
            account_session_token,
            store_account_session_token,
            prepare_verified_update,
            apply_prepared_update
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LightBI desktop shell");
}

#[cfg(test)]
mod updater_tests {
    use super::*;

    fn runtime() -> tokio::runtime::Runtime {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("test runtime")
    }

    fn expected(bytes: &[u8]) -> PreparedUpdateMetadata {
        let extension = if cfg!(target_os = "windows") {
            "exe"
        } else if cfg!(target_os = "linux") {
            "deb"
        } else {
            "package"
        };
        PreparedUpdateMetadata {
            version: "0.9.2-beta.7".to_string(),
            platform: std::env::consts::OS.to_string(),
            architecture: std::env::consts::ARCH.to_string(),
            artifact: format!("LightBI-setup.{extension}"),
            source_url: "https://drive.thaiduy.store/release/lightbi/0.9.2-beta.7/LightBI"
                .to_string(),
            sha256: format!("{:x}", Sha256::digest(bytes)),
            verified: true,
        }
    }

    #[test]
    #[ignore = "live internal acceptance only"]
    fn native_http_reaches_live_internal_release_catalog() {
        let url = std::env::var("LIGHTBI_LIVE_RELEASE_CATALOG")
            .expect("LIGHTBI_LIVE_RELEASE_CATALOG must be set for the live smoke test");
        let response = runtime()
            .block_on(native_http_request(NativeHttpRequest {
                url,
                method: "GET".to_string(),
                headers: HashMap::new(),
                body: None,
            }))
            .expect("native HTTP transport must reach the live internal release catalog");
        assert_eq!(response.status, 200);
        let body = String::from_utf8(response.body).expect("release catalog must be UTF-8 JSON");
        assert!(body.contains("lightbi.release.v1"));
    }

    #[test]
    fn rejects_unsafe_update_identity_and_filename() {
        assert!(!valid_update_version("../beta"));
        assert!(!valid_update_filename("../LightBI.exe"));
        assert!(valid_update_version("0.9.2-beta.7"));
    }

    #[test]
    fn exact_staged_artifact_survives_restart_and_partial_never_counts() {
        let folder = tempfile::tempdir().expect("temp folder");
        let bytes = b"verified LightBI update";
        let expected = expected(bytes);
        std::fs::write(
            folder.path().join(format!("{}.tmp", expected.artifact)),
            b"partial",
        )
        .expect("partial");
        assert!(runtime()
            .block_on(valid_staged_update(folder.path(), &expected))
            .expect("partial check")
            .is_none());
        std::fs::write(folder.path().join(&expected.artifact), bytes).expect("artifact");
        std::fs::write(
            folder.path().join("staged.json"),
            serde_json::to_vec(&expected).expect("metadata"),
        )
        .expect("metadata file");
        assert!(runtime()
            .block_on(valid_staged_update(folder.path(), &expected))
            .expect("staged check")
            .is_some());
    }

    #[test]
    fn tampered_or_replaced_staged_artifact_is_rejected() {
        let folder = tempfile::tempdir().expect("temp folder");
        let bytes = b"verified LightBI update";
        let expected = expected(bytes);
        std::fs::write(folder.path().join(&expected.artifact), b"tampered").expect("artifact");
        std::fs::write(
            folder.path().join("staged.json"),
            serde_json::to_vec(&expected).expect("metadata"),
        )
        .expect("metadata file");
        assert!(runtime()
            .block_on(valid_staged_update(folder.path(), &expected))
            .expect("tamper check")
            .is_none());
        let mut replaced = expected.clone();
        replaced.sha256 = "f".repeat(64);
        let error = runtime()
            .block_on(valid_staged_update(folder.path(), &replaced))
            .expect_err("replaced immutable version must fail");
        assert!(error.contains("different checksum"));
    }

    #[test]
    fn malformed_or_stale_metadata_is_invalidated_without_becoming_ready() {
        let folder = tempfile::tempdir().expect("temp folder");
        let bytes = b"verified LightBI update";
        let expected = expected(bytes);
        std::fs::write(folder.path().join(&expected.artifact), bytes).expect("artifact");
        std::fs::write(folder.path().join("staged.json"), b"{partial").expect("metadata");
        assert!(runtime()
            .block_on(valid_staged_update(folder.path(), &expected))
            .expect("malformed metadata check")
            .is_none());

        let mut stale = expected.clone();
        stale.version = "0.9.1-beta.7".to_string();
        std::fs::write(
            folder.path().join("staged.json"),
            serde_json::to_vec(&stale).expect("stale metadata"),
        )
        .expect("metadata file");
        assert!(runtime()
            .block_on(valid_staged_update(folder.path(), &expected))
            .expect("stale metadata check")
            .is_none());
    }
}
