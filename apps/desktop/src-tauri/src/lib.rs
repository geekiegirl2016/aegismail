use tauri::Manager;

const KEYCHAIN_SERVICE: &str = "com.aegismail.app";
const SERVER_TOKEN_ACCOUNT: &str = "__server_bearer_token__";

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Reads the AegisMail server bearer token from the macOS Keychain.
///
/// The token is minted and stored by the Node server on first boot under
/// service="com.aegismail.app", account="__server_bearer_token__". The
/// Keychain entry is the same one the server writes, so no additional
/// sharing mechanism is needed — the OS is the bridge.
#[tauri::command]
fn get_server_token() -> Result<String, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, SERVER_TOKEN_ACCOUNT)
        .map_err(|e| format!("keychain entry: {e}"))?;
    entry.get_password().map_err(|e| format!("keychain read: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![app_version, get_server_token])
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AegisMail");
}
