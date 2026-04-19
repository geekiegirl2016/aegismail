use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, RunEvent, State};

const KEYCHAIN_SERVICE: &str = "com.aegismail.app";
const SERVER_TOKEN_ACCOUNT: &str = "__server_bearer_token__";

/// Holds the spawned server child so we can terminate it on app exit.
struct SidecarState(Mutex<Option<Child>>);

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Reads the AegisMail server bearer token from the macOS Keychain.
///
/// The token is minted and stored by the bundled server on first boot
/// under service="com.aegismail.app", account="__server_bearer_token__".
/// The OS keyring is the bridge between the sidecar process and the
/// frontend — no secrets cross the IPC boundary in plaintext.
#[tauri::command]
fn get_server_token() -> Result<String, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, SERVER_TOKEN_ACCOUNT)
        .map_err(|e| format!("keychain entry: {e}"))?;
    entry.get_password().map_err(|e| format!("keychain read: {e}"))
}

/// Spawn the bundled AegisMail server using its own Node runtime.
///
/// The packaged server lives at `<resource_dir>/resources/server/` and
/// is spawned as a plain child process (no Tauri shell plugin — less
/// surface area and no capability allowlist gymnastics).
fn spawn_server(app: &tauri::AppHandle) -> Result<Child, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource dir: {e}"))?;
    let server_dir = resource_dir.join("resources").join("server");
    let node_bin = server_dir.join("node");
    let entry = server_dir.join("dist").join("index.js");

    if !node_bin.exists() {
        return Err(format!("bundled node not found at {}", node_bin.display()));
    }
    if !entry.exists() {
        return Err(format!("server entry not found at {}", entry.display()));
    }

    let child = Command::new(&node_bin)
        .arg(&entry)
        .current_dir(&server_dir)
        .env("NODE_ENV", "production")
        .env("AEGIS_LOG_LEVEL", "info")
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("spawn: {e}"))?;

    Ok(child)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![app_version, get_server_token])
        .setup(|app| {
            let handle = app.handle().clone();
            let state = match spawn_server(&handle) {
                Ok(child) => SidecarState(Mutex::new(Some(child))),
                Err(err) => {
                    eprintln!("[aegismail] could not start bundled server: {err}");
                    SidecarState(Mutex::new(None))
                }
            };
            app.manage(state);

            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building AegisMail")
        .run(|app_handle, event| {
            if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
                let state: State<SidecarState> = app_handle.state();
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        });
}
