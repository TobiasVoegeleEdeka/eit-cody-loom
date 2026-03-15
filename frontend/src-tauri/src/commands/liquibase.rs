use std::process::Command;
use std::fs;
use tauri::command;

#[command]
pub fn check_docker() -> bool {
    let output = Command::new("docker").arg("info").output();
    output.is_ok() && output.unwrap().status.success()
}

#[command]
pub async fn generate_from_sql_dump(
    file_path: String,
    _db_type: String,
    format: String,
) -> Result<String, String> {
    // 1. Check if file exists
    if !fs::metadata(&file_path).is_ok() {
        return Err(format!("File not found: {}", file_path));
    }

    // 2. Start a temporary postgres container
    // We use a random port to avoid conflicts
    let container_name = format!("liquibase-temp-{}", uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>());
    
    let spawn = Command::new("docker")
        .args([
            "run", "-d", "--rm",
            "--name", &container_name,
            "-p", "5433:5432",
            "-e", "POSTGRES_PASSWORD=pass",
            "postgres:alpine",
        ])
        .output();

    if spawn.is_err() || !spawn.unwrap().status.success() {
        return Err("Failed to start docker container".into());
    }

    // 3. Wait for DB to be ready (simplified)
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    // 4. Import SQL dump (using docker exec psql)
    // In a real scenario, we might need to handle large files differently
    let import = Command::new("docker")
        .args([
            "exec", "-i", &container_name,
            "psql", "-U", "postgres", "-d", "postgres",
        ])
        .stdin(fs::File::open(&file_path).map_err(|e| e.to_string())?)
        .output();

    if import.is_err() || !import.unwrap().status.success() {
        let _ = Command::new("docker").args(["stop", &container_name]).output();
        return Err("Failed to import SQL dump into temp database".into());
    }

    // 5. Run Liquibase generate-changelog
    let changelog_file = format!("changelog.{}", format.to_lowercase());
    let liquibase = Command::new("liquibase")
        .args([
            "--changelog-file", &changelog_file,
            "--url", "jdbc:postgresql://localhost:5433/postgres",
            "--username", "postgres",
            "--password", "pass",
            "generate-changelog",
        ])
        .output();

    // Clean up container
    let _ = Command::new("docker").args(["stop", &container_name]).output();

    match liquibase {
        Ok(out) if out.status.success() => {
            // Read generated file and return content
            fs::read_to_string(&changelog_file).map_err(|_| "Failed to read generated changelog".into())
        }
        _ => Err("Liquibase generation failed. Ensure Liquibase CLI is installed.".into()),
    }
}

#[command]
pub async fn generate_from_ddl(
    ddl_content: String,
    format: String,
) -> Result<String, String> {
    let temp_file = "temp_schema.sql";
    fs::write(temp_file, ddl_content).map_err(|e| e.to_string())?;
    let res = generate_from_sql_dump(temp_file.into(), "postgres".into(), format).await;
    let _ = fs::remove_file(temp_file);
    res
}
