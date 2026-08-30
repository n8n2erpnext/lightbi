//! Behavior-preserving server ownership split.

use super::*;

#[derive(Deserialize, Debug)]
pub(super) struct OnlineExcelFetchRequest {
    url: String,
}

#[derive(Deserialize, Debug)]
pub(super) struct OnlineCsvFetchRequest {
    url: String,
}

#[derive(Debug)]
struct OnlineExcelFetchError {
    status: StatusCode,
    message: String,
}

fn is_allowed_microsoft_excel_host(host: &str) -> bool {
    let host = host.to_ascii_lowercase();
    host == "1drv.ms"
        || host == "onedrive.live.com"
        || host.ends_with(".sharepoint.com")
        || host == "office.com"
        || host.ends_with(".office.com")
        || host == "my.microsoftpersonalcontent.com"
}

fn normalize_html_url(raw: &str) -> String {
    raw.replace("\\u0026", "&")
        .replace("&amp;", "&")
        .replace("\\/", "/")
}

fn extract_download_url(html: &str) -> Option<String> {
    let marker = "https://my.microsoftpersonalcontent.com/";
    let start = html.find(marker)?;
    let rest = &html[start..];
    let end = rest
        .find(|ch: char| ch == '"' || ch == '\'' || ch == '<' || ch.is_whitespace())
        .unwrap_or(rest.len());
    let candidate = normalize_html_url(&rest[..end]);
    if candidate.contains("/download.aspx") && candidate.contains("tempauth=") {
        Some(candidate)
    } else {
        None
    }
}

async fn fetch_microsoft_excel_bytes(url: &str) -> Result<Vec<u8>, OnlineExcelFetchError> {
    let parsed = reqwest::Url::parse(url).map_err(|_| OnlineExcelFetchError {
        status: StatusCode::BAD_REQUEST,
        message: "Invalid Microsoft 365 Excel URL.".to_string(),
    })?;

    let host = parsed.host_str().unwrap_or_default();
    if !is_allowed_microsoft_excel_host(host) {
        return Err(OnlineExcelFetchError {
            status: StatusCode::BAD_REQUEST,
            message: "Only Microsoft 365 Excel links from OneDrive, SharePoint, or Office are supported here.".to_string(),
        });
    }

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36")
        .build()
        .map_err(|error| OnlineExcelFetchError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("Could not initialize Microsoft 365 connector: {error}"),
        })?;

    let response = client
        .get(parsed.clone())
        .header(
            header::ACCEPT,
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .send()
        .await
        .map_err(|error| OnlineExcelFetchError {
            status: StatusCode::BAD_GATEWAY,
            message: format!("Could not reach Microsoft 365 Excel link: {error}"),
        })?;

    let status = response.status();
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();

    if !status.is_success() {
        return Err(OnlineExcelFetchError {
            status: if status == StatusCode::FORBIDDEN || status == StatusCode::UNAUTHORIZED {
                StatusCode::FORBIDDEN
            } else {
                StatusCode::BAD_GATEWAY
            },
            message: format!("Microsoft 365 returned {status}. The workbook may require sign-in or sharing may be disabled."),
        });
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|error| OnlineExcelFetchError {
            status: StatusCode::BAD_GATEWAY,
            message: format!("Could not read Microsoft 365 response: {error}"),
        })?;

    let is_excel = content_type.contains("spreadsheet")
        || content_type.contains("excel")
        || bytes.starts_with(b"PK\x03\x04");
    if is_excel {
        return Ok(bytes.to_vec());
    }

    let html = String::from_utf8_lossy(&bytes);
    let Some(download_url) = extract_download_url(&html) else {
        return Err(OnlineExcelFetchError {
            status: StatusCode::FORBIDDEN,
            message: "Microsoft 365 opened the viewer, but did not expose a temporary workbook download URL. The file may require sign-in or download may be disabled.".to_string(),
        });
    };

    let download_host = reqwest::Url::parse(&download_url)
        .ok()
        .and_then(|url| url.host_str().map(str::to_string))
        .unwrap_or_default();
    if !is_allowed_microsoft_excel_host(&download_host) {
        return Err(OnlineExcelFetchError {
            status: StatusCode::FORBIDDEN,
            message: "Microsoft 365 returned an unsupported download host.".to_string(),
        });
    }

    let download = client
        .get(download_url)
        .header(
            header::ACCEPT,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*",
        )
        .send()
        .await
        .map_err(|error| OnlineExcelFetchError {
            status: StatusCode::BAD_GATEWAY,
            message: format!("Could not download Microsoft 365 workbook: {error}"),
        })?;

    let download_status = download.status();
    if !download_status.is_success() {
        return Err(OnlineExcelFetchError {
            status: if download_status == StatusCode::FORBIDDEN
                || download_status == StatusCode::UNAUTHORIZED
            {
                StatusCode::FORBIDDEN
            } else {
                StatusCode::BAD_GATEWAY
            },
            message: format!("Microsoft 365 workbook download returned {download_status}."),
        });
    }

    let workbook = download
        .bytes()
        .await
        .map_err(|error| OnlineExcelFetchError {
            status: StatusCode::BAD_GATEWAY,
            message: format!("Could not read Microsoft 365 workbook: {error}"),
        })?;

    if !workbook.starts_with(b"PK\x03\x04") {
        return Err(OnlineExcelFetchError {
            status: StatusCode::BAD_GATEWAY,
            message: "Microsoft 365 did not return an Excel workbook.".to_string(),
        });
    }

    Ok(workbook.to_vec())
}

