import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button [attr.type]="type" [disabled]="disabled" [ngClass]="classes">
      <mat-icon *ngIf="icon">{{ icon }}</mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host button { display:inline-flex; align-items:center; gap:8px; padding: var(--gap-sm) var(--gap-md); border-radius:var(--radius-sm); font-weight:600; cursor:pointer; border:1px solid transparent; background:transparent; }
    :host button.btn-primary { background: var(--color-primary); color: var(--color-primary-contrast); border-color: transparent; }
    :host button.btn-ghost { background: transparent; color: var(--color-muted); border-color: transparent; }
    :host button.btn-danger { background: transparent; color: #dc2626; border-color: rgba(220,38,38,0.12); }
    :host button.btn-block { width:100%; justify-content:center; }
    :host button:disabled { opacity:0.65; cursor:not-allowed; }
    :host mat-icon { font-size:18px; }
  `]
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary';
  @Input() block = false;
  @Input() icon?: string;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get classes(): string {
    const v = this.variant === 'primary' ? 'btn-primary' : this.variant === 'ghost' ? 'btn-ghost' : 'btn-danger';
    return `${v}${this.block ? ' btn-block' : ''}`;
  }
}
