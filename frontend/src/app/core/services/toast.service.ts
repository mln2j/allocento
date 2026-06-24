import { Injectable, signal, inject } from '@angular/core';
import { TranslationService } from './translation.service';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  toasts = signal<Toast[]>([]);
  private translationService = inject(TranslationService, { optional: true });

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  private show(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    if (type === 'error' && message && message.toLowerCase() === 'server error') {
      message = this.translationService?.translate('common.serverError') || 'Greška poslužitelja';
    }

    const id = this.nextId++;
    const newToast: Toast = { id, message, type };
    this.toasts.update((current) => [...current, newToast]);

    setTimeout(() => {
      this.dismiss(id);
    }, 4000);
  }

  dismiss(id: number) {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
