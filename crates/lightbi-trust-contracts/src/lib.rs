use serde_json::{Map, Value};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

fn is_exact_path(path: &[String], expected: &[&str]) -> bool {
    path.len() == expected.len() && path.iter().zip(expected.iter()).all(|(left, right)| left == right)
}

fn canonicalize_at(value: &Value, path: &[String]) -> Result<Value, &'static str> {
    match value {
        Value::Null | Value::Bool(_) | Value::String(_) => Ok(value.clone()),
        Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                if integer >= -(MAX_SAFE_INTEGER as i64) && integer <= MAX_SAFE_INTEGER as i64 { return Ok(value.clone()); }
            }
            if let Some(integer) = number.as_u64() {
                if integer <= MAX_SAFE_INTEGER { return Ok(value.clone()); }
            }
            Err("canonical_numbers_must_be_safe_integers")
        }
        Value::Array(items) => {
            let mut child_path = path.to_vec();
            child_path.push("[]".to_string());
            let mut normalized: Vec<Value> = items.iter().map(|item| canonicalize_at(item, &child_path)).collect::<Result<_, _>>()?;
            if is_exact_path(path, &["capabilities"]) {
                if normalized.iter().any(|item| !item.is_string()) { return Err("canonical_capabilities_must_be_strings"); }
                normalized.sort_by(|left, right| left.as_str().cmp(&right.as_str()));
            }
            if is_exact_path(path, &["keys"]) {
                if normalized.iter().any(|item| item.get("kid").and_then(Value::as_str).is_none()) { return Err("canonical_keys_require_kid"); }
                normalized.sort_by(|left, right| left.get("kid").and_then(Value::as_str).cmp(&right.get("kid").and_then(Value::as_str)));
            }
            Ok(Value::Array(normalized))
        }
        Value::Object(object) => {
            let mut normalized = Map::new();
            let mut keys: Vec<_> = object.keys().collect();
            keys.sort();
            for current in keys {
                let mut child_path = path.to_vec();
                child_path.push(current.clone());
                normalized.insert(current.clone(), canonicalize_at(&object[current], &child_path)?);
            }
            Ok(Value::Object(normalized))
        }
    }
}

pub fn canonicalize(value: &Value, key: Option<&str>) -> Result<Value, &'static str> {
    let path = key.map(|value| vec![value.to_string()]).unwrap_or_default();
    canonicalize_at(value, &path)
}

