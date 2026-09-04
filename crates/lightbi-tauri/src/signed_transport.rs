use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ring::signature::Ed25519KeyPair;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

const REQUEST_SCHEMA: &str = "lightbi.next-attestation-request.v1";
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

fn exact_path(path: &[String], expected: &[&str]) -> bool {
    path.len() == expected.len()
        && path
            .iter()
            .zip(expected.iter())
            .all(|(left, right)| left == right)
}

fn write_string(out: &mut String, value: &str) -> Result<(), String> {
    out.push_str(
        &serde_json::to_string(value).map_err(|_| "canonical_string_invalid".to_string())?,
    );
    Ok(())
}

fn write_number(out: &mut String, value: &serde_json::Number) -> Result<(), String> {
    if let Some(number) = value.as_i64() {
        if number.unsigned_abs() > MAX_SAFE_INTEGER {
            return Err("canonical_numbers_must_be_safe_integers".to_string());
        }
        out.push_str(&number.to_string());
        return Ok(());
    }
    if let Some(number) = value.as_u64() {
        if number > MAX_SAFE_INTEGER {
            return Err("canonical_numbers_must_be_safe_integers".to_string());
        }
        out.push_str(&number.to_string());
        return Ok(());
    }
    Err("canonical_numbers_must_be_safe_integers".to_string())
}

fn write_array(out: &mut String, values: &[Value], path: &[String]) -> Result<(), String> {
    let mut ordered: Vec<&Value> = values.iter().collect();
    if exact_path(path, &["capabilities"]) {
        if !ordered.iter().all(|value| value.is_string()) {
            return Err("canonical_capabilities_must_be_strings".to_string());
        }
        ordered.sort_by(|left, right| {
            left.as_str()
                .unwrap()
                .as_bytes()
                .cmp(right.as_str().unwrap().as_bytes())
        });
    } else if exact_path(path, &["keys"]) {
        if !ordered
            .iter()
            .all(|value| value.get("kid").and_then(Value::as_str).is_some())
        {
            return Err("canonical_keys_require_kid".to_string());
        }
        ordered.sort_by(|left, right| {
            left.get("kid")
                .unwrap()
                .as_str()
                .unwrap()
                .as_bytes()
                .cmp(right.get("kid").unwrap().as_str().unwrap().as_bytes())
        });
    }
    out.push('[');
    for (index, value) in ordered.iter().enumerate() {
        if index > 0 {
            out.push(',');
        }
        let mut child_path = path.to_vec();
        child_path.push("[]".to_string());
        write_canonical(out, value, &child_path)?;
    }
    out.push(']');
    Ok(())
}

fn write_object(
    out: &mut String,
    values: &serde_json::Map<String, Value>,
    path: &[String],
) -> Result<(), String> {
    let mut keys: Vec<&String> = values.keys().collect();
    keys.sort_by(|left, right| left.as_bytes().cmp(right.as_bytes()));
    out.push('{');
    for (index, key) in keys.iter().enumerate() {
        if index > 0 {
            out.push(',');
        }
        write_string(out, key)?;
        out.push(':');
        let mut child_path = path.to_vec();
        child_path.push((*key).clone());
        write_canonical(out, values.get(*key).unwrap(), &child_path)?;
    }
    out.push('}');
    Ok(())
}

fn write_canonical(out: &mut String, value: &Value, path: &[String]) -> Result<(), String> {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(value) => out.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => write_number(out, value)?,
        Value::String(value) => write_string(out, value)?,
        Value::Array(values) => write_array(out, values, path)?,
        Value::Object(values) => write_object(out, values, path)?,
    }
    Ok(())
}

pub(crate) fn canonical_bytes(value: &Value) -> Result<Vec<u8>, String> {
    let mut out = String::new();
    write_canonical(&mut out, value, &[])?;
    Ok(out.into_bytes())
}

pub(crate) fn body_sha256(value: &Value) -> Result<String, String> {
    Ok(format!("{:x}", Sha256::digest(canonical_bytes(value)?)))
}
#[derive(Debug, Serialize)]
struct RequestProofPayload<'a> {
    schema: &'static str,
    certificate_id: &'a str,
    method: &'a str,
    path: &'a str,
    timestamp: &'a str,
    sequence: u64,
    server_nonce: &'a str,
    body_sha256: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct SignedRequestProof<'a> {
    payload: RequestProofPayload<'a>,
    signature: String,
}

