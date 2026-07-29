use serde::Serialize;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, State};

const API_BASE_URL: &str = "http://127.0.0.1:5172";

struct BackendProcess(Mutex<Option<Child>>);

impl Drop for BackendProcess {
    fn drop(&mut self) {
        if let Ok(child) = self.0.get_mut() {
            if let Some(child) = child.as_mut() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

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
fn backend_status(state: State<'_, BackendProcess>) -> bool {
    state.0.lock().map(|guard| guard.is_some()).unwrap_or(false)
}

fn backend_candidates(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let executable_name = if cfg!(windows) {
        "lightbi-server.exe"
    } else {
        "lightbi-server"
    };
    let mut candidates = Vec::new();
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(directory) = current_exe.parent() {
            candidates.push(directory.join(executable_name));
            candidates.push(directory.join("bin").join(executable_name));
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(executable_name));
        candidates.push(resource_dir.join("bin").join(executable_name));
    }
    candidates
}

fn spawn_backend(app: &tauri::AppHandle) -> Result<Child, String> {
    let executable = backend_candidates(app)
        .into_iter()
        .find(|candidate| candidate.is_file())
        .ok_or_else(|| "The bundled LightBI analysis engine was not found.".to_string())?;
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve the LightBI data directory: {error}"))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Could not create the LightBI data directory: {error}"))?;
    let mut command = Command::new(executable);
    command
        .env("LIGHTBI_BIND_ADDR", "127.0.0.1:5172")
        .env("LIGHTBI_DATA_DIR", data_dir);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command
        .spawn()
        .map_err(|error| format!("Could not start the LightBI analysis engine: {error}"))?;
    let deadline = Instant::now() + Duration::from_secs(15);
    while Instant::now() < deadline {
        if std::net::TcpStream::connect_timeout(
            &"127.0.0.1:5172".parse().expect("valid loopback address"),
            Duration::from_millis(200),
        )
        .is_ok()
        {
            return Ok(child);
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    let _ = child.kill();
    let _ = child.wait();
    Err("The LightBI analysis engine did not become ready in time.".to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let child = spawn_backend(app.handle())?;
            app.manage(BackendProcess(Mutex::new(Some(child))));
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
