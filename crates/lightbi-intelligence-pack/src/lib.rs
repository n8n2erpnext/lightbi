use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ring::signature::{UnparsedPublicKey, ED25519};
use semver::Version;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

pub const PACK_SCHEMA_VERSION: &str = "lightbi.intelligence-pack.v1";
pub const PACK_STATE_SCHEMA_VERSION: &str = "lightbi.intelligence-pack-state.v1";
pub const DATA_ONLY_MODE: &str = "data_only";
pub const MICRO_BRAIN_CONTENT_TYPE: &str = "application/vnd.lightbi.micro-brain-index+json";
pub const MAX_PAYLOAD_BYTES: usize = 64 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IntelligencePackManifestV1 {
    pub schema_version: String,
    pub pack_version: String,
    pub created_at: String,
    pub intelligence_mode: String,
    pub content_type: String,
    pub payload_schema_version: String,
    pub payload_sha256: String,
    pub payload_size_bytes: u64,
    pub min_core_version: String,
    pub max_core_version_exclusive: String,
    pub registry_schema_version: String,
    pub required_feature_contracts: Vec<String>,
    pub signing_key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IntelligencePackEnvelopeV1 {
    pub manifest: IntelligencePackManifestV1,
    pub payload_base64_url: String,
    pub signature: String,
}

#[derive(Debug, Clone)]
pub struct CompatibilityContext<'a> {
    pub core_version: &'a str,
    pub brain_index_schema_version: &'a str,
    pub registry_schema_version: &'a str,
    pub feature_contracts: &'a [&'a str],
}

#[derive(Debug, Clone)]
pub struct TrustedKey<'a> {
    pub key_id: &'a str,
    pub public_key_base64_url: &'a str,
}

