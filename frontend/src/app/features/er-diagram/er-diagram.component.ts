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
  selector: 'app-er-diagram',
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
      <h2 class="section-title">ER-Diagramm / DDL zu Liquibase</h2>
      <p class="subtitle">Füge dein SQL DDL-Statement ein, um daraus ein Liquibase-Changelog zu erstellen.</p>

      <div class="toolbar-actions">
        <button mat-stroked-button color="primary" (click)="loadFile()">
          <mat-icon>file_open</mat-icon> DDL Datei laden
        </button>
      </div>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>SQL DDL (CREATE TABLE ...)</mat-label>
        <textarea matInput [(ngModel)]="ddlContent" rows="10" placeholder="CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));"></textarea>
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline" class="flex-1">
          <mat-label>Format</mat-label>
          <mat-select [(ngModel)]="format">
            <mat-option value="YAML">YAML</mat-option>
            <mat-option value="XML">XML</mat-option>
            <mat-option value="JSON">JSON</mat-option>
          </mat-select>
        </mat-form-field>
        <span class="spacer"></span>
        <button mat-raised-button color="accent" [disabled]="loading || !ddlContent" (click)="generate()" class="gen-btn">
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
    .subtitle { color: #888; margin-bottom: 16px; }
    .toolbar-actions { margin-bottom: 16px; }
    .w-full { width: 100%; margin-bottom: 16px; }
    .form-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .flex-1 { flex: 1; }
    .spacer { flex: 1; }
    .gen-btn { height: 56px; padding: 0 32px; }
    .loader { margin-bottom: 24px; }
    .result-area { margin-top: 24px; animation: fadeIn 0.5s ease; }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .error-box { background: rgba(244, 67, 54, 0.1); color: #f44336; padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  `]
})
export class ErDiagramComponent {
  ddlContent = '';
  format = 'YAML';
  loading = false;
  result = '';
  error = '';

  constructor(private tauri: TauriService) {}

  generate() {
    this.loading = true;
    this.error = '';
    this.result = '';
    
    this.tauri.generateFromDdl(this.ddlContent, this.format).subscribe({
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

  async loadFile() {
    const selected = await this.tauri.selectFile('DDL SQL laden', ['sql', 'txt']);
    if (selected) {
      this.tauri.readTextFile(selected).subscribe(content => {
        this.ddlContent = content;
      });
    }
  }
}
