import { Component, ContentChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-container">
      @if (hasHeader()) {
        <header class="container-header">
          <ng-content select="[header]"></ng-content>
        </header>
      }
      <main class="page-container">
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styles: [`
    .app-container { min-height: 100%; display:flex; flex-direction:column; background: var(--color-bg); }
    .container-header { background: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: 12px; box-shadow: 0 1px 0 rgba(15,23,42,0.02); }
    .page-container { padding: 16px; max-width: var(--max-width); margin: 0 auto; box-sizing: border-box; }
  `]
})
export class ContainerComponent {
  @ContentChild('[header]', { read: ElementRef }) headerElement?: ElementRef;

  hasHeader(): boolean {
    return !!this.headerElement;
  }
}