pub fn canonical_bytes(value: &Value) -> Result<Vec<u8>, &'static str> {
    serde_json::to_vec(&canonicalize_at(value, &[])?).map_err(|_| "canonical_json_failed")
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};
    use sha2::{Digest, Sha256};
    use std::collections::BTreeSet;

    fn verify_vector(source: &str) -> Value {
        let vector: Value = serde_json::from_str(source).unwrap();
        assert_eq!(vector["test_only"], Value::Bool(true));
        let bytes = canonical_bytes(&vector["payload"]).unwrap();
        assert_eq!(String::from_utf8(bytes.clone()).unwrap(), vector["canonical_text"].as_str().unwrap());
        assert_eq!(format!("{:x}", Sha256::digest(&bytes)), vector["sha256"].as_str().unwrap());
        assert_eq!(format!("{}", hex_bytes(&bytes)), vector["canonical_utf8_hex"].as_str().unwrap());
        let public: [u8; 32] = URL_SAFE_NO_PAD.decode(vector["public_key"].as_str().unwrap()).unwrap().try_into().unwrap();
        let signature = Signature::from_slice(&URL_SAFE_NO_PAD.decode(vector["signature"].as_str().unwrap()).unwrap()).unwrap();
        VerifyingKey::from_bytes(&public).unwrap().verify(&bytes, &signature).unwrap();
        vector
    }

    fn hex_bytes(bytes: &[u8]) -> String { bytes.iter().map(|byte| format!("{byte:02x}")).collect() }

    #[test]
    fn verifies_all_public_test_vectors_byte_for_byte() {
        let vectors = [
            include_str!("../../../packages/trust-contracts/vectors/keyset-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/keyset-v1-equivocation.json"),
            include_str!("../../../packages/trust-contracts/vectors/keyset-v2-revoked-ent-rel.json"),
            include_str!("../../../packages/trust-contracts/vectors/release-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/installation-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/entitlement-account-pro-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/entitlement-business-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/pro-package-v1.json"),
        ];
        for source in vectors { verify_vector(source); }
    }

    #[test]
    fn full_chain_vectors_use_distinct_test_authorities() {
        let keyset = verify_vector(include_str!("../../../packages/trust-contracts/vectors/keyset-v1.json"));
        let root_public = keyset["public_key"].as_str().unwrap();
        let mut authority_keys = BTreeSet::new();
        authority_keys.insert(root_public.to_string());
        for key in keyset["payload"]["keys"].as_array().unwrap() { authority_keys.insert(key["public_key"].as_str().unwrap().to_string()); }
        assert_eq!(authority_keys.len(), 5);
        let payload_vectors = [
            include_str!("../../../packages/trust-contracts/vectors/release-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/installation-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/entitlement-account-pro-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/entitlement-business-v1.json"),
            include_str!("../../../packages/trust-contracts/vectors/pro-package-v1.json"),
        ];
        for source in payload_vectors {
            let vector = verify_vector(source);
            let kid = vector["payload"]["kid"].as_str().unwrap();
            let matching = keyset["payload"]["keys"].as_array().unwrap().iter().find(|key| key["kid"].as_str() == Some(kid)).unwrap();
            assert_eq!(matching["public_key"], vector["public_key"]);
        }
    }

    #[test]
    fn adversarial_ascii_ordering_matches_typescript_vector() {
        let vector: Value = serde_json::from_str(include_str!("../../../packages/trust-contracts/vectors/canonical-ordering-adversarial-v1.json")).unwrap();
        let bytes = canonical_bytes(&vector["payload"]).unwrap();
        assert_eq!(String::from_utf8(bytes.clone()).unwrap(), vector["canonical_text"].as_str().unwrap());
        assert_eq!(hex_bytes(&bytes), vector["canonical_utf8_hex"].as_str().unwrap());
        assert_eq!(format!("{:x}", Sha256::digest(&bytes)), vector["sha256"].as_str().unwrap());
        assert_eq!(vector["payload"]["nested"]["capabilities"], serde_json::json!(["aaa", "Aaa"]));
    }

    #[test]
    fn safe_integer_domain_matches_typescript() {
        assert!(canonical_bytes(&serde_json::json!({"value": 9_007_199_254_740_991_i64})).is_ok());
        assert!(canonical_bytes(&serde_json::json!({"value": -9_007_199_254_740_991_i64})).is_ok());
        assert_eq!(canonical_bytes(&serde_json::json!({"value": 9_007_199_254_740_992_u64})).unwrap_err(), "canonical_numbers_must_be_safe_integers");
        assert_eq!(canonical_bytes(&serde_json::json!({"value": 1.5})).unwrap_err(), "canonical_numbers_must_be_safe_integers");
    }

    #[test]
    fn semantic_array_ordering_is_path_scoped() {
        let root_a = canonical_bytes(&serde_json::json!({"capabilities":["zeta","alpha"]})).unwrap();
        let root_b = canonical_bytes(&serde_json::json!({"capabilities":["alpha","zeta"]})).unwrap();
        assert_eq!(root_a, root_b);
        let nested_a = canonical_bytes(&serde_json::json!({"metadata":{"capabilities":["zeta","alpha"]}})).unwrap();
        let nested_b = canonical_bytes(&serde_json::json!({"metadata":{"capabilities":["alpha","zeta"]}})).unwrap();
        assert_ne!(nested_a, nested_b);
    }
}
