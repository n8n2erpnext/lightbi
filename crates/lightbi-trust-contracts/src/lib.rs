use serde_json::{Map, Value};

pub fn canonicalize(value: &Value, key: Option<&str>) -> Result<Value, &'static str> {
    match value {
        Value::Null | Value::Bool(_) | Value::String(_) => Ok(value.clone()),
        Value::Number(number) if number.as_i64().is_some() || number.as_u64().is_some() => Ok(value.clone()),
        Value::Number(_) => Err("canonical_numbers_must_be_integers"),
        Value::Array(items) => {
            let mut normalized: Vec<Value> = items.iter().map(|item| canonicalize(item, None)).collect::<Result<_, _>>()?;
            if key == Some("capabilities") { normalized.sort_by(|a,b| a.as_str().cmp(&b.as_str())); }
            if key == Some("keys") { normalized.sort_by(|a,b| a.get("kid").and_then(Value::as_str).cmp(&b.get("kid").and_then(Value::as_str))); }
            Ok(Value::Array(normalized))
        }
        Value::Object(object) => {
            let mut normalized = Map::new();
            let mut keys: Vec<_> = object.keys().collect(); keys.sort();
            for current in keys { normalized.insert(current.clone(), canonicalize(&object[current], Some(current))?); }
            Ok(Value::Object(normalized))
        }
    }
}

pub fn canonical_bytes(value: &Value) -> Result<Vec<u8>, &'static str> { serde_json::to_vec(&canonicalize(value, None)?).map_err(|_| "canonical_json_failed") }

#[cfg(test)] mod tests {
    use super::*; use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine}; use ed25519_dalek::{Signature, Verifier, VerifyingKey}; use sha2::{Digest,Sha256};
    #[test] fn verifies_the_public_typescript_vector_byte_for_byte() {
        let vector:Value=serde_json::from_str(include_str!("../../../packages/trust-contracts/vectors/entitlement-business-v1.json")).unwrap(); let bytes=canonical_bytes(&vector["payload"]).unwrap();
        assert_eq!(String::from_utf8(bytes.clone()).unwrap(),vector["canonical_text"].as_str().unwrap()); assert_eq!(format!("{:x}",Sha256::digest(&bytes)),vector["sha256"].as_str().unwrap());
        let public: [u8;32]=URL_SAFE_NO_PAD.decode(vector["public_key"].as_str().unwrap()).unwrap().try_into().unwrap(); let signature=Signature::from_slice(&URL_SAFE_NO_PAD.decode(vector["signature"].as_str().unwrap()).unwrap()).unwrap(); VerifyingKey::from_bytes(&public).unwrap().verify(&bytes,&signature).unwrap();
        let mut changed=vector["payload"].clone(); changed["seat_limit"]=Value::from(25); assert_ne!(canonical_bytes(&changed).unwrap(),bytes);
    }
}
