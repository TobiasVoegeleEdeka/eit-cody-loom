import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { TauriService, DependencyInfo, Vulnerability } from '../../services/tauri.service';
import { save } from '@tauri-apps/plugin-dialog';
@Component({
  selector: 'app-dependency-check',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatTabsModule
  ],
  template: `
    <div class="premium-card">
      <h2><mat-icon>security</mat-icon> Dependency Health Check</h2>
      <p class="subtitle">Scannt komplette Projekte auf Sicherheitslücken und Updates (inkl. transitiver Abhängigkeiten).</p>

      <div class="input-row">
        <mat-form-field appearance="outline" class="file-path-field">
          <mat-label>Pfad zum Projekt-Ordner</mat-label>
          <input matInput [(ngModel)]="filePath" placeholder="C:\\projekte\\mein-app">
          <button mat-icon-button matSuffix (click)="selectProjectDirectory()">
            <mat-icon>snippet_folder</mat-icon>
          </button>
        </mat-form-field>
        <button mat-raised-button color="accent" (click)="checkDependencies()" [disabled]="loading || !filePath">
          <mat-icon>search</mat-icon> Komplettes Projekt analysieren
        </button>
        <button mat-stroked-button color="primary" (click)="exportSbom()" [disabled]="loading || modules.length === 0">
          <mat-icon>download</mat-icon> SBOM (CycloneDX)
        </button>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Analysiere Maven Abhängigkeiten... (das kann bei großen Projekten kurz dauern)</span>
      </div>

      <div *ngIf="modules.length > 0 && !loading" class="results-container animate-fade-in">
        <mat-tab-group animationDuration="0ms" color="accent" backgroundColor="primary">
          
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon warning-icon">warning</mat-icon>
              Action Required ({{ issues.length }})
            </ng-template>
            <div class="tab-content">
              <div *ngIf="issues.length === 0" class="all-clear">
                <mat-icon>verified</mat-icon>
                <h3>Alles im grünen Bereich!</h3>
                <p>Keine Sicherheitslücken oder anstehende Updates in allen Modulen gefunden.</p>
              </div>
              <ng-container *ngIf="issues.length > 0">
                <ng-container *ngTemplateOutlet="depTable; context: { $implicit: issues, showModule: true }"></ng-container>
              </ng-container>
            </div>
          </mat-tab>

          <mat-tab *ngFor="let mod of modules">
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">view_module</mat-icon>
              {{ mod.name }} ({{ mod.deps.length }})
            </ng-template>
            <div class="tab-content">
              <ng-container *ngTemplateOutlet="depTable; context: { $implicit: mod.deps, showModule: false }"></ng-container>
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>

      <div *ngIf="error" class="error-box">
        <mat-icon>error</mat-icon>
        {{ error }}
      </div>
    </div>

    <ng-template #depTable let-dataSource let-showModule="showModule">
      <table mat-table [dataSource]="dataSource" class="mat-elevation-z2">
        
        <ng-container matColumnDef="module">
          <th mat-header-cell *matHeaderCellDef>Modul</th>
          <td mat-cell *matCellDef="let dep"><span class="module-badge">{{ dep.module_name }}</span></td>
        </ng-container>

        <ng-container matColumnDef="dependency">
          <th mat-header-cell *matHeaderCellDef>Abhängigkeit</th>
          <td mat-cell *matCellDef="let dep">
            <div class="dep-info">
              <span class="group">{{ dep.group_id }}</span>
              <span class="artifact">{{ dep.artifact_id }}</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="version">
          <th mat-header-cell *matHeaderCellDef>Aktuell</th>
          <td mat-cell *matCellDef="let dep">{{ dep.version }}</td>
        </ng-container>

        <ng-container matColumnDef="latest">
          <th mat-header-cell *matHeaderCellDef>Neueste</th>
          <td mat-cell *matCellDef="let dep">
            <span *ngIf="dep.latest_version && dep.latest_version !== dep.version" class="update-badge">
              {{ dep.latest_version }}
            </span>
            <span *ngIf="!dep.latest_version || dep.latest_version === dep.version" class="up-to-date">Aktuell</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let dep">
            <mat-chip-set>
              <mat-chip *ngIf="dep.vulnerabilities.length > 0" class="risk-chip" 
                        [matTooltip]="dep.vulnerabilities[0].summary || 'CVE gefunden'">
                <mat-icon matChipAvatar>warning</mat-icon>
                {{ dep.vulnerabilities.length }} Lücke(n)
              </mat-chip>
              <mat-chip *ngIf="dep.latest_version && dep.latest_version !== dep.version" class="update-chip">
                <mat-icon matChipAvatar>system_update</mat-icon>
                Update
              </mat-chip>
              <mat-chip *ngIf="dep.vulnerabilities.length === 0 && (!dep.latest_version || dep.latest_version === dep.version)" class="safe-chip">
                <mat-icon matChipAvatar>check_circle</mat-icon>
                Sicher
              </mat-chip>
            </mat-chip-set>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="showModule ? displayedColumnsIssues : displayedColumnsRegular"></tr>
        <tr mat-row *matRowDef="let row; columns: showModule ? displayedColumnsIssues : displayedColumnsRegular;"></tr>
      </table>
    </ng-template>
  `,
  styles: [`
    .premium-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 24px;
      margin: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    h2 { margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .subtitle { opacity: 0.7; margin-bottom: 24px; }
    .input-row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
    .file-path-field { flex: 1; }
    .loading-container { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; }
    .results-container { margin-top: 16px; }
    .tab-content { padding-top: 16px; }
    .tab-icon { margin-right: 8px; vertical-align: middle; }
    .warning-icon { color: #f44336; }
    table { width: 100%; background: transparent !important; }
    .dep-info { display: flex; flex-direction: column; }
    .group { font-size: 0.75rem; opacity: 0.6; }
    .artifact { font-weight: 500; }
    .update-badge { color: #00bcd4; font-weight: bold; }
    .up-to-date { opacity: 0.5; font-size: 0.85rem; }
    .module-badge { background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-family: monospace; }
    .risk-chip { background-color: #f44336 !important; color: white !important; }
    .update-chip { background-color: #ff9800 !important; color: white !important; }
    .safe-chip { background-color: #4caf50 !important; color: white !important; }
    .error-box { margin-top: 24px; padding: 16px; background: rgba(244, 67, 54, 0.1); color: #f44336; border-radius: 8px; display: flex; align-items: center; gap: 8px; }
    .all-clear { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #4caf50; opacity: 0.8; }
    .all-clear mat-icon { font-size: 48px; height: 48px; width: 48px; margin-bottom: 16px; }
    .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class DependencyCheckComponent {
  filePath: string = '';
  loading: boolean = false;
  error: string | null = null;

  issues: DependencyInfo[] = [];
  modules: { name: string, deps: DependencyInfo[] }[] = [];

  displayedColumnsIssues: string[] = ['module', 'dependency', 'version', 'latest', 'status'];
  displayedColumnsRegular: string[] = ['dependency', 'version', 'latest', 'status'];

  constructor(private tauriService: TauriService) { }

  checkDependencies() {
    this.loading = true;
    this.error = null;
    this.issues = [];
    this.modules = [];

    this.tauriService.checkPomDependencies(this.filePath).subscribe({
      next: (data: DependencyInfo[]) => {
        this.issues = data
          .filter(d => d.vulnerabilities.length > 0 || (d.latest_version && d.latest_version !== d.version))
          .sort((a, b) => a.module_name.localeCompare(b.module_name));

        const grouped = data.reduce((acc, curr) => {
          acc[curr.module_name] = acc[curr.module_name] ? [...acc[curr.module_name], curr] : [curr];
          return acc;
        }, {} as Record<string, DependencyInfo[]>);

        this.modules = Object.keys(grouped)
          .sort()
          .map(key => ({ name: key, deps: grouped[key] }));

        this.loading = false;
      },
      error: (err) => {
        this.error = typeof err === 'string' ? err : JSON.stringify(err);
        this.loading = false;
      }
    });
  }

  async selectProjectDirectory() {
    // Ruft nun selectDirectory statt selectFile auf!
    const selected = await this.tauriService.selectDirectory('Projekt-Ordner auswählen');
    this.filePath = selected ? selected : this.filePath;
  }

  async exportSbom() {
    try {
      // 1. Nativen Speichern-Dialog öffnen
      const savePath = await save({
        title: 'SBOM speichern',
        defaultPath: `sbom-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });

      if (!savePath) return;

      const allDependencies = this.modules.flatMap(m => m.deps);

      this.tauriService.generateSbom(allDependencies, savePath).subscribe({
        next: () => {
          this.error = null;
        },
        error: (err) => this.error = `SBOM Export fehlgeschlagen: ${err}`
      });
    } catch (err) {
      this.error = `Systemfehler beim Speichern: ${err}`;
    }
  }
}