import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface AlertDialogData {
  title: string;
  message: string;
  buttonText?: string;
}

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="p-6 max-w-sm bg-white rounded-2xl flex flex-col items-center text-center">
      <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>

      <h2 class="text-base font-bold font-mono text-slate-900 mb-2">{{ data.title }}</h2>
      <p class="text-xs text-slate-500 font-sans leading-relaxed mb-6">{{ data.message }}</p>

      <button 
        (click)="onClose()"
        class="w-full h-11 bg-brand-purple hover:bg-[#4a1772] text-white font-bold font-mono text-xs rounded-xl transition-all cursor-pointer outline-none shadow-md"
      >
        {{ data.buttonText || 'OK' }}
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class AlertDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AlertDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
