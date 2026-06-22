import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoggerService } from '../../services/logger.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  @Input() isOnline = true;
  @Input() notificationCount = 0;
  @Output() notificationClick = new EventEmitter<void>();

  private logger = inject(LoggerService);
  private translationService = inject(TranslationService);

  t(key: string, params?: any): string {
    return this.translationService.translate(key, params) || key.split('.').pop() || key;
  }

  onBrandClick(): void {
    this.logger.log('Header: Kliknut povratak na Dashboard via Logo');
  }

  onNotificationTrigger(): void {
    this.logger.log('Header: Kliknuta ikona za obavijesti/invitations');
    this.notificationClick.emit();
  }
}