#[derive(Debug, Clone)]
pub struct VerifiedPack {
    pub envelope: IntelligencePackEnvelopeV1,
    pub payload: Vec<u8>,
    pub envelope_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackPointerV1 {
    pub pack_version: String,
    pub object_sha256: String,
    pub payload_sha256: String,
    pub signing_key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PackStateV1 {
    pub schema_version: String,
    pub staged: Option<PackPointerV1>,
    pub active: Option<PackPointerV1>,
    pub previous: Option<PackPointerV1>,
    #[serde(default)]
    pub accepted_version_floor: Option<String>,
}

impl Default for PackStateV1 {
    fn default() -> Self {
        Self {
            schema_version: PACK_STATE_SCHEMA_VERSION.to_string(),
            staged: None,
            active: None,
            previous: None,
            accepted_version_floor: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReconciledPack {
    pub source: &'static str,
    pub pack_version: Option<String>,
    pub payload_sha256: Option<String>,
    pub signing_key_id: Option<String>,
    #[serde(skip_serializing)]
    pub payload: Option<Vec<u8>>,
    pub repaired: bool,
    pub limitation: Option<String>,
}

pub(crate) fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub(crate) fn valid_sha256(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn valid_utc_seconds(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 20
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b'T'
        && bytes[13] == b':'
        && bytes[16] == b':'
        && bytes[19] == b'Z'
        && bytes.iter().enumerate().all(|(index, byte)| {
            matches!(index, 4 | 7 | 10 | 13 | 16 | 19) || byte.is_ascii_digit()
        })
}

fn write_canonical(out: &mut String, value: &Value) -> Result<(), String> {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(value) => out.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => {
            if let Some(number) = value.as_i64() {
                if number.unsigned_abs() > 9_007_199_254_740_991 {
                    return Err("pack_manifest_number_out_of_safe_range".to_string());
                }
                out.push_str(&number.to_string());
            } else if let Some(number) = value.as_u64() {
                if number > 9_007_199_254_740_991 {
                    return Err("pack_manifest_number_out_of_safe_range".to_string());
                }
                out.push_str(&number.to_string());
            } else {
                return Err("pack_manifest_float_not_allowed".to_string());
            }
        }
        Value::String(value) => out.push_str(
            &serde_json::to_string(value)
                .map_err(|_| "pack_manifest_string_invalid".to_string())?,
        ),
        Value::Array(values) => {
            out.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                write_canonical(out, value)?;
            }
            out.push(']');
        }
        Value::Object(values) => {
            let mut keys = values.keys().collect::<Vec<_>>();
            keys.sort_by(|left, right| left.as_bytes().cmp(right.as_bytes()));
            out.push('{');
            for (index, key) in keys.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                out.push_str(
                    &serde_json::to_string(key)
                        .map_err(|_| "pack_manifest_key_invalid".to_string())?,
                );
                out.push(':');
                write_canonical(out, values.get(*key).expect("canonical key exists"))?;
            }
            out.push('}');
        }
    }
    Ok(())
}

pub fn canonical_manifest_bytes(manifest: &IntelligencePackManifestV1) -> Result<Vec<u8>, String> {
    let value = serde_json::to_value(manifest)
        .map_err(|error| format!("pack_manifest_serialize_failed:{error}"))?;
    let mut output = String::new();
    write_canonical(&mut output, &value)?;
    Ok(output.into_bytes())
}

fn validate_manifest(
    manifest: &IntelligencePackManifestV1,
    context: &CompatibilityContext<'_>,
) -> Result<(), String> {
    if manifest.schema_version != PACK_SCHEMA_VERSION {
        return Err("pack_schema_incompatible".to_string());
    }
    if manifest.intelligence_mode != DATA_ONLY_MODE {
        return Err("pack_executable_mode_forbidden".to_string());
    }
    if manifest.content_type != MICRO_BRAIN_CONTENT_TYPE {
        return Err("pack_content_type_unsupported".to_string());
    }
    if manifest.payload_schema_version != context.brain_index_schema_version {
        return Err("pack_brain_schema_incompatible".to_string());
    }
    if manifest.registry_schema_version != context.registry_schema_version {
        return Err("pack_registry_schema_incompatible".to_string());
    }
    if !valid_utc_seconds(&manifest.created_at) {
        return Err("pack_created_at_invalid".to_string());
    }
    if !valid_sha256(&manifest.payload_sha256) {
        return Err("pack_payload_sha256_invalid".to_string());
    }
    if manifest.payload_size_bytes == 0 || manifest.payload_size_bytes > MAX_PAYLOAD_BYTES as u64 {
        return Err("pack_payload_size_invalid".to_string());
    }
    if manifest.signing_key_id.trim().is_empty() || manifest.signing_key_id.len() > 96 {
        return Err("pack_signing_key_id_invalid".to_string());
    }

    let pack_version =
        Version::parse(&manifest.pack_version).map_err(|_| "pack_version_invalid".to_string())?;
    if pack_version == Version::new(0, 0, 0) {
        return Err("pack_version_invalid".to_string());
    }
    let current = Version::parse(context.core_version)
        .map_err(|_| "pack_current_core_version_invalid".to_string())?;
    let minimum = Version::parse(&manifest.min_core_version)
        .map_err(|_| "pack_min_core_version_invalid".to_string())?;
    let maximum = Version::parse(&manifest.max_core_version_exclusive)
        .map_err(|_| "pack_max_core_version_invalid".to_string())?;
    if minimum >= maximum {
        return Err("pack_core_range_invalid".to_string());
    }
    if current < minimum || current >= maximum {
        return Err("pack_core_incompatible".to_string());
    }

    if manifest.required_feature_contracts.is_empty() {
        return Err("pack_feature_contracts_missing".to_string());
    }
    let mut sorted = manifest.required_feature_contracts.clone();
    sorted.sort();
    sorted.dedup();
    if sorted != manifest.required_feature_contracts {
        return Err("pack_feature_contracts_not_sorted_unique".to_string());
    }
    let available = context
        .feature_contracts
        .iter()
        .copied()
        .collect::<BTreeSet<_>>();
    if manifest
        .required_feature_contracts
        .iter()
        .any(|required| !available.contains(required.as_str()))
    {
        return Err("pack_required_feature_contract_missing".to_string());
    }
    Ok(())
}

fn smoke_validate_index(payload: &[u8], expected_schema: &str) -> Result<(), String> {
    let root: Value =
        serde_json::from_slice(payload).map_err(|_| "pack_payload_json_invalid".to_string())?;
    let object = root
        .as_object()
        .ok_or_else(|| "pack_payload_not_object".to_string())?;
    let manifest = object
        .get("manifest")
        .and_then(Value::as_object)
        .ok_or_else(|| "pack_index_manifest_missing".to_string())?;
    if manifest.get("schemaVersion").and_then(Value::as_str) != Some(expected_schema) {
        return Err("pack_index_schema_mismatch".to_string());
    }
    let cards = object
        .get("cards")
        .and_then(Value::as_array)
        .ok_or_else(|| "pack_index_cards_missing".to_string())?;
    let units = object
        .get("units")
        .and_then(Value::as_array)
        .ok_or_else(|| "pack_index_units_missing".to_string())?;
    let features = object
        .get("featureVocabulary")
        .and_then(Value::as_array)
        .ok_or_else(|| "pack_index_features_missing".to_string())?;
    let idf = object
        .get("idf")
        .and_then(Value::as_array)
        .ok_or_else(|| "pack_index_idf_missing".to_string())?;
    let card_count = manifest.get("cardCount").and_then(Value::as_u64);
    let unit_count = manifest.get("unitCount").and_then(Value::as_u64);
    let feature_count = manifest.get("featureCount").and_then(Value::as_u64);
    let dimensions = manifest
        .get("vectorDimensions")
        .and_then(Value::as_u64)
        .ok_or_else(|| "pack_index_vector_dimensions_missing".to_string())?;
    if card_count != Some(cards.len() as u64) {
        return Err("pack_index_card_count_mismatch".to_string());
    }
    if unit_count != Some(units.len() as u64) {
        return Err("pack_index_unit_count_mismatch".to_string());
    }
    if feature_count != Some(features.len() as u64) || idf.len() != features.len() {
        return Err("pack_index_feature_count_mismatch".to_string());
    }
    if dimensions == 0 || dimensions > 4096 {
        return Err("pack_index_vector_dimensions_invalid".to_string());
    }
    let lsa = object
        .get("lsa")
        .and_then(Value::as_object)
        .ok_or_else(|| "pack_index_lsa_missing".to_string())?;
    let projection = lsa
        .get("projection")
        .and_then(Value::as_array)
        .ok_or_else(|| "pack_index_projection_missing".to_string())?;
    let document_vectors = lsa
        .get("documentVectors")
        .and_then(Value::as_array)
        .ok_or_else(|| "pack_index_document_vectors_missing".to_string())?;
    if projection.len() != features.len() || document_vectors.len() != units.len() {
        return Err("pack_index_vector_count_mismatch".to_string());
    }
    if projection
        .iter()
        .any(|row| row.as_array().map(|v| v.len()) != Some(dimensions as usize))
        || document_vectors
            .iter()
            .any(|row| row.as_array().map(|v| v.len()) != Some(dimensions as usize))
    {
        return Err("pack_index_vector_dimension_mismatch".to_string());
    }
    let bm25 = object
        .get("bm25")
        .and_then(Value::as_object)
        .ok_or_else(|| "pack_index_bm25_missing".to_string())?;
    if bm25
        .get("documentLengths")
        .and_then(Value::as_array)
        .map(|values| values.len())
        != Some(units.len())
    {
        return Err("pack_index_bm25_length_mismatch".to_string());
    }
    Ok(())
}

pub fn verify_pack_bytes(
    raw: &[u8],
    context: &CompatibilityContext<'_>,
    trusted_keys: &[TrustedKey<'_>],
) -> Result<VerifiedPack, String> {
    if raw.is_empty() || raw.len() > MAX_PAYLOAD_BYTES * 2 {
        return Err("pack_envelope_size_invalid".to_string());
    }
    let envelope: IntelligencePackEnvelopeV1 =
        serde_json::from_slice(raw).map_err(|error| format!("pack_envelope_invalid:{error}"))?;
    validate_manifest(&envelope.manifest, context)?;
    let key = trusted_keys
        .iter()
        .find(|key| key.key_id == envelope.manifest.signing_key_id)
        .ok_or_else(|| "pack_signing_key_untrusted".to_string())?;
    let public_key = URL_SAFE_NO_PAD
        .decode(key.public_key_base64_url)
        .map_err(|_| "pack_public_key_invalid".to_string())?;
    if public_key.len() != 32 {
        return Err("pack_public_key_invalid".to_string());
    }
    let signature = URL_SAFE_NO_PAD
        .decode(&envelope.signature)
        .map_err(|_| "pack_signature_encoding_invalid".to_string())?;
    UnparsedPublicKey::new(&ED25519, public_key)
        .verify(&canonical_manifest_bytes(&envelope.manifest)?, &signature)
        .map_err(|_| "pack_signature_invalid".to_string())?;

    let payload = URL_SAFE_NO_PAD
        .decode(&envelope.payload_base64_url)
        .map_err(|_| "pack_payload_encoding_invalid".to_string())?;
    if payload.len() != envelope.manifest.payload_size_bytes as usize {
        return Err("pack_payload_size_mismatch".to_string());
    }
    if sha256_hex(&payload) != envelope.manifest.payload_sha256.to_ascii_lowercase() {
        return Err("pack_payload_digest_mismatch".to_string());
    }
    smoke_validate_index(&payload, context.brain_index_schema_version)?;

    Ok(VerifiedPack {
        envelope,
        payload,
        envelope_sha256: sha256_hex(raw),
    })
}

mod store;
pub use store::PackStore;

#[cfg(test)]
mod tests {
    use super::*;
    use ring::{
        rand::SystemRandom,
        signature::{Ed25519KeyPair, KeyPair},
    };
    use serde_json::json;
    use std::fs;
    use tempfile::tempdir;

    const INDEX_SCHEMA: &str = "lightbi.micro-brain.index.v1";
    const REGISTRY_SCHEMA: &str = "lightbi.semantic-registry.v1";
    const FEATURES: &[&str] = &[
        "evidence_bound_analysis_authority_v1",
        "micro_brain_index_v1",
    ];

    fn context() -> CompatibilityContext<'static> {
        CompatibilityContext {
            core_version: "0.9.2-beta.7",
            brain_index_schema_version: INDEX_SCHEMA,
            registry_schema_version: REGISTRY_SCHEMA,
            feature_contracts: FEATURES,
        }
    }

    fn minimal_index() -> Vec<u8> {
        serde_json::to_vec(&json!({
            "manifest": {
                "schemaVersion": INDEX_SCHEMA,
                "cardCount": 1,
                "unitCount": 1,
                "featureCount": 1,
                "vectorDimensions": 1
            },
            "cards": [{"id":"concept.test"}],
            "units": [{"unitId":"u1"}],
            "featureVocabulary": ["test"],
            "idf": [1.0],
            "bm25": {"documentLengths":[1],"averageDocumentLength":1,"postings":{}},
            "lsa": {"projection":[[1.0]],"documentVectors":[[1.0]]}
        }))
        .unwrap()
    }

    fn signed_pack(version: &str, key: &Ed25519KeyPair, key_id: &str) -> Vec<u8> {
        let payload = minimal_index();
        let manifest = IntelligencePackManifestV1 {
            schema_version: PACK_SCHEMA_VERSION.to_string(),
            pack_version: version.to_string(),
            created_at: "2026-09-04T13:00:00Z".to_string(),
            intelligence_mode: DATA_ONLY_MODE.to_string(),
            content_type: MICRO_BRAIN_CONTENT_TYPE.to_string(),
            payload_schema_version: INDEX_SCHEMA.to_string(),
            payload_sha256: sha256_hex(&payload),
            payload_size_bytes: payload.len() as u64,
            min_core_version: "0.9.2-beta.7".to_string(),
            max_core_version_exclusive: "0.9.3".to_string(),
            registry_schema_version: REGISTRY_SCHEMA.to_string(),
            required_feature_contracts: FEATURES.iter().map(|value| value.to_string()).collect(),
            signing_key_id: key_id.to_string(),
        };
        let signature = URL_SAFE_NO_PAD.encode(
            key.sign(&canonical_manifest_bytes(&manifest).unwrap())
                .as_ref(),
        );
        serde_json::to_vec(&IntelligencePackEnvelopeV1 {
            manifest,
            payload_base64_url: URL_SAFE_NO_PAD.encode(payload),
            signature,
        })
        .unwrap()
    }

    fn keypair() -> Ed25519KeyPair {
        let document = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        Ed25519KeyPair::from_pkcs8(document.as_ref()).unwrap()
    }

    #[test]
    fn verifies_signature_payload_digest_and_compatibility() {
        let key = keypair();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let raw = signed_pack("1.0.0-next.1", &key, "int-test-1");
        let verified = verify_pack_bytes(
            &raw,
            &context(),
            &[TrustedKey {
                key_id: "int-test-1",
                public_key_base64_url: &public,
            }],
        )
        .unwrap();
        assert_eq!(verified.envelope.manifest.pack_version, "1.0.0-next.1");
        assert_eq!(verified.payload, minimal_index());
    }

    #[test]
    fn rejects_signature_payload_key_and_executable_tamper() {
        let key = keypair();
        let other = keypair();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let other_public = URL_SAFE_NO_PAD.encode(other.public_key().as_ref());
        let raw = signed_pack("1.0.0-next.1", &key, "int-test-1");

        let mut envelope: Value = serde_json::from_slice(&raw).unwrap();
        envelope["signature"] = Value::String(URL_SAFE_NO_PAD.encode([0_u8; 64]));
        assert_eq!(
            verify_pack_bytes(
                &serde_json::to_vec(&envelope).unwrap(),
                &context(),
                &[TrustedKey {
                    key_id: "int-test-1",
                    public_key_base64_url: &public
                }]
            )
            .unwrap_err(),
            "pack_signature_invalid"
        );

        assert_eq!(
            verify_pack_bytes(
                &raw,
                &context(),
                &[TrustedKey {
                    key_id: "int-test-1",
                    public_key_base64_url: &other_public
                }]
            )
            .unwrap_err(),
            "pack_signature_invalid"
        );

        let mut wrong_id: Value = serde_json::from_slice(&raw).unwrap();
        wrong_id["manifest"]["signingKeyId"] = Value::String("int-test-unknown".to_string());
        assert_eq!(
            verify_pack_bytes(
                &serde_json::to_vec(&wrong_id).unwrap(),
                &context(),
                &[TrustedKey {
                    key_id: "int-test-1",
                    public_key_base64_url: &public
                }]
            )
            .unwrap_err(),
            "pack_signing_key_untrusted"
        );

        let mut payload_tamper: Value = serde_json::from_slice(&raw).unwrap();
        let mut payload = URL_SAFE_NO_PAD
            .decode(payload_tamper["payloadBase64Url"].as_str().unwrap())
            .unwrap();
        payload[0] ^= 1;
        payload_tamper["payloadBase64Url"] = Value::String(URL_SAFE_NO_PAD.encode(payload));
        assert_eq!(
            verify_pack_bytes(
                &serde_json::to_vec(&payload_tamper).unwrap(),
                &context(),
                &[TrustedKey {
                    key_id: "int-test-1",
                    public_key_base64_url: &public
                }]
            )
            .unwrap_err(),
            "pack_payload_digest_mismatch"
        );

        let mut executable: Value = serde_json::from_slice(&raw).unwrap();
        executable["manifest"]["intelligenceMode"] = Value::String("executable".to_string());
        assert_eq!(
            verify_pack_bytes(
                &serde_json::to_vec(&executable).unwrap(),
                &context(),
                &[TrustedKey {
                    key_id: "int-test-1",
                    public_key_base64_url: &public
                }]
            )
            .unwrap_err(),
            "pack_executable_mode_forbidden"
        );

        let mut unknown: Value = serde_json::from_slice(&raw).unwrap();
        unknown["executable"] = Value::String("alert(1)".to_string());
        assert!(verify_pack_bytes(
            &serde_json::to_vec(&unknown).unwrap(),
            &context(),
            &[TrustedKey {
                key_id: "int-test-1",
                public_key_base64_url: &public
            }]
        )
        .is_err());
    }

    #[test]
    fn rejects_schema_core_and_feature_contract_incompatibility() {
        let key = keypair();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let raw = signed_pack("1.0.0-next.1", &key, "int-test-1");
        let keys = [TrustedKey {
            key_id: "int-test-1",
            public_key_base64_url: &public,
        }];

        let wrong_registry = CompatibilityContext {
            registry_schema_version: "lightbi.semantic-registry.v2",
            ..context()
        };
        assert_eq!(
            verify_pack_bytes(&raw, &wrong_registry, &keys).unwrap_err(),
            "pack_registry_schema_incompatible"
        );

        let wrong_brain = CompatibilityContext {
            brain_index_schema_version: "lightbi.micro-brain.index.v2",
            ..context()
        };
        assert_eq!(
            verify_pack_bytes(&raw, &wrong_brain, &keys).unwrap_err(),
            "pack_brain_schema_incompatible"
        );

        let incompatible_core = CompatibilityContext {
            core_version: "0.9.3",
            ..context()
        };
        assert_eq!(
            verify_pack_bytes(&raw, &incompatible_core, &keys).unwrap_err(),
            "pack_core_incompatible"
        );

        let missing_feature = CompatibilityContext {
            feature_contracts: &["micro_brain_index_v1"],
            ..context()
        };
        assert_eq!(
            verify_pack_bytes(&raw, &missing_feature, &keys).unwrap_err(),
            "pack_required_feature_contract_missing"
        );
    }

    #[test]
    fn activation_and_rollback_are_single_state_record_transitions() {
        let key = keypair();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let keys = [TrustedKey {
            key_id: "int-test-1",
            public_key_base64_url: &public,
        }];
        let dir = tempdir().unwrap();
        let store = PackStore::new(dir.path());
        let first = signed_pack("1.0.0-next.1", &key, "int-test-1");
        let second = signed_pack("1.0.0-next.2", &key, "int-test-1");
        store.stage(&first, None, &context(), &keys).unwrap();
        let first_pointer = store.activate_staged(&context(), &keys).unwrap();
        assert_eq!(
            store.read_state().unwrap().active,
            Some(first_pointer.clone())
        );
        store.stage(&second, None, &context(), &keys).unwrap();
        let second_pointer = store.activate_staged(&context(), &keys).unwrap();
        let state = store.read_state().unwrap();
        assert_eq!(state.active, Some(second_pointer));
        assert_eq!(state.previous, Some(first_pointer.clone()));
        assert!(state.staged.is_none());
        let rolled = store.rollback(&context(), &keys).unwrap();
        assert_eq!(rolled, first_pointer);
        let state = store.read_state().unwrap();
        assert_eq!(
            state.accepted_version_floor.as_deref(),
            Some("1.0.0-next.2")
        );
        let downgrade = signed_pack("1.0.0-next.1.5", &key, "int-test-1");
        assert_eq!(
            store
                .stage(&downgrade, None, &context(), &keys)
                .unwrap_err(),
            "pack_version_not_newer_than_accepted_floor"
        );
    }

    #[test]
    fn corrupted_state_fails_closed_to_bundled_and_repairs_state() {
        let key = keypair();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let keys = [TrustedKey {
            key_id: "int-test-1",
            public_key_base64_url: &public,
        }];
        let dir = tempdir().unwrap();
        let store = PackStore::new(dir.path());
        fs::write(dir.path().join("state.json"), b"{corrupt").unwrap();
        let reconciled = store.reconcile(&context(), &keys).unwrap();
        assert_eq!(reconciled.source, "bundled");
        assert!(reconciled.repaired);
        assert!(reconciled
            .limitation
            .as_deref()
            .unwrap()
            .starts_with("state_rejected:pack_state_invalid:"));
        assert_eq!(store.read_state().unwrap(), PackStateV1::default());
    }

    #[test]
    fn interrupted_staging_keeps_active_and_invalid_active_restores_previous() {
        let key = keypair();
        let public = URL_SAFE_NO_PAD.encode(key.public_key().as_ref());
        let keys = [TrustedKey {
            key_id: "int-test-1",
            public_key_base64_url: &public,
        }];
        let dir = tempdir().unwrap();
        let store = PackStore::new(dir.path());
        let first = signed_pack("1.0.0-next.1", &key, "int-test-1");
        let second = signed_pack("1.0.0-next.2", &key, "int-test-1");
        store.stage(&first, None, &context(), &keys).unwrap();
        store.activate_staged(&context(), &keys).unwrap();
        store.stage(&second, None, &context(), &keys).unwrap();
        let staged_state = store.read_state().unwrap();
        assert_eq!(
            staged_state.active.as_ref().unwrap().pack_version,
            "1.0.0-next.1"
        );
        assert_eq!(
            staged_state.staged.as_ref().unwrap().pack_version,
            "1.0.0-next.2"
        );
        store.activate_staged(&context(), &keys).unwrap();
        let active = store.read_state().unwrap().active.unwrap();
        fs::write(
            dir.path()
                .join("objects")
                .join(format!("{}.json", active.object_sha256)),
            b"corrupt",
        )
        .unwrap();
        let recovered = store.reconcile(&context(), &keys).unwrap();
        assert_eq!(recovered.source, "previous");
        assert!(recovered.repaired);
        assert_eq!(recovered.pack_version.as_deref(), Some("1.0.0-next.1"));
    }
}
