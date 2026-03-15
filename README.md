# 🧶 EIT Cody Loom

**EIT Cody Loom** ist ein Schweizer Taschenmesser für die moderne Java-Entwicklung. Es automatisiert mühsame Aufgaben in der Infrastruktur-Vorbereitung, von der Datenbank-Migration bis hin zur Sicherheitsanalyse von Abhängigkeiten.

---

## 🚀 Kern-Features

### 🛠️ Liquibase Helper
*   **SQL to Liquibase**: Transformiert rohe SQL-Dumps in strukturierte Liquibase ChangeLogs (YAML/XML).
*   **DDL to Liquibase**: Erstellt Migrationsskripte direkt aus DDL-Statements.
*   **Docker Integration**: Nutzt temporäre Container, um hochpräzise Diff-Analysen durchzuführen.

### ☸️ Helm Bridge
*   **Property Translator**: Übersetzt Java `application.properties` (Spring Boot / Quarkus) direkt in Helm `values.yaml`.
*   **Env Mapping**: Generiert automatisch die notwendigen Kubernetes Umgebungsvariablen-Mappings für Deployment-Snippets.

### 🛡️ Dependency Health Check (NEU)
*   **Deep Scan**: Analysiert Maven-Projekte (`pom.xml`) und löst transitive Abhängigkeiten über das lokale Maven-System auf.
*   **Sicherheits-Check**: Gleicht alle Abhängigkeiten in Echtzeit mit der **OSV.dev (Google Security) Database** ab.
*   **Update-Radar**: Findet die absolut neuesten Versionen auf Maven Central.
*   **SBOM Export**: Generiert standardkonforme **CycloneDX SBOMs** (Software Bill of Materials) für Compliance-Zwecke.

---

## 🏗️ Wie es funktioniert (Architektur)

Cody Loom basiert auf einem modernen **Hybrid-Stack**:

1.  **Backend (Rust + Tauri)**: 
    *   Die Performance-kritischen Aufgaben und System-Interaktionen werden in **Rust** ausgeführt.
    *   Tauri bietet eine sichere Bridge, um lokale CLI-Tools (wie `mvn` oder `docker`) aufzurufen und das Filesystem zu steuern.
2.  **Frontend (Angular + Material Design)**:
    *   Ein reaktives Interface sorgt für eine intuitive Bedienung.
    *   Echtzeit-Feedback bei Scans und Generierungen.
3.  **Cross-App Communication**:
    *   Der Rust-Kern kommuniziert asynchron mit Web-APIs (OSV, Maven Central), um die UI niemals zu blockieren.

---

## 🛠️ Voraussetzungen

Damit alle Funktionen reibungslos laufen, sollten folgende Tools installiert sein:

*   **Docker Desktop**: Erforderlich für die Liquibase-Konvertierung (für temporäre DB-Instanzen).
*   **Maven (mvn)**: Muss im System-PATH sein, um transitive Abhängigkeiten zu analysieren.
*   **Liquibase CLI**: Für die Generierung der ChangeLogs.

---

## 💻 Entwicklung & Build

### Setup

1.  **Repository klonen**
2.  **Frontend-Dependencies**:
    ```bash
    cd frontend
    npm install
    ```

🚀 CI Mode & Automation
Cody Loom verfügt über einen Headless-Modus für die Integration in CI/CD-Pipelines. In diesem Modus scannt die Anwendung das Zielprojekt,
generiert einen Report und beendet sich mit einem entsprechenden Exit-Code.

# 1. Anwendung bauen  
npm run tauri build

# 2. Scan im CI-Modus ausführen
## Der Befehl erstellt automatisch einen /reports Ordner mit der sbom.json

./target/release/eit-cody-loom --ci --scan /path/to/project

### wenn noch nicht gebaut: 
cargo run -- --ci --scan "C:\development\eit-cody-sentinel"


## Beispiel GitHub Actions Workflow
```
name: Security Scan
on: [push]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          
      - name: Maven Build
        run: mvn clean compile -B

      - name: Run Cody Loom
        run: |
          chmod +x ./bin/eit-cody-loom
          ./bin/eit-cody-loom --ci --scan ./
          
      - name: Archive Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: reports/

```

### Ausführen

**Development Mode**: (Frontend & Backend parallel)
```bash
cd frontend
npm run tauri dev
```

**Build für Production**:
```bash
cd frontend
npm run tauri build
```
Die fertige `.exe` (oder das entsprechende OS-Paket) findet man anschließend unter `src-tauri/target/release/bundle/`.

---

*Entwickelt für effiziente Cloud-Native Java Workflows.* 🚀
