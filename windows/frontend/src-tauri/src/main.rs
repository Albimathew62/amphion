// Hide the console window in release builds (keep it in debug for logs).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Holds the spawned Python backend so we can terminate it on exit.
struct Backend(Mutex<Option<CommandChild>>);

/// Kill the backend and its whole process tree.
///
/// The PyInstaller one-file exe is a bootloader that spawns a *child* process
/// running the actual uvicorn server, so killing only the direct child would
/// leave an orphaned backend holding port 8000. `taskkill /T` kills the tree.
fn stop_backend(app: &tauri::AppHandle) {
    if let Some(child) = app.state::<Backend>().0.lock().unwrap().take() {
        let pid = child.pid();
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
        }
        let _ = child.kill();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Backend(Mutex::new(None)))
        .setup(|app| {
            let sidecar = app
                .shell()
                .sidecar("amphion-backend")
                .expect("amphion-backend sidecar is not configured")
                .env("AMPHION_HOST", "127.0.0.1")
                .env("AMPHION_PORT", "8000");

            let (mut rx, child) = sidecar.spawn().expect("failed to start backend sidecar");
            app.state::<Backend>().0.lock().unwrap().replace(child);

            // Drain the sidecar's stdout/stderr so its pipe never fills and blocks.
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Terminated(_) = event {
                        break;
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Amphion")
        .run(|app_handle, event| match event {
            RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                stop_backend(app_handle);
            }
            _ => {}
        });
}
