import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoggerService } from '../../services/logger.service';

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

  onBrandClick(): void {
    this.logger.log('Header: Kliknut povratak na Dashboard via Logo');
  }

  onNotificationTrigger(): void {
    this.logger.log('Header: Kliknuta ikona za obavijesti/invitations');
    this.notificationClick.emit();
  }
}
