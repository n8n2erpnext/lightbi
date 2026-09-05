use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ring::signature::Ed25519KeyPair;
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

const REQUEST_SCHEMA: &str = "lightbi.next-attestation-request.v1";
pub(crate) const REQUEST_SCHEMA_V2: &str = "lightbi.next-attestation-request.v2";
pub(crate) const RESPONSE_CORRELATION_V1: &str = "lightbi.next-response-correlation.v1";
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

pub(crate) fn raw_body_sha256(value: &[u8]) -> String {
    format!("{:x}", Sha256::digest(value))
}

pub(crate) fn validate_response_correlation(
    correlation: Option<&str>,
    observed_sequence: Option<&str>,
    digest: Option<&str>,
    body: &[u8],
    expected_sequence: u64,
) -> Result<(), String> {
    let sequence = observed_sequence.and_then(|value| value.parse::<u64>().ok());
    let expected_digest = raw_body_sha256(body);
    if correlation != Some(RESPONSE_CORRELATION_V1)
        || sequence != Some(expected_sequence)
        || digest != Some(expected_digest.as_str())
    {
        return Err("signed_transport_response_correlation_invalid".to_string());
    }
    Ok(())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum SignedRouteClass {
    Bootstrap,
    PublicRead,
    NativeProtected,
}

pub(crate) fn signed_route_class(pathname: &str) -> SignedRouteClass {
    if matches!(
        pathname,
        "/api/installation/trust/challenge"
            | "/api/installation/trust/issue"
            | "/api/installation/trust/nonce"
            | "/api/pair"
    ) {
        return SignedRouteClass::Bootstrap;
    }
    if pathname.starts_with("/api/account/") || pathname == "/api/license/activate" {
        return SignedRouteClass::NativeProtected;
    }
    SignedRouteClass::PublicRead
}

pub(crate) fn canonical_next_api_target(
    url: &url::Url,
    api_base: &str,
) -> Result<Option<String>, String> {
    let base =
        url::Url::parse(api_base).map_err(|_| "signed_transport_base_invalid".to_string())?;
    if url.scheme() != base.scheme()
        || url.host_str() != base.host_str()
        || url.port_or_known_default() != base.port_or_known_default()
    {
        return Ok(None);
    }
    let base_path = base.path().trim_end_matches('/');
    let path = url.path();
    if !path.starts_with(base_path) {
        return Ok(None);
    }
    let remainder = &path[base_path.len()..];
    if !remainder.starts_with('/') {
        return Ok(None);
    }
    let mut pairs: Vec<(String, String)> = url
        .query_pairs()
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect();
    pairs.sort_by(|left, right| {
        left.0
            .as_bytes()
            .cmp(right.0.as_bytes())
            .then_with(|| left.1.as_bytes().cmp(right.1.as_bytes()))
    });
    let mut query = url::form_urlencoded::Serializer::new(String::new());
    for (key, value) in pairs {
        query.append_pair(&key, &value);
    }
    let query = query.finish();
    let target = if query.is_empty() {
        remainder.to_string()
    } else {
        format!("{remainder}?{query}")
    };
    if target.len() > 1024 || target.contains('#') {
        return Err("signed_transport_target_invalid".to_string());
    }
    Ok(Some(target))
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

#[derive(Debug, Serialize)]
struct RequestProofPayloadV2<'a> {
    schema: &'static str,
    certificate_id: &'a str,
    method: &'a str,
    target: &'a str,
    timestamp: &'a str,
    sequence: u64,
    server_nonce: &'a str,
    body_sha256: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct SignedRequestProofV2<'a> {
    payload: RequestProofPayloadV2<'a>,
    signature: String,
}

pub(crate) fn build_request_proof_v2<'a>(
    key_pair: &Ed25519KeyPair,
    certificate_id: &'a str,
    method: &'a str,
    target: &'a str,
    timestamp: &'a str,
    sequence: u64,
    server_nonce: &'a str,
    body: &[u8],
) -> Result<SignedRequestProofV2<'a>, String> {
    if sequence == 0 || sequence > MAX_SAFE_INTEGER {
        return Err("signed_transport_sequence_invalid".to_string());
    }
    if method.len() < 3
        || method.len() > 12
        || !method.bytes().all(|byte| byte.is_ascii_uppercase())
    {
        return Err("signed_transport_method_invalid".to_string());
    }
    if !target.starts_with('/') || target.contains('#') || target.len() > 1024 {
        return Err("signed_transport_target_invalid".to_string());
    }
    if certificate_id.is_empty() || server_nonce.is_empty() || timestamp.is_empty() {
        return Err("signed_transport_identity_invalid".to_string());
    }
    let payload = RequestProofPayloadV2 {
        schema: REQUEST_SCHEMA_V2,
        certificate_id,
        method,
        target,
        timestamp,
        sequence,
        server_nonce,
        body_sha256: raw_body_sha256(body),
    };
    let value = serde_json::to_value(&payload)
        .map_err(|_| "signed_transport_payload_encode_failed".to_string())?;
    let signature = URL_SAFE_NO_PAD.encode(key_pair.sign(&canonical_bytes(&value)?).as_ref());
    Ok(SignedRequestProofV2 { payload, signature })
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
    fn v2_canonical_target_sorts_query_and_preserves_route_class() {
        let url = url::Url::parse("https://next-signed.example/distribution-api/api/account/session?z=2&a=hello%20world&a=alpha").unwrap();
        let target = canonical_next_api_target(
            &url,
            "https://next-signed.example/distribution-api",
        )
        .unwrap()
        .unwrap();
        assert_eq!(target, "/api/account/session?a=alpha&a=hello+world&z=2");
        assert_eq!(
            signed_route_class("/api/account/session"),
            SignedRouteClass::NativeProtected
        );
        assert_eq!(
            signed_route_class("/api/releases/latest"),
            SignedRouteClass::PublicRead
        );
    }

    #[test]
    fn v2_proof_binds_raw_body_and_query_target() {
        let document = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        let key = Ed25519KeyPair::from_pkcs8(document.as_ref()).unwrap();
        let proof = build_request_proof_v2(
            &key,
            "next-cert-test-001",
            "POST",
            "/api/account/session?a=1&b=2",
            "2026-09-04T16:00:00Z",
            11,
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            br#"{"hello":"world"}"#,
        )
        .unwrap();
        let payload = serde_json::to_value(&proof.payload).unwrap();
        assert_eq!(
            payload.get("schema").and_then(Value::as_str),
            Some(REQUEST_SCHEMA_V2)
        );
        assert_eq!(
            payload.get("target").and_then(Value::as_str),
            Some("/api/account/session?a=1&b=2")
        );
        assert_eq!(
            payload.get("body_sha256").and_then(Value::as_str),
            Some(raw_body_sha256(br#"{"hello":"world"}"#).as_str())
        );
        let canonical = canonical_bytes(&payload).unwrap();
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
    fn v2_response_correlation_rejects_sequence_or_body_tamper() {
        let body = br#"{\"ok\":true}"#;
        let digest = raw_body_sha256(body);
        assert!(validate_response_correlation(
            Some(RESPONSE_CORRELATION_V1), Some("12"), Some(&digest), body, 12
        ).is_ok());
        assert!(validate_response_correlation(
            Some(RESPONSE_CORRELATION_V1), Some("11"), Some(&digest), body, 12
        ).is_err());
        assert!(validate_response_correlation(
            Some(RESPONSE_CORRELATION_V1), Some("12"), Some(&digest), br#"{\"ok\":false}"#, 12
        ).is_err());
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
