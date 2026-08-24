#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{body::Body, Router};
use http_body_util::BodyExt;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use tower::ServiceExt;
use sha2::{Digest, Sha256};

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

#[tauri::command]
fn account_session_token() -> Result<Option<String>, String> {
    let entry = keyring::Entry::new("digital.thaiduy.lightbi", "account-session")
        .map_err(|error| format!("Could not open the operating-system credential vault: {error}"))?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("Could not read the account session: {error}")),
    }
}

#[tauri::command]
fn store_account_session_token(token: Option<String>) -> Result<(), String> {
    let entry = keyring::Entry::new("digital.thaiduy.lightbi", "account-session")
        .map_err(|error| format!("Could not open the operating-system credential vault: {error}"))?;
    match token.filter(|value| !value.trim().is_empty()) {
        Some(value) => entry.set_password(&value).map_err(|error| format!("Could not store the account session: {error}")),
        None => match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!("Could not clear the account session: {error}")),
        },
    }
}

#[tauri::command]
async fn install_verified_update(app: AppHandle, url: String, sha256: String) -> Result<(), String> {
    if !url.starts_with("https://") || sha256.len() != 64 || !sha256.chars().all(|value| value.is_ascii_hexdigit()) {
        return Err("Update metadata is invalid.".to_string());
    }
    let response = reqwest::get(&url).await.map_err(|error| format!("Update download failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("Update download returned HTTP {}.", response.status()));
    }
    let bytes = response.bytes().await.map_err(|error| format!("Update download failed: {error}"))?;
    let actual = format!("{:x}", Sha256::digest(&bytes));
    if !actual.eq_ignore_ascii_case(&sha256) {
        return Err("Update verification failed. The downloaded installer was discarded.".to_string());
    }
    let directory = std::env::temp_dir().join("lightbi-updates");
    std::fs::create_dir_all(&directory).map_err(|error| format!("Could not prepare the updater directory: {error}"))?;
    #[cfg(target_os = "windows")]
    let extension = "exe";
    #[cfg(target_os = "linux")]
    let extension = "deb";
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    let extension = "package";
    let path = directory.join(format!("LightBI-update-{}.{}", &actual[..12], extension));
    let partial = path.with_extension(format!("{extension}.partial"));
    std::fs::write(&partial, &bytes).map_err(|error| format!("Could not write the update: {error}"))?;
    std::fs::rename(&partial, &path).map_err(|error| format!("Could not finalize the verified update: {error}"))?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&path).spawn().map_err(|error| format!("Could not start the verified installer: {error}"))?;
        app.exit(0);
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let _ = app;
        std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|error| format!("Could not open the verified Debian package: {error}"))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = app;
        let _ = std::fs::remove_file(path);
        Err("Automatic installation is not available for this operating system.".to_string())
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
        .register_asynchronous_uri_scheme_protocol("lightbi", move |_context, request, responder| {
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
                        responder.respond(error_response(500, &format!("LightBI core request failed: {error}")));
                        return;
                    }
                };
                let (parts, body) = response.into_parts();
                let bytes = match body.collect().await {
                    Ok(collected) => collected.to_bytes().to_vec(),
                    Err(error) => {
                        responder.respond(error_response(500, &format!("LightBI core response failed: {error}")));
                        return;
                    }
                };
                let mut builder = tauri::http::Response::builder().status(parts.status);
                for (name, value) in &parts.headers {
                    builder = builder.header(name, value);
                }
                match builder.body(bytes) {
                    Ok(response) => responder.respond(response),
                    Err(error) => responder.respond(error_response(500, &format!("LightBI response could not be built: {error}"))),
                }
            });
        })
        .setup(move |app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| format!("Could not resolve the LightBI data directory: {error}"))?;
            std::fs::create_dir_all(&data_dir)
                .map_err(|error| format!("Could not create the LightBI data directory: {error}"))?;
            std::env::set_var("LIGHTBI_DATA_DIR", data_dir);

            let runtime = Arc::new(
                tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .map_err(|error| format!("Could not initialize the embedded LightBI runtime: {error}"))?,
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
            account_session_token,
            store_account_session_token,
            install_verified_update
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LightBI desktop shell");
}
