import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { API_BASE_URL } from '../../core/api.config';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RouterLink,
    ButtonComponent
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  data: any = null;
  isLoading = true;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.isLoading = true;
    this.http.get<any>(`${API_BASE_URL}/dashboard`).subscribe({
      next: (res) => {
        this.data = res;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  onAddTransaction() {
    this.router.navigate(['/transactions/new']);
  }

  getSpendingPercentage(amount: number): number {
    const total = this.data?.spending_stats?.reduce((acc: number, curr: any) => acc + curr.amount, 0) || 1;
    return (amount / total) * 100;
  }
}
