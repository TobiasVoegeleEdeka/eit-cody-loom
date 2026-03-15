mod commands;
mod ci;

use commands::liquibase::{check_docker, generate_from_sql_dump, generate_from_ddl};
use commands::helm::generate_helm_values;
use commands::dependency_check::{check_pom_dependencies, generate_cyclonedx_sbom};
use commands::util::read_text_file;
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = env::args().collect();
    let is_ci = if args.contains(&"--ci".to_string()) { true } else { false };

    let _ = if is_ci {
        ci::run_ci(args);
        true
    } else {
        tauri::Builder::default()
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .invoke_handler(tauri::generate_handler![
                check_docker,
                generate_from_sql_dump,
                generate_from_ddl,
                generate_helm_values,
                check_pom_dependencies,
                generate_cyclonedx_sbom,
                read_text_file
            ])
            .run(tauri::generate_context!())
            .expect("Fehler beim Starten der Tauri App");
        false
    };
}