use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;
use tauri::{Manager, RunEvent};

struct SidecarState(Mutex<Option<Child>>);

/// Random per-launch bearer token. Desktop shell mints it, hands it to
/// the sidecar via the AEGIS_SERVER_TOKEN env var, and returns the same
/// value to the frontend via `get_server_token`.
///
/// Keeping the token in-process (not Keychain) avoids the
/// "X wants to access your Keychain" authorization prompt the OS would
/// otherwise raise every time the unsigned app bundle spawns its
/// sidecar. Per-account iCloud passwords still live in the Keychain —
/// those prompts are expected and user-initiated.
struct ServerToken(String);

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[tauri::command]
fn get_server_token(state: tauri::State<'_, ServerToken>) -> String {
    state.0.clone()
}

fn mint_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Spawn the bundled AegisMail server using its own Node runtime.
fn spawn_server(app: &tauri::AppHandle, token: &str) -> Result<Child, String> {
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
        .env("AEGIS_SERVER_TOKEN", token)
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("spawn: {e}"))?;

    Ok(child)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let token = mint_token();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ServerToken(token.clone()))
        .invoke_handler(tauri::generate_handler![app_version, get_server_token])
        .setup(move |app| {
            let handle = app.handle().clone();
            let state = match spawn_server(&handle, &token) {
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
                let state = app_handle.state::<SidecarState>();
                let maybe_child = state.0.lock().ok().and_then(|mut guard| guard.take());
                if let Some(mut child) = maybe_child {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}
