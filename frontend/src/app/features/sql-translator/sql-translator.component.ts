import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TauriService } from '../../services/tauri.service';

@Component({
  selector: 'app-sql-translator',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="premium-card">
      <h2 class="section-title">SQL Dump zu Liquibase</h2>
      <p class="subtitle">Wähle einen SQL-Dump aus, um ein Liquibase-Changelog zu generieren.</p>

      <div class="form-row">
        <mat-form-field appearance="outline" class="flex-3">
          <mat-label>SQL Datei Pfad</mat-label>
          <input matInput [(ngModel)]="filePath" placeholder="C:\\pfad\\zu\\dump.sql">
          <button mat-icon-button matSuffix (click)="selectSqlFile()">
            <mat-icon>folder_open</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline" class="flex-1">
          <mat-label>Datenbank</mat-label>
          <mat-select [(ngModel)]="dbType">
            <mat-option value="postgres">PostgreSQL</mat-option>
            <mat-option value="mysql">MySQL</mat-option>
            <mat-option value="oracle">Oracle</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="flex-1">
          <mat-label>Format</mat-label>
          <mat-select [(ngModel)]="format">
            <mat-option value="YAML">YAML</mat-option>
            <mat-option value="XML">XML</mat-option>
            <mat-option value="JSON">JSON</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="actions">
        <button mat-raised-button color="accent" [disabled]="loading || !filePath" (click)="generate()">
          <mat-icon>auto_fix_high</mat-icon>
          Generieren
        </button>
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate" class="loader"></mat-progress-bar>

      <div *ngIf="error" class="error-box">
        <mat-icon>error_outline</mat-icon>
        {{ error }}
      </div>

      <div *ngIf="result" class="result-area">
        <div class="result-header">
          <h3>Ergebnis: db-changelog.{{ format.toLowerCase() }}</h3>
          <button mat-button (click)="copyResult()">
            <mat-icon>content_copy</mat-icon> Kopieren
          </button>
        </div>
        <pre class="code-preview">{{ result }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size: 24px; margin-bottom: 8px; font-weight: 300; color: #fff; }
    .subtitle { color: #888; margin-bottom: 32px; }
    .form-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .flex-3 { flex: 3; }
    .flex-1 { flex: 1; }
    .actions { margin-bottom: 32px; display: flex; justify-content: center; }
    .loader { margin-bottom: 24px; }
    .result-area { margin-top: 24px; animation: fadeIn 0.5s ease; }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .error-box { background: rgba(244, 67, 54, 0.1); color: #f44336; padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border: 1px solid rgba(244, 67, 54, 0.2); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SqlTranslatorComponent {
  filePath = '';
  dbType = 'postgres';
  format = 'YAML';
  loading = false;
  result = '';
  error = '';

  constructor(private tauri: TauriService) {}

  generate() {
    this.loading = true;
    this.error = '';
    this.result = '';
    
    this.tauri.generateFromSqlDump(this.filePath, this.dbType, this.format).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = err;
        this.loading = false;
      }
    });
  }

  copyResult() {
    navigator.clipboard.writeText(this.result);
  }

  async selectSqlFile() {
    const selected = await this.tauri.selectFile('SQL Dump auswählen', ['sql', 'txt']);
    if (selected) {
      this.filePath = selected;
    }
  }
}
