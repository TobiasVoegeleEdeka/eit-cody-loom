mod commands;

use commands::liquibase::{check_docker, generate_from_sql_dump, generate_from_ddl};
use commands::helm::generate_helm_values;
use commands::dependency_check::{check_pom_dependencies, generate_cyclonedx_sbom};
use commands::util::read_text_file;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
}