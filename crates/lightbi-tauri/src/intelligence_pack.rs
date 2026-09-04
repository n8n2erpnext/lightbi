use lightbi_intelligence_pack::{
    CompatibilityContext, PackPointerV1, PackStore, ReconciledPack, TrustedKey,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};

const INTELLIGENCE_PACK_KEY_ID: &str = "int-next-2026-01";
const INTELLIGENCE_PACK_PUBLIC_KEY: &str = "iLYkSMLbuoW81sAFy-dhIBl--a-PFOkQdlEyTr_Z0fQ";
const BRAIN_INDEX_SCHEMA: &str = "lightbi.micro-brain.index.v1";
const REGISTRY_SCHEMA: &str = "lightbi.semantic-registry.v1";
const FEATURE_CONTRACTS: &[&str] = &[
    "evidence_bound_analysis_authority_v1",
    "micro_brain_index_v1",
];
const MAX_ENVELOPE_BYTES: usize = 96 * 1024 * 1024;

fn context() -> CompatibilityContext<'static> {
    CompatibilityContext {
        core_version: env!("CARGO_PKG_VERSION"),
        brain_index_schema_version: BRAIN_INDEX_SCHEMA,
        registry_schema_version: REGISTRY_SCHEMA,
        feature_contracts: FEATURE_CONTRACTS,
    }
}

fn trusted_keys() -> [TrustedKey<'static>; 1] {
    [TrustedKey {
        key_id: INTELLIGENCE_PACK_KEY_ID,
        public_key_base64_url: INTELLIGENCE_PACK_PUBLIC_KEY,
    }]
}

fn pack_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve LightBI application data: {error}"))?
        .join("intelligence-packs")
        .join("v1"))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligencePackRuntimeV1 {
    source: &'static str,
    pack_version: Option<String>,
    payload_sha256: Option<String>,
    signing_key_id: Option<String>,
    payload_json: Option<String>,
    repaired: bool,
    limitation: Option<String>,
    previous_pack_version: Option<String>,
    trust_authority: &'static str,
}

impl IntelligencePackRuntimeV1 {
    fn from_reconciled(
        reconciled: ReconciledPack,
        previous_pack_version: Option<String>,
    ) -> Result<Self, String> {
        let payload_json = reconciled
            .payload
            .map(|payload| {
                String::from_utf8(payload).map_err(|_| "pack_payload_utf8_invalid".to_string())
            })
            .transpose()?;
        Ok(Self {
            source: reconciled.source,
            pack_version: reconciled.pack_version,
            payload_sha256: reconciled.payload_sha256,
            signing_key_id: reconciled.signing_key_id,
            payload_json,
            repaired: reconciled.repaired,
            limitation: reconciled.limitation,
            previous_pack_version,
            trust_authority: "NEXT / INTERNAL / INT TEST AUTHORITY / NON-PROMOTABLE",
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedIntelligencePackV1 {
    pack_version: String,
    object_sha256: String,
    payload_sha256: String,
    signing_key_id: String,
    payload_json: String,
    ready: bool,
}

fn prepared(
    pointer: PackPointerV1,
    payload: Vec<u8>,
) -> Result<PreparedIntelligencePackV1, String> {
    Ok(PreparedIntelligencePackV1 {
        pack_version: pointer.pack_version,
        object_sha256: pointer.object_sha256,
        payload_sha256: pointer.payload_sha256,
        signing_key_id: pointer.signing_key_id,
        payload_json: String::from_utf8(payload)
            .map_err(|_| "pack_payload_utf8_invalid".to_string())?,
        ready: true,
    })
}

async fn download_envelope(url: &str, expected_sha256: &str) -> Result<Vec<u8>, String> {
    if expected_sha256.len() != 64 || !expected_sha256.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err("Intelligence Pack artifact SHA-256 is invalid.".to_string());
    }
    let parsed =
        reqwest::Url::parse(url).map_err(|_| "Intelligence Pack URL is invalid.".to_string())?;
    if parsed.scheme() != "https" {
        return Err("Intelligence Pack downloads require HTTPS.".to_string());
    }
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(10 * 60))
        .build()
        .map_err(|error| format!("Could not initialize Intelligence Pack download: {error}"))?;
    let mut response = client
        .get(parsed)
        .send()
        .await
        .map_err(|error| format!("Intelligence Pack download failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Intelligence Pack download returned HTTP {}.",
            response.status()
        ));
    }
    if response.url().scheme() != "https" {
        return Err("Intelligence Pack download redirected to an insecure URL.".to_string());
    }
    if response
        .content_length()
        .is_some_and(|value| value > MAX_ENVELOPE_BYTES as u64)
    {
        return Err("Intelligence Pack envelope exceeds the safety limit.".to_string());
    }
    let mut bytes = Vec::with_capacity(
        response
            .content_length()
            .unwrap_or(0)
            .min(MAX_ENVELOPE_BYTES as u64) as usize,
    );
    let mut digest = Sha256::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("Intelligence Pack download was interrupted: {error}"))?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_ENVELOPE_BYTES {
            return Err("Intelligence Pack envelope exceeds the safety limit.".to_string());
        }
        digest.update(&chunk);
        bytes.extend_from_slice(&chunk);
    }
    let actual = format!("{:x}", digest.finalize());
    if !actual.eq_ignore_ascii_case(expected_sha256) {
        return Err("Intelligence Pack transport digest check failed.".to_string());
    }
    Ok(bytes)
}

