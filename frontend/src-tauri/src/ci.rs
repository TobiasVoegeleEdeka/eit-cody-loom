use crate::commands::dependency_check::{check_pom_dependencies, generate_cyclonedx_sbom};
use std::process::exit;
use std::fs;
use std::path::Path;

/// Führt Cody Loom im Headless-Modus für CI/CD-Pipelines aus.
///
/// Diese Funktion wird getriggert, wenn das Tool mit dem `--ci` Flag aufgerufen wird. 
/// Sie arbeitet synchron als Wrapper um die asynchronen Scan-Prozesse, wertet die 
/// gefundenen Abhängigkeiten aus, schreibt einen Report und beendet die Anwendung 
/// mit Pipeline-kompatiblen Exit-Codes.
///
/// # Argumente
/// * `args` - Ein Vektor der Kommandozeilenargumente (z.B. `std::env::args().collect()`).
///
/// # Ablauf
/// 1. **Pfad-Extraktion**: Sucht das `--scan` Argument. Fehlt der Pfad, wird das aktuelle Verzeichnis (`.`) genutzt.
/// 2. **Report-Setup**: Erstellt automatisch den Zielordner `reports/` für die Artefakte.
/// 3. **Analyse**: Startet eine Tokio-Runtime, um den asynchronen OSV-Scan durchzuführen.
/// 4. **Export**: Speichert die Ergebnisse im CycloneDX-Format als `sbom.json`.
/// 5. **Terminierung**: 
///    - Gibt `0` zurück, wenn alles sicher ist.
///    - Gibt `1` zurück, wenn Schwachstellen gefunden wurden oder ein Fehler auftrat.
pub fn run_ci(args: Vec<String>) {
    // Ermittelt den Zielpfad anhand des --scan Flags. 
    // saubere Zuweisung mit if-else Expressions
    let scan_idx = args.iter().position(|r| r == "--scan");
    let path = if let Some(idx) = scan_idx {
        if args.len() > idx + 1 { args[idx + 1].clone() } else { ".".to_string() }
    } else { ".".to_string() };

    // Stellt sicher, dass das Ausgabe-Verzeichnis für Pipeline-Artefakte existiert.
    let report_dir = "reports";
    let _ = if !Path::new(report_dir).exists() {
        fs::create_dir_all(report_dir).expect("Konnte Report-Ordner nicht erstellen")
    } else { () };

    let sbom_path = format!("{}/sbom.json", report_dir);

    // Visuelles Framing für die CI/CD-Log-Ausgabe (z.B. in GitHub Actions)
    println!("\n{}", "=".repeat(60));
    println!("🚀 CODY LOOM | SECURITY PIPELINE");
    println!("{}", "=".repeat(60));
    println!("Target: {}", path);

    // Initialisiert die asynchrone Laufzeitumgebung, da Tauri in der main() 
    // im CI-Modus blockiert werden muss, bis der Scan abgeschlossen ist.
    let rt = tokio::runtime::Runtime::new().unwrap();
    let (exit_code, message) = rt.block_on(async {
        match check_pom_dependencies(path).await {
            Ok(deps) => {
                let has_vulns = deps.iter().any(|d| !d.vulnerabilities.is_empty());
                
                // SBOM wird in jedem Fall erzeugt (auch wenn das Projekt sicher ist),
                // um als Nachweis in der Pipeline zu dienen.
                let _ = generate_cyclonedx_sbom(deps, sbom_path).await;
                
                // Setzt den passenden Exit-Code und die finale Statusmeldung.
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

    // Beendet den Rust-Prozess hart. Dadurch wird der korrekte Status-Code an 
    // das Betriebssystem bzw. den CI-Runner (z.B. GitHub Actions) übergeben.
    exit(exit_code);
}