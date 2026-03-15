# eit-cody-loom
config property helm chart generator

# Cody Loom

Diese Applikation generiert Liquibase-Changelogs aus SQL-Dumps oder DDL-Skripten und bietet eine "Bridge" für Java-Properties (Spring/Quarkus) zu Helm-Charts.

## Features

- **SQL to Liquibase**: Konvertiert SQL-Dumps in Liquibase YAML/XML.
- **DDL to Liquibase**: Erstellt Changelogs direkt aus DDL-Statements.
- **Helm Generator**: Übersetzt `application.properties` in Helm `values.yaml` und Kubernetes Env-Variable Mappings.
- **Docker Check**: Prüft, ob Docker für die Liquibase-Konvertierung bereitsteht.

## Voraussetzungen

- **Docker Desktop**: Muss laufen (für temporäre Postgres-Instanz via Liquibase).
- **Liquibase CLI**: Muss im System PATH installiert sein.

## Installation & Entwicklung

### Prerequisites

- **Node.js** (v20+)
- **Rust** (v1.80+) & **Tauri v2 CLI** (`cargo install tauri-cli`)

### Setup

1.  **Repository klonen**
    ```bash
    git clone <repository-url>
    cd eit-cody-loom
    ```

2.  **Dependencies installieren**
    ```bash
    cd frontend
    npm install
    ```

## Usage

### Development Mode

Startet das Angular-Frontend und den Tauri-Backend-Prozess mit Hot-Reload:

```bash
cd frontend
npm run tauri dev
```

### Build für Production

Erzeugt die ausführbare Binary (`.exe` auf Windows):

```bash
cd frontend
npm run tauri build
```

Die Binary befindet sich unter `src-tauri/target/release/bundle/`.
