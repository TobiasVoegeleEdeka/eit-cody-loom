use serde::{Serialize, Deserialize};
use tauri::command;
use std::collections::BTreeMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct HelmMapping {
    pub key: String,
    pub env_var: String,
    pub helm_value: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HelmOutput {
    pub values_yaml: String,
    pub deployment_snippet: String,
    pub mappings: Vec<HelmMapping>,
}

#[command]
pub fn generate_helm_values(props_content: String) -> Result<HelmOutput, String> {
    let mut mappings = Vec::new();
    let mut values_map = BTreeMap::new();
    let mut env_snippets = Vec::new();

    for line in props_content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || !trimmed.contains('=') {
            continue;
        }

        let parts: Vec<&str> = trimmed.splitn(2, '=').collect();
        let key = parts[0].trim();
        let val = parts[1].trim();

        // 1. Generate Env Var Name (e.g. quarkus.datasource.jdbc.url -> QUARKUS_DATASOURCE_JDBC_URL)
        let env_var = key.to_uppercase().replace('.', "_").replace('-', "_");

        // 2. Generate Helm Value Path (e.g. quarkus.datasource.jdbc.url -> app.db.url or similar mapping)
        // Simplified: use the same key structure
        let helm_path = format!("app.config.{}", key.replace('-', "_"));
        
        mappings.push(HelmMapping {
            key: key.to_string(),
            env_var: env_var.clone(),
            helm_value: format!("{{{{ .Values.{} }}}}", helm_path),
        });

        // 3. Add to values_map for YAML generation
        values_map.insert(helm_path.clone(), val.to_string());

        // 4. Create deployment snippet
        env_snippets.push(format!("  - name: {}\n    value: {{{{ .Values.{} | quote }}}}", env_var, helm_path));
    }

    // Generate simple YAML (indented)
    let mut values_yaml = String::from("app:\n  config:\n");
    for (path, val) in values_map {
        let key_only = path.strip_prefix("app.config.").unwrap_or(&path);
        values_yaml.push_str(&format!("    {}: \"{}\"\n", key_only, val));
    }

    Ok(HelmOutput {
        values_yaml,
        deployment_snippet: format!("env:\n{}", env_snippets.join("\n")),
        mappings,
    })
}
