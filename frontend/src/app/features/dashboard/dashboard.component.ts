import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../core/api.config';
import { ButtonComponent } from '../../shared/button/button.component';
import { LocalDbService } from '../../core/services/local-db';
import { AppInitializerService } from '../../core/services/app-initializer';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private localDb = inject(LocalDbService);
  private appInitializer = inject(AppInitializerService);
  private translationService = inject(TranslationService);

  data: any = null;
  isLoading = true;

  ngOnInit() {
    this.loadDashboard();
  }

  async loadDashboard() {
    this.isLoading = true;

    if (!this.appInitializer.isOnlineMode) {
      // Offline: Učitaj iz IndexedDB cachea
      await this.loadFromCache();
      return;
    }

    this.http.get<any>(`${API_BASE_URL}/dashboard`).subscribe({
      next: async (res) => {
        this.data = res;
        this.isLoading = false;
        // Spremi u IndexedDB cache za offline potrebe
        try {
          await this.localDb.put('user_profile', { id: 'dashboard_cache', data: res });
        } catch (e) {
          console.warn('Failed to cache dashboard data', e);
        }
      },
      error: async () => {
        // Fallback na cache ako API baci grešku
        await this.loadFromCache();
      }
    });
  }

  private async loadFromCache() {
    try {
      const cached = await this.localDb.getAll('user_profile');
      const dashCache = cached.find(item => item.id === 'dashboard_cache');
      if (dashCache) {
        this.data = dashCache.data;
      }
    } catch (e) {
      console.error('Failed to load dashboard from cache', e);
    } finally {
      this.isLoading = false;
    }
  }

  onAddTransaction() {
    this.router.navigate(['/transactions', 'new']);
  }

  getSpendingPercentage(amount: number): number {
    const total = this.data?.spending_stats?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 1;
    return (amount / total) * 100;
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
