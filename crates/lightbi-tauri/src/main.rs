#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{body::Body, Router};
use http_body_util::BodyExt;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use tower::ServiceExt;

#[cfg(target_os = "windows")]
const API_BASE_URL: &str = "http://lightbi.localhost";
#[cfg(not(target_os = "windows"))]
const API_BASE_URL: &str = "lightbi://localhost";

#[derive(Clone)]
struct InProcessCore {
    runtime: Arc<tokio::runtime::Runtime>,
    router: Router,
}

#[derive(Clone)]
struct EmbeddedCore(Arc<Mutex<Option<InProcessCore>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeConfig {
    api_base_url: &'static str,
    product_channel: &'static str,
    native: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseState {
    edition: &'static str,
    status: &'static str,
    key_required: bool,
    feature_restrictions: Vec<&'static str>,
}

#[tauri::command]
fn runtime_config() -> RuntimeConfig {
    RuntimeConfig {
        api_base_url: API_BASE_URL,
        product_channel: "beta",
        native: true,
    }
}

#[tauri::command]
fn license_state() -> LicenseState {
    LicenseState {
        edition: "LightBI Beta",
        status: "beta_unrestricted",
        key_required: false,
        feature_restrictions: Vec::new(),
    }
}

#[tauri::command]
fn backend_status(state: State<'_, EmbeddedCore>) -> bool {
    state.0.lock().map(|core| core.is_some()).unwrap_or(false)
}

fn error_response(status: u16, message: &str) -> tauri::http::Response<Vec<u8>> {
    tauri::http::Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .header("access-control-allow-origin", "*")
        .body(format!(r#"{{"error":{}}}"#, serde_json::to_string(message).unwrap()).into_bytes())
        .expect("valid LightBI error response")
}

fn main() {
    let embedded_core = EmbeddedCore(Arc::new(Mutex::new(None)));
    let protocol_core = embedded_core.clone();
    let setup_core = embedded_core.clone();

    tauri::Builder::default()
        .register_asynchronous_uri_scheme_protocol("lightbi", move |_context, request, responder| {
            let core = protocol_core
                .0
                .lock()
                .ok()
                .and_then(|guard| guard.as_ref().cloned());
            let Some(core) = core else {
                responder.respond(error_response(503, "LightBI core is not ready."));
                return;
            };

            let request = request.map(Body::from);
            core.runtime.spawn(async move {
                let response = match core.router.oneshot(request).await {
                    Ok(response) => response,
                    Err(error) => {
                        responder.respond(error_response(500, &format!("LightBI core request failed: {error}")));
                        return;
                    }
                };
                let (parts, body) = response.into_parts();
                let bytes = match body.collect().await {
                    Ok(collected) => collected.to_bytes().to_vec(),
                    Err(error) => {
                        responder.respond(error_response(500, &format!("LightBI core response failed: {error}")));
                        return;
                    }
                };
                let mut builder = tauri::http::Response::builder().status(parts.status);
                for (name, value) in &parts.headers {
                    builder = builder.header(name, value);
                }
                match builder.body(bytes) {
                    Ok(response) => responder.respond(response),
                    Err(error) => responder.respond(error_response(500, &format!("LightBI response could not be built: {error}"))),
                }
            });
        })
        .setup(move |app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| format!("Could not resolve the LightBI data directory: {error}"))?;
            std::fs::create_dir_all(&data_dir)
                .map_err(|error| format!("Could not create the LightBI data directory: {error}"))?;
            std::env::set_var("LIGHTBI_DATA_DIR", data_dir);

            let runtime = Arc::new(
                tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .map_err(|error| format!("Could not initialize the embedded LightBI runtime: {error}"))?,
            );
            let router = runtime.block_on(lightbi_server::build_router());
            *setup_core
                .0
                .lock()
                .map_err(|_| "Could not initialize the LightBI core state.".to_string())? =
                Some(InProcessCore { runtime, router });
            app.manage(setup_core.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_config,
            license_state,
            backend_status
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LightBI desktop shell");
}