pub(crate) fn build_request_proof<'a>(
    key_pair: &Ed25519KeyPair,
    certificate_id: &'a str,
    method: &'a str,
    path: &'a str,
    timestamp: &'a str,
    sequence: u64,
    server_nonce: &'a str,
    body: &Value,
) -> Result<SignedRequestProof<'a>, String> {
    if sequence == 0 || sequence > MAX_SAFE_INTEGER {
        return Err("signed_transport_sequence_invalid".to_string());
    }
    if method.len() < 3
        || method.len() > 12
        || !method.bytes().all(|byte| byte.is_ascii_uppercase())
    {
        return Err("signed_transport_method_invalid".to_string());
    }
    if !path.starts_with('/') || path.contains('?') || path.contains('#') || path.len() > 512 {
        return Err("signed_transport_path_invalid".to_string());
    }
    if certificate_id.is_empty() || server_nonce.is_empty() || timestamp.is_empty() {
        return Err("signed_transport_identity_invalid".to_string());
    }
    let payload = RequestProofPayload {
        schema: REQUEST_SCHEMA,
        certificate_id,
        method,
        path,
        timestamp,
        sequence,
        server_nonce,
        body_sha256: body_sha256(body)?,
    };
    let value = serde_json::to_value(&payload)
        .map_err(|_| "signed_transport_payload_encode_failed".to_string())?;
    let signature = URL_SAFE_NO_PAD.encode(key_pair.sign(&canonical_bytes(&value)?).as_ref());
    Ok(SignedRequestProof { payload, signature })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ring::{rand::SystemRandom, signature::KeyPair};
    use serde_json::json;

    #[test]
    fn canonicalization_matches_authoritative_trust_contract_vector() {
        let body =
            json!({"z":2,"a":1,"capabilities":["beta","alpha"],"nested":{"é":"v","aa":true}});
        assert_eq!(String::from_utf8(canonical_bytes(&body).unwrap()).unwrap(),
            "{\"a\":1,\"capabilities\":[\"alpha\",\"beta\"],\"nested\":{\"aa\":true,\"é\":\"v\"},\"z\":2}");
        assert_eq!(
            body_sha256(&body).unwrap(),
            "f9ae0342b761592bd6068234e8b32c5c12ab83dc65fa16325ba56dc9b5061dd9"
        );
    }
    #[test]
    fn request_proof_matches_js_canonical_vector_and_signature_verifies() {
        let document = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        let key = Ed25519KeyPair::from_pkcs8(document.as_ref()).unwrap();
        let body =
            json!({"z":2,"a":1,"capabilities":["beta","alpha"],"nested":{"é":"v","aa":true}});
        let proof = build_request_proof(
            &key,
            "next-cert-test-001",
            "POST",
            "/api/app/event",
            "2026-09-04T13:00:00Z",
            10,
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            &body,
        )
        .unwrap();
        let payload = serde_json::to_value(&proof.payload).unwrap();
        let canonical = canonical_bytes(&payload).unwrap();
        assert_eq!(
            format!("{:x}", Sha256::digest(&canonical)),
            "65d6a3198bc38bf990ac44f697e6d58a2722f93bdd7112b5ca97f7c8d0fa097f"
        );
        ring::signature::UnparsedPublicKey::new(
            &ring::signature::ED25519,
            key.public_key().as_ref(),
        )
        .verify(
            &canonical,
            &URL_SAFE_NO_PAD.decode(&proof.signature).unwrap(),
        )
        .unwrap();
    }

    #[test]
    fn proof_builder_rejects_query_binding_and_non_integer_canonical_values() {
        let document = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        let key = Ed25519KeyPair::from_pkcs8(document.as_ref()).unwrap();
        assert!(build_request_proof(
            &key,
            "cert",
            "GET",
            "/api/releases?refresh=1",
            "2026-09-04T13:00:00Z",
            1,
            "nonce",
            &Value::Null
        )
        .is_err());
        assert!(canonical_bytes(&json!({"ratio":1.5})).is_err());
    }
}
