import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/layout/toast/toast.component';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet/>
    <app-toast/>
  `,
})
export class AppComponent implements OnInit {
  private swUpdate = inject(SwUpdate);
  private toastService = inject(ToastService);

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      // Check for update immediately on load
      this.swUpdate.checkForUpdate();

      // Listen for when a new version is downloaded and ready
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.toastService.success('Nova verzija preuzeta, osvježavam...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        });
    }
  }
}
