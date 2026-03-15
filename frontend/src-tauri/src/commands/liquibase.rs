use std::fs;
use tauri::{command, AppHandle};
use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;
use sqlparser::ast::{Statement, DataType};

#[command]
pub fn check_docker() -> bool {
    true
}

#[command]
pub async fn generate_from_sql_dump(
    _app: AppHandle,
    file_path: String,
    db_type: String,
    _format: String,
) -> Result<String, String> {
    let sql = fs::read_to_string(&file_path)
        .map_err(|e| format!("Fehler beim Lesen der SQL-Datei: {}", e))?;

    parse_sql_to_yaml(&sql, &db_type)
}

#[command]
pub async fn generate_from_ddl(
    _app: AppHandle,
    ddl_content: String,
    db_type: String,
    _format: String,
) -> Result<String, String> {
    parse_sql_to_yaml(&ddl_content, &db_type)
}

fn parse_sql_to_yaml(sql: &str, db_type: &str) -> Result<String, String> {
    let is_mongo = if db_type.to_lowercase() == "mongodb" { true } else { false };
    let mut cleaned_sql_lines = Vec::new();
    let mut raw_inserts = Vec::new();
    let mut in_create_table = false;
    let mut in_insert_into = false;

    for line in sql.lines() {
        let trimmed = line.trim();
        let mut modified_line = trimmed.replace(" char)", ")");
        modified_line = modified_line.replace("[", "").replace("]", "");
        
        let upper_trimmed = modified_line.to_uppercase();

        let _ = if upper_trimmed.starts_with("CREATE TABLE") {
            in_create_table = true;
            cleaned_sql_lines.push(modified_line);
            true
        } else if in_create_table {
            let upper_mod = modified_line.to_uppercase();
            modified_line = if modified_line == "/" || upper_mod == "GO" { ";".to_string() } else { modified_line };
            
            cleaned_sql_lines.push(modified_line.clone());
            
            let _ = if modified_line.ends_with(';') {
                in_create_table = false;
                true
            } else { false };
            true
        } else if upper_trimmed.starts_with("INSERT INTO") {
            in_insert_into = true;
            raw_inserts.push(modified_line.clone());
            let _ = if modified_line.ends_with(';') { in_insert_into = false; true } else { false };
            true
        } else if in_insert_into {
            raw_inserts.push(modified_line.clone());
            let _ = if modified_line.ends_with(';') { in_insert_into = false; true } else { false };
            true
        } else {
            false
        };
    }

    let cleaned_sql = cleaned_sql_lines.join("\n");

    let _ = if cleaned_sql.is_empty() && raw_inserts.is_empty() {
        return Err("Keine CREATE TABLE oder INSERT Statements im Dump gefunden.".to_string());
    } else { false };

    let mut yaml = String::from("databaseChangeLog:\n");
    let mut changeset_id = 1;

    let _ = if !cleaned_sql.is_empty() {
        let dialect = GenericDialect {};
        let ast = Parser::parse_sql(&dialect, &cleaned_sql)
            .map_err(|e| format!("SQL Parsing fehlgeschlagen: {}", e))?;

        for statement in ast {
            if let Statement::CreateTable { name, columns, .. } = statement {
                yaml.push_str("  - changeSet:\n");
                yaml.push_str(&format!("      id: {}\n", changeset_id));
                yaml.push_str("      author: cody-loom-generator\n");
                yaml.push_str("      changes:\n");

                let _ = if is_mongo {
                    yaml.push_str("        - createCollection:\n");
                    yaml.push_str(&format!("            collectionName: {}\n", name));
                    true
                } else {
                    yaml.push_str("        - createTable:\n");
                    yaml.push_str(&format!("            tableName: {}\n", name));
                    yaml.push_str("            columns:\n");

                    for col in columns {
                        yaml.push_str("              - column:\n");
                        yaml.push_str(&format!("                  name: {}\n", col.name));
                        yaml.push_str(&format!("                  type: {}\n", map_data_type(&col.data_type)));
                        
                        let mut constraints = Vec::new();
                        for option_def in &col.options {
                            let _ = match option_def.option {
                                sqlparser::ast::ColumnOption::NotNull => constraints.push("nullable: false".to_string()),
                                sqlparser::ast::ColumnOption::Unique { is_primary: true, .. } => constraints.push("primaryKey: true".to_string()),
                                sqlparser::ast::ColumnOption::Unique { is_primary: false, .. } => constraints.push("unique: true".to_string()),
                                sqlparser::ast::ColumnOption::Null => constraints.push("nullable: true".to_string()),
                                _ => ()
                            };
                        }

                        let _ = if !constraints.is_empty() {
                             yaml.push_str("                  constraints:\n");
                             for c in constraints {
                                 yaml.push_str(&format!("                    {}\n", c));
                             }
                             true
                        } else { false };
                    }
                    true
                };
                changeset_id += 1;
            }
        }
        true
    } else { false };

    let _ = if !raw_inserts.is_empty() {
        yaml.push_str("  - changeSet:\n");
        yaml.push_str(&format!("      id: {}\n", changeset_id));
        yaml.push_str("      author: cody-loom-generator\n");
        yaml.push_str("      changes:\n");
        
        let _ = if is_mongo {
            yaml.push_str("        - mongo:\n");
            yaml.push_str("            mongo: |\n");
            true
        } else {
            yaml.push_str("        - sql:\n");
            yaml.push_str("            sql: |\n");
            true
        };
        
        for insert_line in raw_inserts {
            yaml.push_str(&format!("              {}\n", insert_line));
        }
        true
    } else { false };

    Ok(yaml)
}

fn map_data_type(data_type: &DataType) -> String {
    data_type.to_string()
}