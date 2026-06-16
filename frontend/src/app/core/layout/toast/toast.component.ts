import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-[90%] px-4 pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()"
           class="pointer-events-auto px-4 py-2.5 rounded-full shadow-md border text-xs font-bold font-mono transition-all animate-in slide-in-from-bottom-2 fade-in duration-300 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
           [ngClass]="{
             'bg-green-50 border-green-200 text-green-800': toast.type === 'success',
             'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
             'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning',
             'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
           }">
        <span>{{ toast.message }}</span>
      </div>
    </div>
  `
})
export class ToastComponent {
  public toastService = inject(ToastService);
}
