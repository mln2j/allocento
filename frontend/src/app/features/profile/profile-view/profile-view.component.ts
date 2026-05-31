import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User } from '../../../core/models/user.model';
import { API_BASE_URL } from '../../../core/api.config';
import { AuthService } from '../../../core/services/auth.service';
import { UserRepository } from '../../../core/repositories/user.repository';
import { HouseholdRepository } from '../../../core/repositories/household.repository';
import { OrganizationRepository } from '../../../core/repositories/organization.repository';
import { ContainerComponent } from '../../../core/layout/container/container.component';
import { TranslationService } from '../../../core/services/translation.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterLink, ContainerComponent],
  templateUrl: './profile-view.component.html',
})
export class ProfileViewComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userRepo = inject(UserRepository);
  private householdRepo = inject(HouseholdRepository);
  private orgRepo = inject(OrganizationRepository);
  private translationService = inject(TranslationService);

  user: User | null = null;
  householdName: string | null = null;
  organizationName: string | null = null;

  ngOnInit() {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe(user => {
      this.user = user;
      this.loadEntities(user);
    });
  }

  loadEntities(user: User) {
    const requests: any = {};
    if (user.household_id) requests.household = this.householdRepo.get().pipe(catchError(() => of(null)));
    if (user.organization_id) requests.org = this.orgRepo.get().pipe(catchError(() => of(null)));

    forkJoin(requests).subscribe((res: any) => {
      this.householdName = res.household?.name;
      this.organizationName = res.org?.name;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  deleteAccount() {
    if (confirm('Delete account? This action cannot be undone.')) {
      this.userRepo.deleteAccount().subscribe(() => this.logout());
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
