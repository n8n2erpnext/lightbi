use serde::Serialize;
use std::sync::Mutex;
use std::thread::JoinHandle;
use std::time::{Duration, Instant};
use tauri::{Manager, State};

const API_BASE_URL: &str = "http://127.0.0.1:5172";
const API_BIND_ADDRESS: &str = "127.0.0.1:5172";

struct EmbeddedBackend(Mutex<Option<JoinHandle<Result<(), String>>>>);

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
fn backend_status(state: State<'_, EmbeddedBackend>) -> bool {
    let running = state
        .0
        .lock()
        .map(|guard| guard.as_ref().is_some_and(|thread| !thread.is_finished()))
        .unwrap_or(false);
    running
        && std::net::TcpStream::connect_timeout(
            &API_BIND_ADDRESS.parse().expect("valid loopback address"),
            Duration::from_millis(200),
        )
        .is_ok()
}

fn spawn_embedded_backend(app: &tauri::AppHandle) -> Result<JoinHandle<Result<(), String>>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve the LightBI data directory: {error}"))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Could not create the LightBI data directory: {error}"))?;
    std::env::set_var("LIGHTBI_DATA_DIR", data_dir);
    let thread = std::thread::Builder::new()
        .name("lightbi-embedded-core".to_string())
        .spawn(|| {
            let runtime = tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
                .map_err(|error| format!("Could not initialize the embedded LightBI runtime: {error}"))?;
            runtime
                .block_on(lightbi_server::run(API_BIND_ADDRESS))
                .map_err(|error| format!("Embedded LightBI core stopped: {error}"))
        })
        .map_err(|error| format!("Could not start the embedded LightBI core: {error}"))?;
    let deadline = Instant::now() + Duration::from_secs(15);
    while Instant::now() < deadline {
        if thread.is_finished() {
            return match thread.join() {
                Ok(Err(error)) => Err(error),
                Ok(Ok(())) => Err("The embedded LightBI core stopped before becoming ready.".to_string()),
                Err(_) => Err("The embedded LightBI core panicked during startup.".to_string()),
            };
        }
        if std::net::TcpStream::connect_timeout(
            &API_BIND_ADDRESS.parse().expect("valid loopback address"),
            Duration::from_millis(200),
        )
        .is_ok()
        {
            return Ok(thread);
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    Err("The embedded LightBI core did not become ready in time.".to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let thread = spawn_embedded_backend(app.handle())?;
            app.manage(EmbeddedBackend(Mutex::new(Some(thread))));
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
