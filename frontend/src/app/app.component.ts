import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SqlTranslatorComponent } from './features/sql-translator/sql-translator.component';
import { ErDiagramComponent } from './features/er-diagram/er-diagram.component';
import { HelmBridgeComponent } from './features/helm-bridge/helm-bridge.component';
import { DependencyCheckComponent } from './features/dependency-check/dependency-check.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    MatTabsModule, 
    MatToolbarModule, 
    MatIconModule,
    MatButtonModule,
    SqlTranslatorComponent,
    ErDiagramComponent,
    HelmBridgeComponent,
    DependencyCheckComponent
  ],
  template: `
    <mat-toolbar color="primary" class="header mat-elevation-z4">
      <mat-icon class="logo-icon">account_tree</mat-icon>
      <span class="title">Cody Loom</span>
      <span class="spacer"></span>
      <button mat-icon-button (click)="toggleTheme()">
        <mat-icon>{{ darkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
    </mat-toolbar>

    <div class="content-container" [class.dark-theme]="darkMode">
      <mat-tab-group dynamicHeight animationDuration="500ms">
        <mat-tab label="SQL Übersetzer">
          <app-sql-translator></app-sql-translator>
        </mat-tab>
        <mat-tab label="ER-Diagramm / DDL">
          <app-er-diagram></app-er-diagram>
        </mat-tab>
        <mat-tab label="Properties Bridge">
          <app-helm-bridge></app-helm-bridge>
        </mat-tab>
        <mat-tab label="Dependency Check">
          <app-dependency-check></app-dependency-check>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .header {
      z-index: 10;
      position: sticky;
      top: 0;
    }
    .logo-icon {
      margin-right: 12px;
    }
    .title {
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .content-container {
      height: calc(100vh - 64px);
      overflow-y: auto;
      background: #fafafa;
    }
    .dark-theme {
      background: #121212;
      color: #e0e0e0;
    }
    ::ng-deep .mat-mdc-tab-group {
      background: transparent;
    }
  `]
})
export class AppComponent implements OnInit {
  darkMode = true;

  ngOnInit() {
    if (this.darkMode) {
      document.body.classList.add('dark-theme');
    }
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  constructor() {}
}
