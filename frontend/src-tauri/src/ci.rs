use crate::commands::dependency_check::{check_pom_dependencies, generate_cyclonedx_sbom};
use std::process::exit;
use std::fs;
use std::path::Path;

pub fn run_ci(args: Vec<String>) {
    let scan_idx = args.iter().position(|r| r == "--scan");
    let path = if let Some(idx) = scan_idx {
        if args.len() > idx + 1 { args[idx + 1].clone() } else { ".".to_string() }
    } else { ".".to_string() };

    // Ordner "reports" sicherstellen
    let report_dir = "reports";
    let _ = if !Path::new(report_dir).exists() {
        fs::create_dir_all(report_dir).expect("Konnte Report-Ordner nicht erstellen")
    } else { () };

    let sbom_path = format!("{}/sbom.json", report_dir);

    println!("🔍 Cody Loom: Analysiere Projekt unter: {}", path);

    let rt = tokio::runtime::Runtime::new().unwrap();
    let exit_code = rt.block_on(async {
        let deps_result = check_pom_dependencies(path).await;
        
        match deps_result {
            Ok(deps) => {
                let has_vulns = deps.iter().any(|d| !d.vulnerabilities.is_empty());
                
                let _ = generate_cyclonedx_sbom(deps, sbom_path).await;
                
                println!("📄 SBOM wurde im Ordner '{}' gespeichert.", report_dir);

                if has_vulns {
                    println!("🚨 CI-Check fehlgeschlagen: Sicherheitslücken gefunden!");
                    1
                } else {
                    println!("✅ CI-Check bestanden.");
                    0
                }
            }
            Err(e) => {
                println!("❌ Kritischer Fehler beim Scan: {}", e);
                1
            }
        }
    });

    exit(exit_code);
}