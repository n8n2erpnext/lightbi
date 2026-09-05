use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, net::IpAddr, time::Duration};
use tauri::AppHandle;

use crate::{installation_trust, signed_transport};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NativeHttpRequest {
    pub(crate) url: String,
    pub(crate) method: String,
    #[serde(default)]
    pub(crate) headers: HashMap<String, String>,
    pub(crate) body: Option<Vec<u8>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NativeHttpResponse {
    pub(crate) status: u16,
    pub(crate) headers: HashMap<String, String>,
    pub(crate) body: Vec<u8>,
    pub(crate) signed_transport: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignedTransportNonceData {
    protocol: String,
    certificate_id: String,
    server_nonce: String,
    issued_at: String,
    last_accepted_sequence: u64,
}

#[derive(Debug, Deserialize)]
struct SignedTransportNonceEnvelope {
    ok: bool,
    data: SignedTransportNonceData,
}

fn native_http_url(value: &str) -> Result<reqwest::Url, String> {
    let url =
        reqwest::Url::parse(value).map_err(|error| format!("Invalid external URL: {error}"))?;
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
                IpAddr::V4(ip) => {
                    ip.is_private()
                        || ip.is_loopback()
                        || ip.is_link_local()
                        || ip.is_unspecified()
                        || ip.is_multicast()
                }
                IpAddr::V6(ip) => {
                    ip.is_loopback()
                        || ip.is_unspecified()
                        || ip.is_multicast()
                        || ip.is_unique_local()
                        || ip.is_unicast_link_local()
                }
            };
            if blocked && !local_debug_http {
                return Err("Private or local network targets are not allowed for native external requests.".to_string());
            }
        }
    }
    Ok(url)
}

async fn collect_native_response(
    response: reqwest::Response,
    signed_transport: bool,
    expected_sequence: Option<u64>,
) -> Result<NativeHttpResponse, String> {
    let status = response.status().as_u16();
    if response.content_length().unwrap_or(0) > 256 * 1024 * 1024 {
        return Err("External response exceeds the 256 MiB native safety boundary.".to_string());
    }
    let response_headers = response.headers().clone();
    let headers: HashMap<String, String> = response_headers
        .iter()
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.to_string(), value.to_string()))
        })
        .collect();
    let body = response
        .bytes()
        .await
        .map_err(|error| format!("Could not read native HTTP response: {error}"))?
        .to_vec();
    if body.len() > 256 * 1024 * 1024 {
        return Err("External response exceeds the 256 MiB native safety boundary.".to_string());
    }
    if let Some(sequence) = expected_sequence {
        signed_transport::validate_response_correlation(
            headers.get("x-lightbi-response-correlation").map(String::as_str),
            headers.get("x-lightbi-request-sequence").map(String::as_str),
            headers.get("x-lightbi-response-sha256").map(String::as_str),
            &body,
            sequence,
        )?;
    }
    Ok(NativeHttpResponse {
        status,
        headers,
        body,
        signed_transport,
    })
}

