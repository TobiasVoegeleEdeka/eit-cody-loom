use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use roxmltree::Document;
use tauri::command;

#[derive(Serialize, Deserialize, Debug)]
pub struct DependencyInfo {
    pub module_name: String,
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub latest_version: Option<String>,
    pub vulnerabilities: Vec<Vulnerability>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Vulnerability {
    pub id: String,
    pub summary: Option<String>,
    pub details: Option<String>,
    pub severity: String,
}

#[derive(Deserialize)]
struct OsvResponse {
    vulns: Option<Vec<OsvVuln>>,
}

#[derive(Deserialize)]
struct OsvVuln {
    id: String,
    summary: Option<String>,
    details: Option<String>,
}

fn find_poms(dir: &Path, poms: &mut Vec<PathBuf>) {
    let _ = if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let _ = if path.is_dir() {
                find_poms(&path, poms);
                true
            } else {
                let _ = if path.file_name().and_then(|n| n.to_str()) == Some("pom.xml") {
                    poms.push(path);
                    true
                } else { false };
                true
            };
        }
        true
    } else { false };
}

#[command]
pub async fn check_pom_dependencies(file_path: String) -> Result<Vec<DependencyInfo>, String> {
    let mut dependencies_map = HashMap::new();
    let mut maven_success = false;

    // 1. Versuch: Der Host-System Maven Cheat (Transitive Dependencies auflösen)
    let mvn_output = Command::new("mvn")
        .args(["dependency:list", "-B", "-f", &file_path])
        .output();

    let _ = if let Ok(output) = mvn_output {
        let _ = if output.status.success() {
            maven_success = true;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut current_module = "root".to_string();

            for line in stdout.lines() {
                let trimmed = line.trim();
                
                let _ = if trimmed.starts_with("[INFO] Building ") {
                    current_module = trimmed.replace("[INFO] Building ", "").split(' ').next().unwrap_or("root").to_string();
                    true
                } else if trimmed.starts_with("[INFO]") && trimmed.chars().filter(|c| *c == ':').count() >= 4 {
                    // Parsen der Zeile: [INFO]    groupId:artifactId:type:version:scope
                    let dep_str = trimmed.replace("[INFO]", "").trim().to_string();
                    let parts: Vec<&str> = dep_str.split(':').collect();

                    let _ = if parts.len() >= 5 {
                        let group_id = parts[0].trim();
                        let artifact_id = parts[1].trim();
                        // Version ist immer das vorletzte Element (egal ob Classifier dazwischen ist oder nicht)
                        let version = parts[parts.len() - 2].trim();
                        
                        let dep_key = format!("{}:{}", group_id, artifact_id);
                        let map_key = format!("{}|{}", current_module, dep_key);
                        
                        dependencies_map.insert(map_key, DependencyInfo {
                            module_name: current_module.clone(),
                            group_id: group_id.to_string(),
                            artifact_id: artifact_id.to_string(),
                            version: version.to_string(),
                            latest_version: None,
                            vulnerabilities: Vec::new(),
                        });
                        true
                    } else { false };
                    true
                } else { false };
            }
            true
        } else { false };
        true
    } else { false };

    // 2. Fallback: Reines XML Static-Parsing (falls Maven fehlt oder fehlschlägt)
    let _ = if !maven_success || dependencies_map.is_empty() {
        let root_path = Path::new(&file_path);
        let search_dir = if root_path.is_dir() { root_path } else { root_path.parent().unwrap_or(Path::new("")) };
        
        let mut pom_files = Vec::new();
        find_poms(search_dir, &mut pom_files);

        let mut properties = HashMap::new();
        let mut managed_deps = HashMap::new();
        let mut parsed_docs = Vec::new();

        for pom_path in &pom_files {
            let module_name = pom_path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("root").to_string();

            let _ = if let Ok(content) = fs::read_to_string(pom_path) {
                let _ = if let Ok(doc) = Document::parse(&content) {
                    for prop_node in doc.descendants().filter(|n| n.has_tag_name("properties")).flat_map(|n| n.children()) {
                        let _ = if prop_node.is_element() {
                            properties.insert(prop_node.tag_name().name().to_string(), prop_node.text().unwrap_or("").to_string());
                            true
                        } else { false };
                    }

                    for m_dep in doc.descendants().filter(|n| n.has_tag_name("dependencyManagement")).flat_map(|n| n.descendants().filter(|d| d.has_tag_name("dependency"))) {
                        let g_id = m_dep.children().find(|n| n.has_tag_name("groupId")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                        let a_id = m_dep.children().find(|n| n.has_tag_name("artifactId")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                        let v = m_dep.children().find(|n| n.has_tag_name("version")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                        
                        let _ = if !g_id.is_empty() && !a_id.is_empty() && !v.is_empty() {
                            managed_deps.insert(format!("{}:{}", g_id, a_id), v.to_string());
                            true
                        } else { false };
                    }
                    
                    parsed_docs.push((module_name, content));
                    true
                } else { false };
                true
            } else { false };
        }

        for (module_name, content) in &parsed_docs {
            let doc = Document::parse(content).unwrap();
            
            for dep in doc.descendants().filter(|n| n.has_tag_name("dependency") && !n.ancestors().any(|a| a.has_tag_name("dependencyManagement"))) {
                let group_id = dep.children().find(|n| n.has_tag_name("groupId")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                let artifact_id = dep.children().find(|n| n.has_tag_name("artifactId")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                let raw_version = dep.children().find(|n| n.has_tag_name("version")).map(|n| n.text().unwrap_or("")).unwrap_or("");

                let _ = if !group_id.is_empty() && !artifact_id.is_empty() {
                    let dep_key = format!("{}:{}", group_id, artifact_id);
                    let map_key = format!("{}|{}", module_name, dep_key);
                    
                    let resolved_managed = if raw_version.is_empty() { managed_deps.get(&dep_key).map(|s| s.as_str()).unwrap_or("unknown") } else { raw_version };
                    let final_version = if resolved_managed.starts_with("${") && resolved_managed.ends_with("}") {
                        let prop_key = &resolved_managed[2..resolved_managed.len() - 1];
                        properties.get(prop_key).map(|s| s.as_str()).unwrap_or(resolved_managed)
                    } else { resolved_managed };

                    dependencies_map.insert(map_key, DependencyInfo {
                        module_name: module_name.clone(),
                        group_id: group_id.to_string(),
                        artifact_id: artifact_id.to_string(),
                        version: final_version.to_string(),
                        latest_version: None,
                        vulnerabilities: Vec::new(),
                    });
                    true
                } else { false };
            }
        }
        true
    } else { false };

    // 3. Vulnerability und Latest Version Check (Gilt für Maven-Output UND Fallback gleichermaßen)
    let dependencies: Vec<DependencyInfo> = dependencies_map.into_values().collect();
    let client = reqwest::Client::new();
    let mut results = Vec::new();

    for mut dep in dependencies {
        let _ = if dep.version != "unknown" {
            let osv_query = serde_json::json!({
                "version": dep.version,
                "package": {
                    "name": format!("{}:{}", dep.group_id, dep.artifact_id),
                    "ecosystem": "Maven"
                }
            });

            let _ = if let Ok(resp) = client.post("https://api.osv.dev/v1/query").json(&osv_query).send().await {
                let _ = if let Ok(osv_resp) = resp.json::<OsvResponse>().await {
                    let _ = if let Some(vulns) = osv_resp.vulns {
                        for v in vulns {
                            dep.vulnerabilities.push(Vulnerability {
                                id: v.id,
                                summary: v.summary,
                                details: v.details,
                                severity: "CRITICAL".to_string(),
                            });
                        }
                        true
                    } else { false };
                    true
                } else { false };
                true
            } else { false };
            true
        } else { false };

        let maven_url = format!("https://search.maven.org/solrsearch/select?q=g:{} AND a:{}&rows=1&wt=json", dep.group_id, dep.artifact_id);
        
        let _ = if let Ok(resp) = client.get(&maven_url).send().await {
            let _ = if let Ok(json) = resp.json::<serde_json::Value>().await {
                let _ = if let Some(latest) = json["response"]["docs"][0]["latestVersion"].as_str() {
                    dep.latest_version = Some(latest.to_string());
                    true
                } else { false };
                true
            } else { false };
            true
        } else { false };

        results.push(dep);
    }

    Ok(results)
}

#[command]
pub async fn generate_cyclonedx_sbom(dependencies: Vec<DependencyInfo>, save_path: String) -> Result<String, String> {
    let mut components = Vec::new();
    let mut vulnerabilities = Vec::new();

    for dep in dependencies {
        let purl = format!("pkg:maven/{}/{}@{}", dep.group_id, dep.artifact_id, dep.version);

        components.push(serde_json::json!({
            "type": "library",
            "bom-ref": &purl,
            "name": dep.artifact_id,
            "group": dep.group_id,
            "version": dep.version,
            "purl": &purl
        }));

        if !dep.vulnerabilities.is_empty() {
            for vuln in dep.vulnerabilities {
                vulnerabilities.push(serde_json::json!({
                    "bom-ref": &purl, 
                    "id": vuln.id,
                    "description": vuln.summary.unwrap_or_else(|| "No description available".to_string()),
                    "detail": vuln.details.unwrap_or_else(|| "".to_string()),
                    "ratings": [{
                        "severity": vuln.severity.to_lowercase()
                    }]
                }));
            }
        }
    }

    let sbom = serde_json::json!({
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "version": 1,
        "components": components,
        "vulnerabilities": vulnerabilities
    });

    let json_str = serde_json::to_string_pretty(&sbom)
        .map_err(|e| format!("SBOM Formatierungsfehler: {}", e))?;
    
    std::fs::write(&save_path, json_str)
        .map_err(|e| format!("Fehler beim Speichern der Datei: {}", e))?;

    Ok("SBOM erfolgreich gespeichert".to_string())
}