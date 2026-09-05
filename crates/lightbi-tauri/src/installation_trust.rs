use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ring::{
    rand::SystemRandom,
    signature::{Ed25519KeyPair, KeyPair},
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs::File, io::Read, path::Path, time::Duration};
use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE, WAIT_ABANDONED, WAIT_OBJECT_0},
    Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
    System::Threading::{CreateMutexW, ReleaseMutex, WaitForSingleObject},
};

const PROTOCOL: &str = "lightbi.next-installation-trust.v1";
const DEVICE_KEY_SERVICE: &str = "digital.thaiduy.lightbi";
const DEVICE_KEY_ACCOUNT: &str = "installation-trust-ed25519-v1";
const ROUTING_JSON: &str = include_str!("../../../apps/desktop/src/lib/lightbi-routing.json");
const CERTIFICATE_FILE: &str = "installation-certificate.json";
#[cfg(target_os = "windows")]
const DEVICE_KEY_MUTEX_NAME: &str = "Local\\LightBIInstallationTrustDeviceKeyV1";

#[derive(Debug, Deserialize)]
struct EdgeResponse<T> {
    ok: bool,
    data: T,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
struct ChallengePayload {
    protocol: String,
    challenge_id: String,
    installation_id: String,
    device_public_key: String,
    release_id: String,
    runtime_sha256: String,
    runtime_size: u64,
    platform: String,
    architecture: String,
    nonce: String,
    expires_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChallengeData {
    environment: String,
    challenge: ChallengePayload,
    production_authority: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IssueData {
    environment: String,
    certificate: serde_json::Value,
    certificate_id: String,
    installation_id: String,
    release_id: String,
    expires_at: String,
    production_authority: bool,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallationTrustResult {
    status: &'static str,
    installation_id: String,
    release_id: String,
    certificate_id: String,
    expires_at: String,
    runtime_sha256: String,
    runtime_size: u64,
    production_authority: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CertificateCache<'a> {
    schema: &'static str,
    environment: &'static str,
    installation_id: &'a str,
    release_id: &'a str,
    runtime_sha256: &'a str,
    runtime_size: u64,
    certificate_id: &'a str,
    expires_at: &'a str,
    certificate: &'a serde_json::Value,
    production_authority: bool,
}

pub(crate) fn internal_build() -> bool {
    matches!(option_env!("LIGHTBI_RUNTIME_CHANNEL"), Some("internal"))
}
pub(crate) fn next_distribution_api_base() -> Result<String, String> {
    let routing: serde_json::Value = serde_json::from_str(ROUTING_JSON)
        .map_err(|_| "Invalid LightBI routing manifest.".to_string())?;
    let value = routing
        .get("next")
        .and_then(|profile| profile.get("publicOrigin"))
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "NEXT routing publicOrigin is missing.".to_string())?;
    let url = reqwest::Url::parse(value).map_err(|_| "Invalid NEXT routing origin.".to_string())?;
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
    {
        return Err("Invalid NEXT routing origin.".to_string());
    }
    Ok(format!(
        "{}/distribution-api",
        url.origin().ascii_serialization()
    ))
}

fn release_id(version: &str, architecture: &str) -> Result<String, String> {
    if version.is_empty()
        || architecture.is_empty()
        || !version
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || ".-_".contains(c))
        || !architecture
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "_-".contains(c))
    {
        return Err("Invalid installation trust release identity.".to_string());
    }
    Ok(format!("release:{version}:windows:{architecture}:runtime"))
}
fn hash_file(path: &Path) -> Result<(String, u64), String> {
    let mut file =
        File::open(path).map_err(|error| format!("Could not open LightBI runtime: {error}"))?;
    let size = file
        .metadata()
        .map_err(|error| format!("Could not inspect LightBI runtime: {error}"))?
        .len();
    if size == 0 {
        return Err("LightBI runtime is empty.".to_string());
    }
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 128 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("Could not hash LightBI runtime: {error}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok((format!("{:x}", hasher.finalize()), size))
}

#[cfg(target_os = "windows")]
struct DeviceKeyLock(HANDLE);

#[cfg(target_os = "windows")]
impl Drop for DeviceKeyLock {
    fn drop(&mut self) {
        unsafe {
            let _ = ReleaseMutex(self.0);
            let _ = CloseHandle(self.0);
        }
    }
}

#[cfg(target_os = "windows")]
fn acquire_device_key_lock() -> Result<DeviceKeyLock, String> {
    let name: Vec<u16> = DEVICE_KEY_MUTEX_NAME
        .encode_utf16()
        .chain(Some(0))
        .collect();
    let handle = unsafe { CreateMutexW(std::ptr::null(), 0, name.as_ptr()) };
    if handle.is_null() {
        return Err("Could not create installation device-key lock.".to_string());
    }
    let wait = unsafe { WaitForSingleObject(handle, 10_000) };
    if wait != WAIT_OBJECT_0 && wait != WAIT_ABANDONED {
        unsafe {
            let _ = CloseHandle(handle);
        }
        return Err("Timed out waiting for installation device-key lock.".to_string());
    }
    Ok(DeviceKeyLock(handle))
}

#[cfg(not(target_os = "windows"))]
struct DeviceKeyLock;

#[cfg(not(target_os = "windows"))]
fn acquire_device_key_lock() -> Result<DeviceKeyLock, String> {
    Ok(DeviceKeyLock)
}

fn device_public_key(key_pair: &Ed25519KeyPair) -> String {
    URL_SAFE_NO_PAD.encode(key_pair.public_key().as_ref())
}

fn validate_certificate_binding(
    certificate: &serde_json::Value,
    certificate_id: &str,
    installation_id: &str,
    release_id: &str,
    expected_device_public_key: &str,
    architecture: &str,
) -> Result<(), String> {
    let payload = certificate
        .get("payload")
        .and_then(serde_json::Value::as_object)
        .ok_or_else(|| "Installation certificate payload is missing.".to_string())?;
    let matches = payload
        .get("certificate_id")
        .and_then(serde_json::Value::as_str)
        == Some(certificate_id)
        && payload
            .get("installation_id")
            .and_then(serde_json::Value::as_str)
            == Some(installation_id)
        && payload
            .get("release_id")
            .and_then(serde_json::Value::as_str)
            == Some(release_id)
        && payload
            .get("device_key_algorithm")
            .and_then(serde_json::Value::as_str)
            == Some("Ed25519")
        && payload
            .get("device_public_key")
            .and_then(serde_json::Value::as_str)
            == Some(expected_device_public_key)
        && payload.get("platform").and_then(serde_json::Value::as_str) == Some("windows")
        && payload
            .get("architecture")
            .and_then(serde_json::Value::as_str)
            == Some(architecture);
    if !matches {
        return Err("Installation certificate device-key binding mismatch.".to_string());
    }
    Ok(())
}

fn load_or_create_device_key() -> Result<Ed25519KeyPair, String> {
    let _lock = acquire_device_key_lock()?;
    let entry = keyring::Entry::new(DEVICE_KEY_SERVICE, DEVICE_KEY_ACCOUNT)
        .map_err(|error| format!("Could not open installation trust credential vault: {error}"))?;
    let pkcs8 = match entry.get_password() {
        Ok(encoded) => URL_SAFE_NO_PAD
            .decode(encoded)
            .map_err(|_| "Stored installation device key is invalid.".to_string())?,
        Err(keyring::Error::NoEntry) => {
            let document = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new())
                .map_err(|_| "Could not generate installation device key.".to_string())?;
            let bytes = document.as_ref().to_vec();
            entry
                .set_password(&URL_SAFE_NO_PAD.encode(&bytes))
                .map_err(|error| format!("Could not store installation device key: {error}"))?;
            bytes
        }
        Err(error) => return Err(format!("Could not read installation device key: {error}")),
    };
    Ed25519KeyPair::from_pkcs8(&pkcs8)
        .map_err(|_| "Stored installation device key could not be opened.".to_string())
}
pub(crate) struct SignedTransportIdentity {
    pub certificate: serde_json::Value,
    pub certificate_id: String,
    pub key_pair: Ed25519KeyPair,
}

pub(crate) async fn load_signed_transport_identity(
    app: &AppHandle,
) -> Result<SignedTransportIdentity, String> {
    if !internal_build() {
        return Err("Signed transport is unavailable outside Internal builds.".to_string());
    }
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve LightBI trust storage: {error}"))?
        .join("trust")
        .join(CERTIFICATE_FILE);
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|_| "Installation certificate is not available yet.".to_string())?;
    let cache: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|_| "Stored installation certificate is invalid.".to_string())?;
    if cache.get("schema").and_then(serde_json::Value::as_str)
        != Some("lightbi.next-installation-certificate-cache.v1")
        || cache.get("environment").and_then(serde_json::Value::as_str)
            != Some("next_internal_test_only")
        || cache
            .get("productionAuthority")
            .and_then(serde_json::Value::as_bool)
            != Some(false)
    {
        return Err("Stored installation certificate authority is invalid.".to_string());
    }
    let certificate_id = cache
        .get("certificateId")
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Stored installation certificate identity is invalid.".to_string())?
        .to_string();
    let installation_id = cache
        .get("installationId")
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Stored installation identity is invalid.".to_string())?;
    let release_id = cache
        .get("releaseId")
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Stored installation release identity is invalid.".to_string())?;
    let certificate = cache
        .get("certificate")
        .filter(|value| value.is_object())
        .cloned()
        .ok_or_else(|| "Stored installation certificate envelope is invalid.".to_string())?;
    let key_pair = load_or_create_device_key()?;
    let public_key = device_public_key(&key_pair);
    validate_certificate_binding(
        &certificate,
        &certificate_id,
        installation_id,
        release_id,
        &public_key,
        std::env::consts::ARCH,
    )?;
    Ok(SignedTransportIdentity {
        certificate,
        certificate_id,
        key_pair,
    })
}

