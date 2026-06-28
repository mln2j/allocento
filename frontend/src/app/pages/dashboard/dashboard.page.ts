import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslationService } from '../../core/services/translation.service';
import { LocalDbService } from '../../core/services/local-db';
import { AppInitializerService } from '../../core/services/app-initializer';
import { API_BASE_URL } from '../../core/api.config';
import { firstValueFrom } from 'rxjs';
import { WorkspaceService } from '../../core/services/workspace.service';
import { TransactionModalService } from '../../core/services/transaction-modal.service';
import { SyncService } from '../../core/services/sync';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);
  private localDb = inject(LocalDbService);
  private appInitializer = inject(AppInitializerService);
  private router = inject(Router);
  private workspaceService = inject(WorkspaceService);
  public transactionModalService = inject(TransactionModalService);
  private syncService = inject(SyncService);

  // Reaktivna stanja
  totalBalance = signal<number>(0);
  primaryAccount = signal<any>(null);
  recentTransactions = signal<any[]>([]);
  spendingStats = signal<any[]>([]);
  dailySpending = signal<any[]>([]);
  activeWorkspaceName = signal<string>('');
  isOnline = computed(() => this.appInitializer.isOnlineMode);
  isLoading = signal<boolean>(true);
  activeWorkspace = this.workspaceService.activeWorkspace;

  // Tab switcher state
  spendingByProject = signal<any[]>([]);

  // Tab switcher state
  activeTab = signal<'categories' | 'projects' | 'days'>('days');

  get hasCategories(): boolean {
    const stats = this.spendingStats();
    if (!stats || stats.length <= 2) return false;
    return true;
  }

  get hasProjects(): boolean {
    const stats = this.spendingByProject();
    if (!stats || stats.length <= 2) return false;
    return true;
  }

  setDefaultTab() {
    this.activeTab.set('days');
  }

  ngOnInit() {
    this.loadDashboardData();

    // Refresh dashboard on modal save
    this.transactionModalService.saved$.subscribe(() => {
      this.loadDashboardData();
    });

    // Refresh dashboard on offline sync completion
    this.syncService.syncCompleted$.subscribe(() => {
      this.loadDashboardData();
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  openTxModal(tx: any) {
    this.transactionModalService.openModal(tx);
  }

  async loadDashboardData() {
    // Učitaj iz IndexedDB cachea odmah da izbjegneš prazne render države
    await this.loadFromCache();

    if (!this.isOnline()) {
      return;
    }

    try {
      // Background revalidation bez blokiranja korisničkog sučelja
      const data = await firstValueFrom(
        this.http.get<any>(`${API_BASE_URL}/dashboard`, {
          headers: { 'X-Skip-Loader': 'true' }
        })
      );
      
      this.totalBalance.set(data.summary?.total_balance ?? 0);
      this.primaryAccount.set(data.summary?.primary_account ?? null);
      this.recentTransactions.set(data.recent_transactions ?? []);
      this.spendingStats.set(data.spending_stats ?? []);
      this.spendingByProject.set(data.spending_by_project ?? []);
      this.dailySpending.set(data.daily_spending ?? []);
      this.setDefaultTab();
      this.activeWorkspaceName.set(data.workspace?.name ?? '');

      // Spremi u IndexedDB cache za offline pristup
      await this.saveToCache(data);
    } catch (error) {
      console.warn('Greška pri učitavanju dashboarda s poslužitelja:', error);
    } finally {
      this.isLoading.set(false);
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
        spending_by_project: data.spending_by_project,
        daily_spending: data.daily_spending,
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
        let currentBalance = dashboardCache.total_balance ?? 0;
        let recentTxs = dashboardCache.recent_transactions ?? [];

        // Dodaj offline transakcije koje još nisu sinkronizirane
        try {
          const offlineTxs = await this.localDb.getAll('transactions');
          const queuedTxs = offlineTxs.filter(t => t.id < 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          if (queuedTxs.length > 0) {
            recentTxs = [...queuedTxs, ...recentTxs].slice(0, 5); // Zadrži samo 5 najnovijih
            // Ažuriraj lokalni balans vizualno
            for (const tx of queuedTxs) {
              if (tx.type === 'income') currentBalance += Number(tx.amount);
              else if (tx.type === 'expense') currentBalance -= Number(tx.amount);
            }
          }
        } catch(e) {}

        this.totalBalance.set(currentBalance);
        this.primaryAccount.set(dashboardCache.primary_account ?? null);
        this.recentTransactions.set(recentTxs);
        this.spendingStats.set(dashboardCache.spending_stats ?? []);
        this.spendingByProject.set(dashboardCache.spending_by_project ?? []);
        this.dailySpending.set(dashboardCache.daily_spending ?? []);
        this.setDefaultTab();
        this.activeWorkspaceName.set(dashboardCache.workspace_name ?? '');
        this.isLoading.set(false); // Podaci odmah dostupni
      }
    } catch (e) {
      console.error('Greška pri učitavanju dashboard cachea', e);
    }
  }

  formatAmount(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined) return '0,00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get currentUserId(): number | null {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.id || null;
    } catch {
      return null;
    }
  }

  getTxAmountClass(tx: any): string {
    return tx.type === 'income' ? 'text-success font-bold' : 'text-slate-900 font-medium';
  }

  getTxSign(tx: any): string {
    return tx.type === 'income' ? '+' : '-';
  }

  isFuture(tx: any): boolean {
    if (!tx || !tx.date) return false;
    return new Date(tx.date).getTime() > Date.now();
  }

  // Categories Donut Chart Gradient generator
  getDonutGradientStyle(type: 'categories' | 'projects' = 'categories'): string {
    const stats = type === 'categories' ? this.spendingStats() : this.spendingByProject();
    if (!stats || stats.length === 0) {
      return 'conic-gradient(#f1f5f9 0% 100%)';
    }
    const total = stats.reduce((sum, item) => sum + item.amount, 0);
    if (total === 0) {
      return 'conic-gradient(#f1f5f9 0% 100%)';
    }
    let accumulatedPercent = 0;
    const slices = stats.map(item => {
      const percent = (item.amount / total) * 100;
      const start = accumulatedPercent;
      accumulatedPercent += percent;
      return `${item.color || '#621E95'} ${start.toFixed(1)}% ${accumulatedPercent.toFixed(1)}%`;
    });
    return `conic-gradient(${slices.join(', ')})`;
  }

  getCategoryPercentage(amount: number, type: 'categories' | 'projects' = 'categories'): number {
    const stats = type === 'categories' ? this.spendingStats() : this.spendingByProject();
    const total = stats.reduce((sum, item) => sum + item.amount, 0);
    if (total === 0) return 0;
    return Math.round((amount / total) * 100);
  }

  getDayBarHeight(amount: number): number {
    const days = this.dailySpending();
    const max = Math.max(...days.map(d => d.amount), 0);
    if (max === 0) return 5;
    return Math.max(5, Math.round((amount / max) * 90));
  }

  // Chart.js Configuration
  lineChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const days = this.dailySpending();
    if (!days || days.length === 0) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: days.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString(this.translationService.currentLang(), { weekday: 'short' });
      }),
      datasets: [
        {
          data: days.map(d => Number(d.amount)),
          label: this.t('dashboard.spending') || 'Spending',
          fill: true,
          tension: 0.4,
          borderColor: '#7f5af0',
          backgroundColor: 'rgba(127, 90, 240, 0.2)',
          pointBackgroundColor: '#7f5af0',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#7f5af0',
        }
      ]
    };
  });

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat(this.translationService.currentLang(), { style: 'currency', currency: this.activeWorkspace()?.currency || 'EUR' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { border: { display: false } }
    }
  };

  getTotalSpending(type: 'categories' | 'projects' = 'categories'): number {
    const stats = type === 'categories' ? this.spendingStats() : this.spendingByProject();
    return stats.reduce((sum, item) => sum + (item.amount || 0), 0);
  }
}

