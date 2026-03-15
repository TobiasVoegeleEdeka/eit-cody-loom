import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { TauriService, HelmOutput } from '../../services/tauri.service';

@Component({
  selector: 'app-helm-bridge',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatIconModule,
    MatTableModule,
    MatDividerModule
  ],
  template: `
    <div class="premium-card">
      <h2 class="section-title">Java Properties zu Helm Charts</h2>
      <p class="subtitle">Übersetze application.properties direkt in Helm values.yaml und Env-Mappings.</p>

      <div class="toolbar-actions">
        <button mat-stroked-button color="primary" (click)="loadFile()">
          <mat-icon>file_open</mat-icon> Datei laden
        </button>
      </div>

      <div class="split-layout">
        <div class="input-panel">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>application.properties / yml</mat-label>
            <textarea matInput [(ngModel)]="propsContent" (ngModelChange)="autoGen()" rows="15" 
                      placeholder="spring.datasource.url=jdbc:postgresql://localhost:5432/db"></textarea>
          </mat-form-field>
        </div>

        <div class="output-panel" *ngIf="output">
          <div class="result-section">
            <div class="result-header">
              <h3>values.yaml</h3>
              <button mat-icon-button (click)="copy(output.values_yaml)"><mat-icon>content_copy</mat-icon></button>
            </div>
            <pre class="code-preview mini">{{ output.values_yaml }}</pre>
          </div>

          <mat-divider class="v-spacer"></mat-divider>

          <div class="result-section">
            <div class="result-header">
              <h3>Deployment Env Snippet</h3>
              <button mat-icon-button (click)="copy(output.deployment_snippet)"><mat-icon>content_copy</mat-icon></button>
            </div>
            <pre class="code-preview mini">{{ output.deployment_snippet }}</pre>
          </div>
        </div>
      </div>

      <div class="mapping-table-container" *ngIf="output && output.mappings.length > 0">
        <h3>Smart Mapping Übersicht</h3>
        <table mat-table [dataSource]="output.mappings" class="mat-elevation-z2">
          <ng-container matColumnDef="key">
            <th mat-header-cell *matHeaderCellDef> Java Property </th>
            <td mat-cell *matCellDef="let m"> {{m.key}} </td>
          </ng-container>
          <ng-container matColumnDef="env">
            <th mat-header-cell *matHeaderCellDef> K8s Env Var </th>
            <td mat-cell *matCellDef="let m"> <code>{{m.env_var}}</code> </td>
          </ng-container>
          <ng-container matColumnDef="helm">
            <th mat-header-cell *matHeaderCellDef> Helm Mapping </th>
            <td mat-cell *matCellDef="let m"> <code class="accent-code">{{m.helm_value}}</code> </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .section-title { font-size: 24px; margin-bottom: 8px; font-weight: 300; color: #fff; }
    .subtitle { color: #888; margin-bottom: 16px; }
    .toolbar-actions { margin-bottom: 24px; }
    .w-full { width: 100%; }
    .split-layout { display: flex; gap: 24px; margin-bottom: 32px; }
    .input-panel { flex: 1; }
    .output-panel { flex: 1; display: flex; flex-direction: column; gap: 16px; }
    .result-section { background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .result-header h3 { margin: 0; font-size: 14px; text-transform: uppercase; color: #aaa; }
    .mini { font-size: 12px; max-height: 200px; }
    .v-spacer { margin: 8px 0; }
    .mapping-table-container { margin-top: 32px; animation: slideUp 0.6s ease; }
    .accent-code { color: #00bcd4; }
    table { width: 100%; background: rgba(255,255,255,0.03); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class HelmBridgeComponent {
  propsContent = '';
  output: HelmOutput | null = null;
  displayedColumns: string[] = ['key', 'env', 'helm'];

  constructor(private tauri: TauriService) {}

  autoGen() {
    if (!this.propsContent.trim()) {
      this.output = null;
      return;
    }
    this.tauri.generateHelmValues(this.propsContent).subscribe(res => {
      this.output = res;
    });
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  async loadFile() {
    const selected = await this.tauri.selectFile('Properties/YAML laden', ['properties', 'yml', 'yaml', 'txt']);
    if (selected) {
      this.tauri.readTextFile(selected).subscribe(content => {
        this.propsContent = content;
        this.autoGen();
      });
    }
  }
}
