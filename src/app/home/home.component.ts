import {
  AfterViewInit,
  Component,
  inject,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { bootstrapPollAppHome, getSharedPollService } from '../app-legacy-bootstrap';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private homeCleanup: (() => void) | null = null;

  /** Loads surveys from Supabase, then starts legacy DOM controllers. */
  public ngAfterViewInit(): void {
    void this.bootstrapHome();
  }

  /** Initializes poll data and wires the legacy home screen. */
  private async bootstrapHome(): Promise<void> {
    await getSharedPollService().initialize();
    this.homeCleanup = bootstrapPollAppHome((pollId) => {
      this.ngZone.run(() => {
        void this.router.navigate(['/survey-view-results', pollId]);
      });
    });
  }

  /** Tears down list subscriptions when leaving the home route. */
  public ngOnDestroy(): void {
    this.homeCleanup?.();
    this.homeCleanup = null;
  }
}
