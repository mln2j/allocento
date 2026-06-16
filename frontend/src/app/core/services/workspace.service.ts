import { Injectable, signal, computed, inject } from '@angular/core';
import { Workspace, WorkspaceRepository } from '../repositories/workspace.repository';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private workspaceRepo = inject(WorkspaceRepository);

  private _activeWorkspace = signal<Workspace | null>(this.loadFromStorage());

  activeWorkspace = computed(() => this._activeWorkspace());

  private loadFromStorage(): Workspace | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem('active_workspace_full');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  setActiveWorkspace(workspace: Workspace) {
    this._activeWorkspace.set(workspace);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('active_workspace_full', JSON.stringify(workspace));
      localStorage.setItem('active_workspace_id', workspace.workspace_id || String(workspace.id));
    }
  }

  clearActiveWorkspace() {
    this._activeWorkspace.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('active_workspace_id');
      localStorage.removeItem('active_workspace_full');
    }
  }
}