fn challenge_transcript(payload: &ChallengePayload) -> String {
    [
        PROTOCOL.to_string(),
        format!("challenge_id={}", payload.challenge_id),
        format!("installation_id={}", payload.installation_id),
        format!("device_public_key={}", payload.device_public_key),
        format!("release_id={}", payload.release_id),
        format!("runtime_sha256={}", payload.runtime_sha256),
        format!("runtime_size={}", payload.runtime_size),
        format!("platform={}", payload.platform),
        format!("architecture={}", payload.architecture),
        format!("nonce={}", payload.nonce),
        format!("expires_at={}", payload.expires_at),
    ]
    .join("\n")
}

async fn post<T: Serialize, R: DeserializeOwned>(
    client: &reqwest::Client,
    url: String,
    payload: &T,
    expected_status: reqwest::StatusCode,
) -> Result<R, String> {
    let response = client
        .post(url)
        .json(payload)
        .send()
        .await
        .map_err(|error| format!("Installation trust request failed: {error}"))?;
    let status = response.status();
    let body = response
        .bytes()
        .await
        .map_err(|error| format!("Installation trust response failed: {error}"))?;
    if status != expected_status {
        let error = serde_json::from_slice::<serde_json::Value>(&body)
            .ok()
            .and_then(|value| {
                value
                    .get("error")
                    .and_then(serde_json::Value::as_str)
                    .map(str::to_string)
            })
            .unwrap_or_else(|| format!("http_{}", status.as_u16()));
        return Err(format!("Installation trust was rejected: {error}"));
    }
    serde_json::from_slice::<R>(&body)
        .map_err(|_| "Installation trust returned invalid JSON.".to_string())
}
#[cfg(target_os = "windows")]
async fn replace_certificate_file(temp: &Path, path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;

    let temp_w: Vec<u16> = temp.as_os_str().encode_wide().chain(Some(0)).collect();
    let path_w: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let moved = unsafe {
        MoveFileExW(
            temp_w.as_ptr(),
            path_w.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if moved == 0 {
        return Err(format!(
            "Could not atomically replace installation certificate: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
async fn replace_certificate_file(temp: &Path, path: &Path) -> Result<(), String> {
    tokio::fs::rename(temp, path)
        .await
        .map_err(|error| format!("Could not atomically replace installation certificate: {error}"))
}

async fn persist_certificate(app: &AppHandle, cache: &CertificateCache<'_>) -> Result<(), String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve LightBI trust storage: {error}"))?
        .join("trust");
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|error| format!("Could not create LightBI trust storage: {error}"))?;
    let path = directory.join(CERTIFICATE_FILE);
    let temp = directory.join(format!("{CERTIFICATE_FILE}.{}.tmp", std::process::id()));
    let bytes = serde_json::to_vec_pretty(cache)
        .map_err(|error| format!("Could not encode installation certificate: {error}"))?;
    tokio::fs::write(&temp, bytes)
        .await
        .map_err(|error| format!("Could not write installation certificate: {error}"))?;
    if let Err(error) = replace_certificate_file(&temp, &path).await {
        let _ = tokio::fs::remove_file(&temp).await;
        return Err(error);
    }
    Ok(())
}

fn validate_challenge(
    challenge: &ChallengeData,
    installation_id: &str,
    device_public_key: &str,
    release_id: &str,
    runtime_sha256: &str,
    runtime_size: u64,
    architecture: &str,
) -> Result<(), String> {
    let payload = &challenge.challenge;
    if !challenge.ok_environment()
        || payload.protocol != PROTOCOL
        || payload.installation_id != installation_id
        || payload.device_public_key != device_public_key
        || payload.release_id != release_id
        || payload.runtime_sha256 != runtime_sha256
        || payload.runtime_size != runtime_size
        || payload.platform != "windows"
        || payload.architecture != architecture
        || payload.nonce.is_empty()
        || payload.expires_at.is_empty()
    {
        return Err("Installation trust challenge identity mismatch.".to_string());
    }
    Ok(())
}

impl ChallengeData {
    fn ok_environment(&self) -> bool {
        self.environment == "next_internal_test_only" && !self.production_authority
    }
}

#[tauri::command]
pub async fn ensure_installation_trust(
    app: AppHandle,
    installation_id: String,
) -> Result<InstallationTrustResult, String> {
    if !internal_build() {
        return Err("NEXT installation trust is unavailable outside Internal builds.".to_string());
    }
    if std::env::consts::OS != "windows" {
        return Err("NEXT installation trust is currently Windows-only.".to_string());
    }
    if !super::installation_lifecycle::valid_installation_id(&installation_id) {
        return Err("Invalid LightBI installation identity.".to_string());
    }
    let runtime_path = std::env::current_exe()
        .map_err(|error| format!("Could not resolve LightBI runtime path: {error}"))?;
    let runtime_name = runtime_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if !runtime_name.eq_ignore_ascii_case("LightBI.exe") {
        return Err(format!(
            "Unexpected LightBI runtime filename: {runtime_name}"
        ));
    }
    let hash_path = runtime_path.clone();
    let (runtime_sha256, runtime_size) = tokio::task::spawn_blocking(move || hash_file(&hash_path))
        .await
        .map_err(|error| format!("Could not inspect LightBI runtime: {error}"))??;
    let version = app.package_info().version.to_string();
    let architecture = std::env::consts::ARCH.to_string();
    let release_id = release_id(&version, &architecture)?;
    let key_pair = load_or_create_device_key()?;
    let device_public_key = device_public_key(&key_pair);
    let base = next_distribution_api_base()?;
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(4))
        .timeout(Duration::from_secs(7))
        .user_agent(format!("LightBI-NEXT-InstallationTrust/{version}"))
        .build()
        .map_err(|error| format!("Could not initialize installation trust client: {error}"))?;

    let challenge_response: EdgeResponse<ChallengeData> = post(
        &client,
        format!("{base}/api/installation/trust/challenge"),
        &serde_json::json!({
            "installationId": installation_id,
            "devicePublicKey": device_public_key,
            "releaseId": release_id,
            "runtimeSha256": runtime_sha256,
            "runtimeSize": runtime_size,
            "platform": "windows",
            "architecture": architecture,
        }),
        reqwest::StatusCode::CREATED,
    )
    .await?;
    if !challenge_response.ok {
        return Err("Installation trust challenge was not acknowledged.".to_string());
    }
    validate_challenge(
        &challenge_response.data,
        &installation_id,
        &device_public_key,
        &release_id,
        &runtime_sha256,
        runtime_size,
        &architecture,
    )?;
    let transcript = challenge_transcript(&challenge_response.data.challenge);
    let signature = URL_SAFE_NO_PAD.encode(key_pair.sign(transcript.as_bytes()).as_ref());

    let issue_response: EdgeResponse<IssueData> = post(
        &client,
        format!("{base}/api/installation/trust/issue"),
        &serde_json::json!({
            "challengeId": challenge_response.data.challenge.challenge_id,
            "signature": signature,
        }),
        reqwest::StatusCode::CREATED,
    )
    .await?;
    let issued = issue_response.data;
    if !issue_response.ok
        || issued.environment != "next_internal_test_only"
        || issued.production_authority
        || issued.installation_id != installation_id
        || issued.release_id != release_id
        || issued.certificate_id.is_empty()
        || issued.expires_at.is_empty()
    {
        return Err("Installation certificate identity mismatch.".to_string());
    }
    validate_certificate_binding(
        &issued.certificate,
        &issued.certificate_id,
        &installation_id,
        &release_id,
        &device_public_key,
        &architecture,
    )?;
    persist_certificate(
        &app,
        &CertificateCache {
            schema: "lightbi.next-installation-certificate-cache.v1",
            environment: "next_internal_test_only",
            installation_id: &installation_id,
            release_id: &release_id,
            runtime_sha256: &runtime_sha256,
            runtime_size,
            certificate_id: &issued.certificate_id,
            expires_at: &issued.expires_at,
            certificate: &issued.certificate,
            production_authority: false,
        },
    )
    .await?;

    Ok(InstallationTrustResult {
        status: "issued",
        installation_id,
        release_id,
        certificate_id: issued.certificate_id,
        expires_at: issued.expires_at,
        runtime_sha256,
        runtime_size,
        production_authority: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ring::signature::{UnparsedPublicKey, ED25519};

    #[tokio::test]
    async fn certificate_cache_replace_overwrites_existing_file() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("installation-certificate.json");
        let temp = directory.path().join("installation-certificate.json.tmp");
        tokio::fs::write(&path, b"old-certificate").await.unwrap();
        tokio::fs::write(&temp, b"new-certificate").await.unwrap();
        replace_certificate_file(&temp, &path).await.unwrap();
        assert_eq!(tokio::fs::read(&path).await.unwrap(), b"new-certificate");
        assert!(!temp.exists());
    }

    #[test]
    fn certificate_binding_rejects_device_key_drift() {
        let certificate = serde_json::json!({
            "payload": {
                "certificate_id": "next-cert-test-001",
                "installation_id": "lbi-test-001",
                "device_key_algorithm": "Ed25519",
                "device_public_key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "release_id": "release:0.9.2-beta.7-next.33.2:windows:x86_64:runtime",
                "platform": "windows",
                "architecture": "x86_64"
            }
        });
        assert!(validate_certificate_binding(
            &certificate,
            "next-cert-test-001",
            "lbi-test-001",
            "release:0.9.2-beta.7-next.33.2:windows:x86_64:runtime",
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "x86_64",
        )
        .is_ok());
        assert!(validate_certificate_binding(
            &certificate,
            "next-cert-test-001",
            "lbi-test-001",
            "release:0.9.2-beta.7-next.33.2:windows:x86_64:runtime",
            "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
            "x86_64",
        )
        .is_err());
    }

    #[test]
    fn runtime_release_id_is_separate_from_installer_release() {
        assert_eq!(
            release_id("1.0.0-rc.6", "x86_64").unwrap(),
            "release:1.0.0-rc.6:windows:x86_64:runtime"
        );
        assert!(release_id("../fork", "x86_64").is_err());
    }
    #[test]
    fn challenge_transcript_matches_the_server_contract_and_device_signature() {
        let document = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        let key = Ed25519KeyPair::from_pkcs8(document.as_ref()).unwrap();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let payload = ChallengePayload {
            protocol: PROTOCOL.to_string(),
            challenge_id: "next-install-challenge-test".to_string(),
            installation_id: "lbi-0123456789abcdef0123456789abcdef".to_string(),
            device_public_key: public.clone(),
            release_id: "release:1.0.0-rc.6:windows:x86_64:runtime".to_string(),
            runtime_sha256: "a".repeat(64),
            runtime_size: 123456,
            platform: "windows".to_string(),
            architecture: "x86_64".to_string(),
            nonce: "nonce-test".to_string(),
            expires_at: "2026-09-03T10:00:00Z".to_string(),
        };
        let transcript = challenge_transcript(&payload);
        assert!(transcript.starts_with("lightbi.next-installation-trust.v1\nchallenge_id="));
        assert!(transcript.contains("\nruntime_sha256="));
        let signature = key.sign(transcript.as_bytes());
        UnparsedPublicKey::new(&ED25519, URL_SAFE_NO_PAD.decode(public).unwrap())
            .verify(transcript.as_bytes(), signature.as_ref())
            .unwrap();
    }

    #[test]
    fn next_trust_endpoint_is_derived_from_the_routing_authority() {
        let endpoint = next_distribution_api_base().unwrap();
        assert!(endpoint.starts_with("https://"));
        assert!(endpoint.ends_with("/distribution-api"));
        assert!(endpoint.contains("lightbi-next"));
    }
}
