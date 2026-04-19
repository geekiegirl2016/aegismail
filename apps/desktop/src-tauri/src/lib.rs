use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
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

/// Candidate `.env`-style files the packaged and dev builds may read on
/// launch. First-match-wins semantics are applied by the caller.
///
/// Priority (highest first):
///   1. $AEGIS_ENV_FILE if set (explicit override, mostly for tests).
///   2. The user-writable production config at
///      `~/Library/Application Support/AegisMail/aegismail.env`.
///   3. A `.env` in the current working directory or any of its first
///      four ancestors — this makes `pnpm tauri:dev` pick up the
///      repo-root `.env` without any extra steps.
fn env_candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(explicit) = std::env::var_os("AEGIS_ENV_FILE") {
        let p = PathBuf::from(explicit);
        if p.is_file() {
            paths.push(p);
        }
    }

    if let Some(home) = std::env::var_os("HOME") {
        let user = PathBuf::from(&home)
            .join("Library/Application Support/AegisMail/aegismail.env");
        if user.is_file() {
            paths.push(user);
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        let mut dir: Option<&std::path::Path> = Some(cwd.as_path());
        for _ in 0..5 {
            let Some(current) = dir else { break };
            let candidate = current.join(".env");
            if candidate.is_file() {
                paths.push(candidate);
                break;
            }
            dir = current.parent();
        }
    }

    paths
}

/// Parse a dotenv-style KEY=VALUE file into a HashMap. Tolerates:
///   - comment lines starting with #
///   - blank lines
///   - optional surrounding whitespace
///   - optional single or double quotes around the value
/// Does NOT support variable interpolation, multi-line values, or
/// escape sequences. That's intentional — this is a secrets trough,
/// not a shell.
fn parse_env_file(contents: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let Some((raw_key, raw_value)) = trimmed.split_once('=') else {
            continue;
        };
        let key = raw_key.trim();
        if key.is_empty() {
            continue;
        }
        let mut value = raw_value.trim().to_string();
        if (value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\''))
        {
            if value.len() >= 2 {
                value = value[1..value.len() - 1].to_string();
            }
        }
        map.insert(key.to_string(), value);
    }
    map
}

fn load_user_env() -> HashMap<String, String> {
    let mut merged: HashMap<String, String> = HashMap::new();
    // Iterate in priority order: first file that defines a key wins.
    for path in env_candidate_paths() {
        let Ok(contents) = fs::read_to_string(&path) else { continue };
        for (k, v) in parse_env_file(&contents) {
            merged.entry(k).or_insert(v);
        }
    }
    merged
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

    let mut cmd = Command::new(&node_bin);
    cmd.arg(&entry)
        .current_dir(&server_dir)
        .env("NODE_ENV", "production")
        .env("AEGIS_LOG_LEVEL", "info")
        .env("AEGIS_SERVER_TOKEN", token);

    // Layer user-supplied AEGIS_* overrides on top. First match wins:
    // (1) the current process env, (2) ~/Library/.../aegismail.env.
    // We forward only AEGIS_ / NODE_ prefixed keys so a compromised
    // env file can't set arbitrary sensitive variables on the sidecar.
    let user_env = load_user_env();
    for (k, v) in user_env {
        if should_forward_key(&k) {
            cmd.env(k, v);
        }
    }
    for (k, v) in std::env::vars() {
        if k.starts_with("AEGIS_") && k != "AEGIS_SERVER_TOKEN" {
            cmd.env(k, v);
        }
    }

    let child = cmd
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("spawn: {e}"))?;

    Ok(child)
}

fn should_forward_key(key: &str) -> bool {
    key.starts_with("AEGIS_") && key != "AEGIS_SERVER_TOKEN"
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
