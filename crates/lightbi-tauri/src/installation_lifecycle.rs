use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use std::{path::PathBuf, time::Duration};

const UNINSTALL_TRACK_ARG: &str = "--lightbi-uninstall-track";
const ROUTING_JSON: &str = include_str!("../../../apps/desktop/src/lib/lightbi-routing.json");
#[cfg(target_os = "windows")]
const RECEIPT_DIR: &str = "digital.thaiduy.lightbi";
#[cfg(target_os = "windows")]
const RECEIPT_FILE: &str = "installation-lifecycle.json";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InstallationLifecycleReceipt {
    pub installation_id: String,
    pub endpoint: String,
    pub app_version: String,
    pub platform: String,
    pub environment: String,
}

pub(crate) fn valid_installation_id(value: &str) -> bool {
    (20..=80).contains(&value.len())
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
}

fn routing_public_origin(environment: &str) -> Result<String, String> {
    let routing: serde_json::Value = serde_json::from_str(ROUTING_JSON)
        .map_err(|_| "Invalid LightBI routing manifest.".to_string())?;
    let value = routing
        .get(environment)
        .and_then(|profile| profile.get("publicOrigin"))
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "LightBI routing publicOrigin is missing.".to_string())?;
    let url = reqwest::Url::parse(value).map_err(|_| "Invalid LightBI routing origin.".to_string())?;
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.path() != "/" {
        return Err("Invalid LightBI routing origin.".to_string());
    }
    Ok(url.origin().ascii_serialization())
}

fn normalized_distribution_api_base(value: &str) -> Result<String, String> {
    let url = reqwest::Url::parse(value).map_err(|_| "Invalid LightBI lifecycle endpoint.".to_string())?;
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() {
        return Err("Invalid LightBI lifecycle endpoint.".to_string());
    }
    let origin = url.origin().ascii_serialization();
    let approved = [routing_public_origin("production")?, routing_public_origin("next")?];
    if !approved.iter().any(|candidate| candidate == &origin) {
        return Err("Installation lifecycle endpoint is not an approved LightBI endpoint.".to_string());
    }
    if !matches!(url.path().trim_end_matches('/'), "" | "/distribution" | "/distribution-api") {
        return Err("Installation lifecycle endpoint path is not approved.".to_string());
    }
    Ok(format!("{origin}/distribution-api"))
}

fn allowed_endpoint(value: &str) -> bool {
    normalized_distribution_api_base(value).is_ok()
}
#[cfg(target_os = "windows")]
fn receipt_path() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let root = std::env::var_os("LOCALAPPDATA")
            .ok_or_else(|| "Windows local app data is unavailable.".to_string())?;
        return Ok(PathBuf::from(root).join(RECEIPT_DIR).join(RECEIPT_FILE));
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Installation lifecycle receipt is Windows-only.".to_string())
    }
}

fn validate_receipt(receipt: &InstallationLifecycleReceipt) -> Result<(), String> {
    if !valid_installation_id(&receipt.installation_id) {
        return Err("Invalid installation lifecycle identity.".to_string());
    }
    if !allowed_endpoint(&receipt.endpoint) {
        return Err(
            "Installation lifecycle endpoint is not an approved LightBI endpoint.".to_string(),
        );
    }
    if receipt.app_version.len() > 80
        || receipt.platform.len() > 80
        || receipt.environment.len() > 32
    {
        return Err("Installation lifecycle metadata is invalid.".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn store_installation_lifecycle_receipt(
    receipt: InstallationLifecycleReceipt,
) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        validate_receipt(&receipt)?;
        let path = receipt_path()?;
        let parent = path
            .parent()
            .ok_or_else(|| "Installation lifecycle receipt path is invalid.".to_string())?;
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|error| format!("Could not create lifecycle storage: {error}"))?;
        let temp = path.with_extension("json.tmp");
        let bytes = serde_json::to_vec(&receipt)
            .map_err(|error| format!("Could not encode lifecycle receipt: {error}"))?;
        tokio::fs::write(&temp, bytes)
            .await
            .map_err(|error| format!("Could not write lifecycle receipt: {error}"))?;
        tokio::fs::rename(&temp, &path)
            .await
            .map_err(|error| format!("Could not finalize lifecycle receipt: {error}"))?;
        return Ok(true);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = receipt;
        Ok(false)
    }
}

