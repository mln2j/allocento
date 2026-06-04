import { Injectable, signal, computed, inject } from '@angular/core';
import { Workspace, WorkspaceRepository } from '../repositories/workspace.repository';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private workspaceRepo = inject(WorkspaceRepository);

  // Signal koji drži trenutno aktivni workspace u memoriji aplikacije
  private _activeWorkspace = signal<Workspace | null>(null);

  // Javni read-only signal koji komponente mogu slušati
  activeWorkspace = computed(() => this._activeWorkspace());

  // Postavi aktivni prostor ručno
  setActiveWorkspace(workspace: Workspace) {
    this._activeWorkspace.set(workspace);
    // Po želji možeš spremiti ID u localStorage kao fallback pri refreshu
    localStorage.setItem('active_workspace_id', workspace.workspace_id || String(workspace.id));
  }

  // Očisti aktivni prostor (npr. kod logouta)
  clearActiveWorkspace() {
    this._activeWorkspace.set(null);
    localStorage.removeItem('active_workspace_id');
  }
}
