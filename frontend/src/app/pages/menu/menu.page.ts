import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.page.html'
})
export class MenuPage {
  private tService = inject(TranslationService);
  public workspaceService = inject(WorkspaceService);

  t(key: string): string {
    return this.tService.translate(key);
  }

  hasFeature(feature: string): boolean {
    const ws = this.workspaceService.activeWorkspace();
    if (!ws || !ws.enabled_features) return false;
    return ws.enabled_features.includes(feature);
  }
}