#[tauri::command]
pub async fn clear_installation_lifecycle_receipt() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let path = receipt_path()?;
        match tokio::fs::remove_file(path).await {
            Ok(()) => Ok(true),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(format!("Could not clear lifecycle receipt: {error}")),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[cfg(target_os = "windows")]
async fn report_uninstall(receipt: &InstallationLifecycleReceipt) -> Result<(), String> {
    validate_receipt(receipt)?;
    let endpoint = format!(
        "{}/api/installation/uninstall",
        normalized_distribution_api_base(&receipt.endpoint)?
    );
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .user_agent("LightBI-Uninstaller/1")
        .build()
        .map_err(|error| format!("Could not initialize uninstall lifecycle client: {error}"))?;
    let response = client
        .post(endpoint)
        .json(&serde_json::json!({
            "installationId": receipt.installation_id,
            "appVersion": receipt.app_version,
            "platform": receipt.platform,
            "environment": receipt.environment,
        }))
        .send()
        .await
        .map_err(|error| format!("Could not report uninstall lifecycle: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Uninstall lifecycle endpoint returned HTTP {}.",
            response.status().as_u16()
        ));
    }
    Ok(())
}

pub fn handle_uninstall_tracking_arg() -> bool {
    if !std::env::args().any(|value| value == UNINSTALL_TRACK_ARG) {
        return false;
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(path) = receipt_path() {
            if let Ok(bytes) = std::fs::read(&path) {
                if let Ok(receipt) = serde_json::from_slice::<InstallationLifecycleReceipt>(&bytes)
                {
                    if let Ok(runtime) = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                    {
                        let _ = runtime.block_on(report_uninstall(&receipt));
                    }
                }
            }
            let _ = std::fs::remove_file(path);
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn receipt(endpoint: &str) -> InstallationLifecycleReceipt {
        InstallationLifecycleReceipt {
            installation_id: "lifecycle-installation-1234567890".to_string(),
            endpoint: endpoint.to_string(),
            app_version: "0.9.2-next.test".to_string(),
            platform: "Win32".to_string(),
            environment: "internal".to_string(),
        }
    }

    #[test]
    fn accepts_only_routing_manifest_https_lifecycle_endpoints() {
        let production = routing_public_origin("production").unwrap();
        let next = routing_public_origin("next").unwrap();
        assert!(validate_receipt(&receipt(&format!("{production}/distribution-api"))).is_ok());
        assert!(validate_receipt(&receipt(&format!("{production}/distribution"))).is_ok());
        assert!(validate_receipt(&receipt(&next)).is_ok());
        assert_eq!(normalized_distribution_api_base(&next).unwrap(), format!("{next}/distribution-api"));
        assert_eq!(normalized_distribution_api_base(&format!("{production}/distribution")).unwrap(), format!("{production}/distribution-api"));
        assert!(validate_receipt(&receipt("http://example.com/distribution-api")).is_err());
        assert!(validate_receipt(&receipt(&format!("{next}/docs"))).is_err());
        assert!(validate_receipt(&receipt("https://example.com/distribution-api")).is_err());
    }

    #[test]
    fn installation_identity_remains_a_bounded_random_identifier() {
        assert!(valid_installation_id(
            "9cf044a8-7605-42da-b2b2-f7a70513e14a"
        ));
        assert!(valid_installation_id(
            "lbi-0123456789abcdef0123456789abcdef"
        ));
        assert!(!valid_installation_id("../installation"));
    }
}