#[tauri::command]
pub async fn load_intelligence_pack(app: AppHandle) -> Result<IntelligencePackRuntimeV1, String> {
    let root = pack_root(&app)?;
    tokio::task::spawn_blocking(move || {
        let store = PackStore::new(root);
        let reconciled = store.reconcile(&context(), &trusted_keys())?;
        let previous = store
            .read_state()?
            .previous
            .map(|pointer| pointer.pack_version);
        IntelligencePackRuntimeV1::from_reconciled(reconciled, previous)
    })
    .await
    .map_err(|error| format!("Intelligence Pack loader task failed: {error}"))?
}

#[tauri::command]
pub async fn prepare_intelligence_pack_update(
    app: AppHandle,
    url: String,
    envelope_sha256: String,
) -> Result<PreparedIntelligencePackV1, String> {
    let raw = download_envelope(&url, &envelope_sha256).await?;
    let root = pack_root(&app)?;
    tokio::task::spawn_blocking(move || {
        let store = PackStore::new(root);
        let pointer = store.stage(&raw, Some(&envelope_sha256), &context(), &trusted_keys())?;
        let payload = store
            .staged_payload(&context(), &trusted_keys())?
            .ok_or_else(|| {
                "Intelligence Pack staging disappeared after verification.".to_string()
            })?;
        prepared(pointer, payload)
    })
    .await
    .map_err(|error| format!("Intelligence Pack staging task failed: {error}"))?
}

#[tauri::command]
pub async fn activate_intelligence_pack(app: AppHandle) -> Result<PackPointerV1, String> {
    let root = pack_root(&app)?;
    tokio::task::spawn_blocking(move || {
        PackStore::new(root).activate_staged(&context(), &trusted_keys())
    })
    .await
    .map_err(|error| format!("Intelligence Pack activation task failed: {error}"))?
}

#[tauri::command]
pub async fn rollback_intelligence_pack(
    app: AppHandle,
) -> Result<IntelligencePackRuntimeV1, String> {
    let root = pack_root(&app)?;
    tokio::task::spawn_blocking(move || {
        let store = PackStore::new(root);
        store.rollback(&context(), &trusted_keys())?;
        let reconciled = store.reconcile(&context(), &trusted_keys())?;
        let previous = store
            .read_state()?
            .previous
            .map(|pointer| pointer.pack_version);
        IntelligencePackRuntimeV1::from_reconciled(reconciled, previous)
    })
    .await
    .map_err(|error| format!("Intelligence Pack rollback task failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn next_intelligence_authority_is_separate_and_non_release() {
        assert!(INTELLIGENCE_PACK_KEY_ID.starts_with("int-next-"));
        assert_ne!(INTELLIGENCE_PACK_KEY_ID, "rel-2026-01");
        assert_ne!(INTELLIGENCE_PACK_KEY_ID, "att-2026-01");
        assert_eq!(context().registry_schema_version, REGISTRY_SCHEMA);
        assert_eq!(context().brain_index_schema_version, BRAIN_INDEX_SCHEMA);
    }
}
