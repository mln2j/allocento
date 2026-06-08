import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslationService } from '../../core/services/translation.service';
import { LocalDbService } from '../../core/services/local-db';
import { AppInitializerService } from '../../core/services/app-initializer';
import { API_BASE_URL } from '../../core/api.config';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);
  private localDb = inject(LocalDbService);
  private appInitializer = inject(AppInitializerService);
  private router = inject(Router);

  // Reaktivna stanja
  totalBalance = signal<number>(0);
  primaryAccount = signal<any>(null);
  recentTransactions = signal<any[]>([]);
  spendingStats = signal<any[]>([]);
  activeWorkspaceName = signal<string>('');
  isOnline = signal<boolean>(true);

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.loadDashboardData();
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  async loadDashboardData() {
    if (!this.isOnline()) {
      // Učitavanje iz IndexedDB cachea ako je korisnik offline
      await this.loadFromCache();
      return;
    }

    try {
      const data = await firstValueFrom(this.http.get<any>(`${API_BASE_URL}/dashboard`));
      
      this.totalBalance.set(data.summary?.total_balance ?? 0);
      this.primaryAccount.set(data.summary?.primary_account ?? null);
      this.recentTransactions.set(data.recent_transactions ?? []);
      this.spendingStats.set(data.spending_stats ?? []);
      this.activeWorkspaceName.set(data.workspace?.name ?? '');

      // Spremi u IndexedDB cache za offline pristup
      await this.saveToCache(data);
    } catch (error) {
      console.warn('Greška pri učitavanju dashboarda s poslužitelja, pokušavam iz cachea...', error);
      await this.loadFromCache();
    }
  }

  private async saveToCache(data: any) {
    try {
      // Spremamo dashboard stanje pod ključem 'dashboard_summary'
      await this.localDb.put('user_profile', {
        id: 'dashboard_summary',
        total_balance: data.summary?.total_balance,
        primary_account: data.summary?.primary_account,
        recent_transactions: data.recent_transactions,
        spending_stats: data.spending_stats,
        workspace_name: data.workspace?.name
      });
    } catch (e) {
      console.warn('Failed to cache dashboard data', e);
    }
  }

  private async loadFromCache() {
    try {
      const cache = await this.localDb.getAll('user_profile');
      const dashboardCache = cache.find(item => item.id === 'dashboard_summary');
      if (dashboardCache) {
        this.totalBalance.set(dashboardCache.total_balance ?? 0);
        this.primaryAccount.set(dashboardCache.primary_account ?? null);
        this.recentTransactions.set(dashboardCache.recent_transactions ?? []);
        this.spendingStats.set(dashboardCache.spending_stats ?? []);
        this.activeWorkspaceName.set(dashboardCache.workspace_name ?? '');
      }
    } catch (e) {
      console.error('Greška pri učitavanju dashboard cachea', e);
    }
  }

  formatAmount(amount: number | string): string {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getTxAmountClass(tx: any): string {
    return tx.type === 'income' ? 'text-success font-bold' : 'text-slate-900 font-medium';
  }

  getTxSign(tx: any): string {
    return tx.type === 'income' ? '+' : '-';
  }
}
