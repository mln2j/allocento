import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { WorkspaceService } from '../../core/services/workspace.service';
import { TranslationService } from '../../core/services/translation.service';
import { Transaction } from '../../core/models/transaction.model';
import { SyncService } from '../../core/services/sync';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// Import Space Mono font base64 if provided
import { SPACE_MONO_FONT } from '../../core/utils/space-mono-font';
import { TransactionModalService } from '../../core/services/transaction-modal.service';
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.css'
})
export class ReportsPage implements OnInit {
  private transactionRepo = inject(TransactionRepository);
  private workspaceService = inject(WorkspaceService);
  private translation = inject(TranslationService);
  private syncService = inject(SyncService);
  private transactionModalService = inject(TransactionModalService);

  t = this.translation.translate.bind(this.translation);

  // States
  isLoading = signal<boolean>(true);
  allTransactions = signal<Transaction[]>([]);
  
  // Filters
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedProject = signal<number | null>(null);
  selectedCategory = signal<number | null>(null);

  // Lists for dropdowns
  projects = computed(() => {
    const txs = this.allTransactions();
    const projMap = new Map<number, { id: number, name: string }>();
    txs.forEach(t => {
      if (t.project) {
        projMap.set(t.project.id, t.project);
      }
    });
    return Array.from(projMap.values());
  });
  
  categories = computed(() => {
    const txs = this.allTransactions();
    const catMap = new Map<number, { id: number, name: string }>();
    txs.forEach(t => {
      if (t.category) {
        catMap.set(t.category.id, t.category);
      }
    });
    return Array.from(catMap.values());
  });

  // Filtered transactions
  filteredTransactions = computed(() => {
    let txs = this.allTransactions();

    if (this.startDate()) {
      const start = new Date(this.startDate());
      txs = txs.filter(t => new Date(t.date) >= start);
    }

    if (this.endDate()) {
      const end = new Date(this.endDate());
      end.setHours(23, 59, 59, 999);
      txs = txs.filter(t => new Date(t.date) <= end);
    }

    if (this.selectedProject()) {
      txs = txs.filter(t => t.projectId === this.selectedProject());
    }

    if (this.selectedCategory()) {
      txs = txs.filter(t => t.categoryId === this.selectedCategory());
    }

    return txs;
  });