async fn signed_native_http_request(
    app: &AppHandle,
    url: reqwest::Url,
    method: reqwest::Method,
    mut headers: HashMap<String, String>,
    body: Option<Vec<u8>>,
    target: String,
    base: String,
) -> Result<NativeHttpResponse, String> {
    for reserved in [
        "x-lightbi-signed-transport",
        "x-lightbi-attestation-certificate",
        "x-lightbi-request-proof",
    ] {
        if headers
            .keys()
            .any(|name| name.eq_ignore_ascii_case(reserved))
        {
            return Err("signed_transport_reserved_header_forbidden".to_string());
        }
    }
    if matches!(method, reqwest::Method::GET | reqwest::Method::HEAD)
        && body.as_ref().is_some_and(|value| !value.is_empty())
    {
        return Err("signed_transport_read_body_forbidden".to_string());
    }
    let identity = installation_trust::load_signed_transport_identity(app).await?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(15))
        .user_agent("LightBI-Native-Signed/0.9")
        .build()
        .map_err(|error| format!("Could not initialize signed native HTTP client: {error}"))?;
    let nonce_response = client
        .post(format!("{base}/api/installation/trust/nonce"))
        .json(&serde_json::json!({ "certificate": identity.certificate.clone() }))
        .send()
        .await
        .map_err(|error| format!("Could not obtain signed-transport nonce: {error}"))?;
    if nonce_response.status() != reqwest::StatusCode::CREATED {
        return Err(format!(
            "Signed-transport nonce rejected (HTTP {}).",
            nonce_response.status().as_u16()
        ));
    }
    let nonce: SignedTransportNonceEnvelope = nonce_response
        .json()
        .await
        .map_err(|_| "Signed-transport nonce response is invalid.".to_string())?;
    if !nonce.ok
        || nonce.data.certificate_id != identity.certificate_id
        || nonce.data.server_nonce.is_empty()
        || nonce.data.issued_at.is_empty()
        || nonce.data.protocol != "lightbi.next-attestation-request.v1"
    {
        return Err("Signed-transport nonce identity mismatch.".to_string());
    }
    let sequence = nonce
        .data
        .last_accepted_sequence
        .checked_add(1)
        .ok_or_else(|| "signed_transport_sequence_exhausted".to_string())?;
    let raw_body = body.as_deref().unwrap_or(&[]);
    let proof = signed_transport::build_request_proof_v2(
        &identity.key_pair,
        &identity.certificate_id,
        method.as_str(),
        &target,
        &nonce.data.issued_at,
        sequence,
        &nonce.data.server_nonce,
        raw_body,
    )?;
    let certificate_header = URL_SAFE_NO_PAD.encode(
        serde_json::to_vec(&identity.certificate)
            .map_err(|_| "signed_transport_certificate_encode_failed".to_string())?,
    );
    let proof_header = URL_SAFE_NO_PAD.encode(
        serde_json::to_vec(&proof)
            .map_err(|_| "signed_transport_proof_encode_failed".to_string())?,
    );
    headers.insert(
        "x-lightbi-signed-transport".to_string(),
        signed_transport::REQUEST_SCHEMA_V2.to_string(),
    );
    headers.insert(
        "x-lightbi-attestation-certificate".to_string(),
        certificate_header,
    );
    headers.insert("x-lightbi-request-proof".to_string(), proof_header);
    let mut builder = client.request(method, url);
    for (name, value) in headers {
        let name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| format!("Invalid HTTP header name: {name}"))?;
        let value = reqwest::header::HeaderValue::from_str(&value)
            .map_err(|_| "Invalid HTTP header value.".to_string())?;
        builder = builder.header(name, value);
    }
    if let Some(body) = body {
        builder = builder.body(body);
    }
    let response = builder
        .send()
        .await
        .map_err(|error| format!("Signed native HTTP request failed: {error}"))?;
    collect_native_response(response, true, Some(sequence)).await
}

#[tauri::command]
pub(crate) async fn native_http_request(
    app: AppHandle,
    request: NativeHttpRequest,
) -> Result<NativeHttpResponse, String> {
    native_http_request_impl(Some(&app), request).await
}

pub(crate) async fn native_http_request_impl(
    app: Option<&AppHandle>,
    request: NativeHttpRequest,
) -> Result<NativeHttpResponse, String> {
    let url = native_http_url(&request.url)?;
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| "Unsupported HTTP method.".to_string())?;
    if !matches!(
        method,
        reqwest::Method::GET
            | reqwest::Method::POST
            | reqwest::Method::PUT
            | reqwest::Method::PATCH
            | reqwest::Method::DELETE
            | reqwest::Method::HEAD
    ) {
        return Err("Unsupported HTTP method.".to_string());
    }
    let base = installation_trust::next_distribution_api_base().ok();
    let target = if installation_trust::internal_build() {
        match base.as_deref() {
            Some(base) => signed_transport::canonical_next_api_target(&url, base)?,
            None => None,
        }
    } else {
        None
    };
    if let (Some(base), Some(target)) = (base, target) {
        let pathname = target.split('?').next().unwrap_or(&target);
        if signed_transport::signed_route_class(pathname)
            == signed_transport::SignedRouteClass::NativeProtected
        {
            let app = app.ok_or_else(|| "signed_transport_app_context_required".to_string())?;
            return signed_native_http_request(
                app,
                url,
                method,
                request.headers,
                request.body,
                target,
                base,
            )
            .await
            .map_err(|error| format!("Signed transport required: {error}"));
        }
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
    let response = builder
        .send()
        .await
        .map_err(|error| format!("Native HTTP request failed: {error}"))?;
    collect_native_response(response, false, None).await
}
