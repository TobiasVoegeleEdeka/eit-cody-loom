use serde::{Deserialize, Serialize};
use std::fs;
use roxmltree::Document;
use tauri::command;

#[derive(Serialize, Deserialize, Debug)]
pub struct DependencyInfo {
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

#[command]
pub async fn check_pom_dependencies(file_path: String) -> Result<Vec<DependencyInfo>, String> {
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let doc = Document::parse(&content).map_err(|e| format!("Fehler beim Parsen der POM: {}", e))?;

    let mut dependencies = Vec::new();

    // 1. Parse Dependencies from POM
    if let Some(project) = doc.root().children().find(|n| n.has_tag_name("project")) {
        // Direct dependencies
        if let Some(deps_node) = project.children().find(|n| n.has_tag_name("dependencies")) {
            for dep in deps_node.children().filter(|n| n.has_tag_name("dependency")) {
                let group_id = dep.children().find(|n| n.has_tag_name("groupId")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                let artifact_id = dep.children().find(|n| n.has_tag_name("artifactId")).map(|n| n.text().unwrap_or("")).unwrap_or("");
                let version = dep.children().find(|n| n.has_tag_name("version")).map(|n| n.text().unwrap_or("")).unwrap_or("");

                if !group_id.is_empty() && !artifact_id.is_empty() && !version.is_empty() {
                    dependencies.push(DependencyInfo {
                        group_id: group_id.to_string(),
                        artifact_id: artifact_id.to_string(),
                        version: version.to_string(),
                        latest_version: None,
                        vulnerabilities: Vec::new(),
                    });
                }
            }
        }
    }

    // 2. Check for Vulnerabilities and Latest Versions
    let client = reqwest::Client::new();
    let mut results = Vec::new();

    for mut dep in dependencies {
        // OSV Check
        let osv_query = serde_json::json!({
            "version": dep.version,
            "package": {
                "name": format!("{}:{}", dep.group_id, dep.artifact_id),
                "ecosystem": "Maven"
            }
        });

        if let Ok(resp) = client.post("https://api.osv.dev/v1/query")
            .json(&osv_query)
            .send()
            .await {
            if let Ok(osv_resp) = resp.json::<OsvResponse>().await {
                if let Some(vulns) = osv_resp.vulns {
                    for v in vulns {
                        dep.vulnerabilities.push(Vulnerability {
                            id: v.id,
                            summary: v.summary,
                            details: v.details,
                            severity: "CRITICAL".to_string(), // Simplified for now
                        });
                    }
                }
            }
        }

        // Maven Central Latest Version Check
        let maven_url = format!("https://search.maven.org/solrsearch/select?q=g:{} AND a:{}&rows=1&wt=json", dep.group_id, dep.artifact_id);
        if let Ok(resp) = client.get(&maven_url).send().await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(latest) = json["response"]["docs"][0]["latestVersion"].as_str() {
                    dep.latest_version = Some(latest.to_string());
                }
            }
        }

        results.push(dep);
    }

    Ok(results)
}
