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
import { TauriService, DependencyInfo } from '../../services/tauri.service';

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
    MatTooltipModule
  ],
  template: `
    <div class="premium-card">
      <h2><mat-icon>security</mat-icon> Dependency Health Check</h2>
      <p class="subtitle">Scannt deine pom.xml auf Sicherheitslücken und veraltete Versionen.</p>

      <div class="input-row">
        <mat-form-field appearance="outline" class="file-path-field">
          <mat-label>Pfad zur pom.xml</mat-label>
          <input matInput [(ngModel)]="filePath" placeholder="C:\projekte\mein-app\pom.xml">
          <button mat-icon-button matSuffix (click)="selectPomFile()">
            <mat-icon>folder_open</mat-icon>
          </button>
        </mat-form-field>
        <button mat-raised-button color="accent" (click)="checkDependencies()" [disabled]="loading || !filePath">
          <mat-icon>search</mat-icon> Analysieren
        </button>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Analysiere Maven Abhängigkeiten...</span>
      </div>

      <div *ngIf="results.length > 0" class="results-container animate-fade-in">
        <table mat-table [dataSource]="results" class="mat-elevation-z2">
          
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
              <span *ngIf="!dep.latest_version || dep.latest_version === dep.version">Aktuell</span>
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

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <div *ngIf="error" class="error-box">
        <mat-icon>error</mat-icon>
        {{ error }}
      </div>
    </div>
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
    table { width: 100%; background: transparent !important; }
    .dep-info { display: flex; flex-direction: column; }
    .group { font-size: 0.75rem; opacity: 0.6; }
    .artifact { font-weight: 500; }
    .update-badge { color: #00bcd4; font-weight: bold; }
    .risk-chip { background-color: #f44336 !important; color: white !important; }
    .update-chip { background-color: #ff9800 !important; color: white !important; }
    .safe-chip { background-color: #4caf50 !important; color: white !important; }
    .error-box { margin-top: 24px; padding: 16px; background: rgba(244, 67, 54, 0.1); color: #f44336; border-radius: 8px; display: flex; align-items: center; gap: 8px; }
    .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class DependencyCheckComponent {
  filePath: string = '';
  loading: boolean = false;
  results: DependencyInfo[] = [];
  error: string | null = null;
  displayedColumns: string[] = ['dependency', 'version', 'latest', 'status'];

  constructor(private tauriService: TauriService) {}

  checkDependencies() {
    this.loading = true;
    this.error = null;
    this.results = [];

    this.tauriService.checkPomDependencies(this.filePath).subscribe({
      next: (data) => {
        this.results = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err;
        this.loading = false;
      }
    });
  }

  async selectPomFile() {
    const selected = await this.tauriService.selectFile('pom.xml auswählen', ['xml']);
    if (selected) {
      this.filePath = selected;
    }
  }
}
