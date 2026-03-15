import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { from, Observable } from 'rxjs';


export interface HelmMapping {
  key: String;
  env_var: String;
  helm_value: String;
}

export interface DependencyInfo {
  module_name: string;
  group_id: string;
  artifact_id: string;
  version: string;
  latest_version?: string;
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity: string;
}

export interface HelmOutput {
  values_yaml: string;
  deployment_snippet: string;
  mappings: HelmMapping[];
}

@Injectable({
  providedIn: 'root'
})
export class TauriService {

  constructor() { }

  checkDocker(): Observable<boolean> {
    return from(invoke<boolean>('check_docker'));
  }

  generateFromSqlDump(filePath: string, dbType: string, format: string): Observable<string> {
    return from(invoke<string>('generate_from_sql_dump', { filePath, dbType, format }));
  }

  generateFromDdl(ddlContent: string, format: string): Observable<string> {
    return from(invoke<string>('generate_from_ddl', { ddlContent, format }));
  }

  generateHelmValues(propsContent: string): Observable<HelmOutput> {
    return from(invoke<HelmOutput>('generate_helm_values', { propsContent }));
  }

  checkPomDependencies(filePath: string): Observable<DependencyInfo[]> {
    return from(invoke<DependencyInfo[]>('check_pom_dependencies', { filePath }));
  }

  async selectFile(title: string, extensions: string[] = ['*']): Promise<string | null> {
    const selected = await open({
      title,
      multiple: false,
      directory: false,
      filters: [{
        name: 'Files',
        extensions: extensions
      }]
    });
    return selected as string | null;
  }

  readTextFile(path: string): Observable<string> {
    return from(invoke<string>('read_text_file', { path }));
  }

  generateSbom(dependencies: DependencyInfo[], savePath: string): Observable<string> {
    return from(invoke<string>('generate_cyclonedx_sbom', { dependencies, savePath }));
  }




  async selectDirectory(title: string): Promise<string | null> {
    const selected = await open({
      title: title,
      directory: true,
      multiple: false
    });

    return selected ? (Array.isArray(selected) ? selected[0] : selected) : null;
  }


}