pub(super) async fn fetch_online_excel(
    Json(request): Json<OnlineExcelFetchRequest>,
) -> impl IntoResponse {
    match fetch_microsoft_excel_bytes(&request.url).await {
        Ok(bytes) => {
            let mut headers = HeaderMap::new();
            headers.insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ),
            );
            headers.insert(
                header::CONTENT_DISPOSITION,
                HeaderValue::from_static("attachment; filename=\"lightbi-online-workbook.xlsx\""),
            );
            (StatusCode::OK, headers, bytes).into_response()
        }
        Err(error) => (
            error.status,
            Json(json!({
                "status": "error",
                "message": error.message
            })),
        )
            .into_response(),
    }
}

fn is_allowed_online_csv_host(host: &str) -> bool {
    matches!(host.to_ascii_lowercase().as_str(), "docs.google.com")
}

pub(super) async fn fetch_online_csv(
    Json(request): Json<OnlineCsvFetchRequest>,
) -> impl IntoResponse {
    let parsed = match reqwest::Url::parse(&request.url) {
        Ok(url) if url.scheme() == "https" => url,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "status": "error", "message": "Online CSV URL must use HTTPS." })),
            )
                .into_response()
        }
    };
    if !is_allowed_online_csv_host(parsed.host_str().unwrap_or_default()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "status": "error", "message": "This online CSV host is not supported by the secure connector." })),
        ).into_response();
    }

    let client = match reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("LightBI/0.9 Google-Sheets-Connector")
        .build()
    {
        Ok(client) => client,
        Err(error) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "status": "error", "message": format!("Could not initialize online connector: {error}") })),
        ).into_response(),
    };
    let response = match client.get(parsed).header(header::ACCEPT, "text/csv,*/*").send().await {
        Ok(response) => response,
        Err(error) => return (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "status": "error", "message": format!("Could not reach online source: {error}") })),
        ).into_response(),
    };
    let status = response.status();
    if !status.is_success() {
        let app_status = if status == StatusCode::FORBIDDEN || status == StatusCode::UNAUTHORIZED {
            StatusCode::FORBIDDEN
        } else {
            StatusCode::BAD_GATEWAY
        };
        return (
            app_status,
            Json(json!({ "status": "error", "message": format!("Online source returned {status}. Check that the sheet is shared for link access.") })),
        ).into_response();
    }
    match response.bytes().await {
        Ok(bytes) => {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("text/csv; charset=utf-8"));
            headers.insert(header::CONTENT_DISPOSITION, HeaderValue::from_static("attachment; filename=\"lightbi-online-source.csv\""));
            (StatusCode::OK, headers, bytes).into_response()
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "status": "error", "message": format!("Could not read online source: {error}") })),
        ).into_response(),
    }
}
