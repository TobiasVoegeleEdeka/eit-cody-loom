use crate::commands::dependency_check::{check_pom_dependencies, generate_cyclonedx_sbom};
use std::process::exit;
use std::fs;
use std::path::Path;

pub fn run_ci(args: Vec<String>) {
    let scan_idx = args.iter().position(|r| r == "--scan");
    let path = if let Some(idx) = scan_idx {
        if args.len() > idx + 1 { args[idx + 1].clone() } else { ".".to_string() }
    } else { ".".to_string() };

    let report_dir = "reports";
    let _ = if !Path::new(report_dir).exists() {
        fs::create_dir_all(report_dir).expect("Konnte Report-Ordner nicht erstellen")
    } else { () };

    let sbom_path = format!("{}/sbom.json", report_dir);

    println!("\n{}", "=".repeat(60));
    println!("🚀 CODY LOOM | SECURITY PIPELINE");
    println!("{}", "=".repeat(60));
    println!("Target: {}", path);

    let rt = tokio::runtime::Runtime::new().unwrap();
    let (exit_code, message) = rt.block_on(async {
        match check_pom_dependencies(path).await {
            Ok(deps) => {
                let has_vulns = deps.iter().any(|d| !d.vulnerabilities.is_empty());
                
                let _ = generate_cyclonedx_sbom(deps, sbom_path).await;
                
                if has_vulns {
                    (1, "❌ STATUS: CRITICAL - Vulnerabilities detected!")
                } else {
                    (0, "✅ STATUS: SUCCESS - No vulnerabilities found.")
                }
            }
            Err(_) => (1, "❌ STATUS: ERROR - Scan failed.")
        }
    });

    println!("{}", message);
    println!("Report: reports/sbom.json");
    println!("{}\n", "=".repeat(60));

    exit(exit_code);
}