  // Calculations
  totalIncome = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  });

  totalExpense = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  });

  balance = computed(() => this.totalIncome() - this.totalExpense());

  // Line Chart for Trend
  lineChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const txs = this.filteredTransactions().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const dayMapIncome = new Map<string, number>();
    const dayMapExpense = new Map<string, number>();
    const labels = new Set<string>();

    txs.forEach(t => {
      const label = new Date(t.date).toLocaleDateString(this.translation.currentLang(), { month: 'short', day: 'numeric' });
      labels.add(label);
      if (t.type === 'income') {
        dayMapIncome.set(label, (dayMapIncome.get(label) || 0) + Number(t.amount));
      } else {
        dayMapExpense.set(label, (dayMapExpense.get(label) || 0) + Number(t.amount));
      }
    });

    const labelArr = Array.from(labels);

    return {
      labels: labelArr,
      datasets: [
        {
          data: labelArr.map(l => dayMapIncome.get(l) || 0),
          label: this.t('projects.totalIncome') || 'Prihodi',
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          data: labelArr.map(l => dayMapExpense.get(l) || 0),
          label: this.t('projects.totalExpense') || 'Troškovi',
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  });

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      x: { grid: { display: false } },
      y: { border: { display: false } }
    }
  };

  // CSS Donut Chart logic
  spendingStats = computed(() => {
    const txs = this.filteredTransactions().filter(t => t.type === 'expense');
    const catMap = new Map<string, { amount: number, color: string }>();

    txs.forEach(t => {
      const name = t.category?.name || this.t('transactions.other') || 'Ostalo';
      const color = t.category?.color || '#cbd5e1'; // fallback color
      const current = catMap.get(name) || { amount: 0, color: color };
      current.amount += Number(t.amount);
      catMap.set(name, current);
    });

    return Array.from(catMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, color: data.color }))
      .sort((a, b) => b.amount - a.amount);
  });

  spendingByProject = computed(() => {
    const txs = this.filteredTransactions().filter(t => t.type === 'expense');
    const projMap = new Map<string, { amount: number, color: string }>();

    txs.forEach(t => {
      const name = t.project?.name || this.t('transactions.other') || 'Ostalo';
      const color = t.project?.color || '#94a3b8'; // fallback color
      const current = projMap.get(name) || { amount: 0, color: color };
      current.amount += Number(t.amount);
      projMap.set(name, current);
    });

    return Array.from(projMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, color: data.color }))
      .sort((a, b) => b.amount - a.amount);
  });

  getTotalSpending(type: 'categories' | 'projects' = 'categories'): number {
    const stats = type === 'categories' ? this.spendingStats() : this.spendingByProject();
    return stats.reduce((sum, item) => sum + item.amount, 0);
  }

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

  openTxModal(tx: any) {
    this.transactionModalService.openModal(tx);
  }

  get currentUserId(): number | null {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.id || null;
    } catch {
      return null;
    }
  }

  isFuture(tx: any): boolean {
    if (!tx || !tx.date) return false;
    return new Date(tx.date).getTime() > Date.now();
  }

  formatAmount(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined) return '0,00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ngOnInit() {
    this.loadTransactions();
    
    // Default to this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate.set(firstDay.toISOString().split('T')[0]);
    this.endDate.set(lastDay.toISOString().split('T')[0]);

    // Osvježi kad se dogodi sinkronizacija
    this.syncService.syncCompleted$.subscribe(() => {
      this.loadTransactions();
    });
  }

  loadTransactions() {
    this.isLoading.set(true);
    this.transactionRepo.listAll().subscribe({
      next: (txs) => {
        this.allTransactions.set(txs);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions for reports', err);
        this.isLoading.set(false);
      }
    });
  }

  exportToCsv() {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return;

    // CSV Headers
    const headers = [
      this.t('common.date') || 'Datum', 
      this.t('transactions.typeLabel') || 'Tip', 
      this.t('transactions.amountLabel') || 'Iznos', 
      this.t('transactions.categoryLabel') || 'Kategorija', 
      this.t('transactions.projectLabel') || 'Projekt', 
      this.t('transactions.descLabel') || 'Opis'
    ];
    
    const rows = txs.map(t => {
      const date = new Date(t.date).toLocaleDateString(this.translation.currentLang());
      const type = t.type === 'income' ? (this.t('transactions.income') || 'Prihod') : (this.t('transactions.expense') || 'Rashod');
      const amount = Number(t.amount).toFixed(2);
      const cat = t.category?.name || this.t('transactions.other') || '';
      const proj = t.project?.name || '';
      const desc = t.description === 'balance_correction' ? (this.t('transactions.balanceCorrection') || 'Korekcija stanja') : (t.description ? t.description.replace(/"/g, '""') : '');
      
      return `"${date}","${type}","${amount}","${cat}","${proj}","${desc}"`;
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `izvjestaj_${this.startDate()}_${this.endDate()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPdf() {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return;

    // Create a new jsPDF document
    const doc = new jsPDF();

    // Register Space Mono font if the base64 string is provided; otherwise fallback to built‑in Courier
    if (typeof SPACE_MONO_FONT !== 'undefined' && SPACE_MONO_FONT && SPACE_MONO_FONT.length > 0) {
      // Add the font file to the virtual file system
      doc.addFileToVFS('SpaceMono-Regular.ttf', SPACE_MONO_FONT);
      // Register the font with jsPDF
      doc.addFont('SpaceMono-Regular.ttf', 'SpaceMono', 'normal');
      doc.setFont('SpaceMono');
    } else {
      // Use Helvetica as fallback font
      doc.setFont('Helvetica');
    }

    const activeWorkspace = this.workspaceService.activeWorkspace();
    const currency = activeWorkspace?.currency || 'EUR';

    doc.setFontSize(20);
    doc.text(this.t('reports.title') || 'Financijski izvjestaj', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${this.t('reports.period') || 'Period'}: ${this.startDate()} do ${this.endDate()}`, 14, 32);
    doc.text(`${this.t('reports.totalIncome') || 'Ukupni prihod'}: ${this.totalIncome().toFixed(2)} ${currency}`, 14, 38);
    doc.text(`${this.t('reports.totalExpense') || 'Ukupni rashod'}: ${this.totalExpense().toFixed(2)} ${currency}`, 14, 44);
    doc.text(`${this.t('reports.balance') || 'Stanje'}: ${this.balance().toFixed(2)} ${currency}`, 14, 50);

    const body = txs.map(t => [
      new Date(t.date).toLocaleDateString(this.translation.currentLang()),
      t.type === 'income' ? '+' : '-',
      `${Number(t.amount).toFixed(2)} ${currency}`,
      t.category?.name || this.t('transactions.other') || '-',
      t.project?.name || '-',
      t.description === 'balance_correction' ? (this.t('transactions.balanceCorrection') || 'Korekcija stanja') : (t.description || '-')
    ]);

    autoTable(doc, {
      startY: 60,
      head: [[
        this.t('common.date') || 'Datum', 
        this.t('transactions.typeLabel') || 'Tip', 
        this.t('transactions.amountLabel') || 'Iznos', 
        this.t('transactions.categoryLabel') || 'Kategorija', 
        this.t('transactions.projectLabel') || 'Projekt', 
        this.t('transactions.descLabel') || 'Opis'
      ]],
      body: body,
      // Use the selected monospaced font for the table
      // Use the selected font for the table; Helvetica if custom font not provided
      styles: { font: (typeof SPACE_MONO_FONT !== 'undefined' && SPACE_MONO_FONT && SPACE_MONO_FONT.length > 0) ? 'SpaceMono' : 'Helvetica' },
      headStyles: { fillColor: [98, 30, 149], font: (typeof SPACE_MONO_FONT !== 'undefined' && SPACE_MONO_FONT && SPACE_MONO_FONT.length > 0) ? 'SpaceMono' : 'Helvetica' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`izvjestaj_${this.startDate()}_${this.endDate()}.pdf`);
  }
}
