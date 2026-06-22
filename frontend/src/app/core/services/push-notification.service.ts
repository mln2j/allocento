import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  public get messages$() {
    return this.swPush.messages;
  }

  async subscribeToNotifications() {
    if (!this.swPush.isEnabled) {
      this.logger.warn('Service Worker i Push Notifications nisu omogućeni u ovom pregledniku.');
      return;
    }

    try {
      // 1. Fetch VAPID public key from backend
      const response: any = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/push/public-key`)
      );

      const vapidPublicKey = response.public_key;

      // 2. Request subscription from the browser
      const pushSubscription = await this.swPush.requestSubscription({
        serverPublicKey: vapidPublicKey
      });

      // 3. Send the subscription object to Laravel
      await firstValueFrom(
        this.http.post(`${API_BASE_URL}/push/subscribe`, pushSubscription.toJSON())
      );

      this.logger.log('Uspješno pretplaćeno na Web Push obavijesti!');
    } catch (error) {
      this.logger.error('Greška pri pretplati na Web Push:', error);
    }
  }

  async unsubscribe() {
    if (!this.swPush.isEnabled) return;
    try {
      const subscription = await firstValueFrom(this.swPush.subscription);
      if (subscription) {
        await firstValueFrom(
          this.http.post(`${API_BASE_URL}/push/unsubscribe`, { endpoint: subscription.endpoint })
        );
        await subscription.unsubscribe();
        this.logger.log('Uspješno odjavljeno s Push obavijesti.');
      }
    } catch (error) {
      this.logger.error('Greška pri odjavi s Push obavijesti:', error);
    }
  }
}
