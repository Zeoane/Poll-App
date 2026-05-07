import {
  AfterViewInit,
  Component,
  inject,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { bootstrapPollAppHome } from '../app-legacy-bootstrap';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private homeCleanup: (() => void) | null = null;

  public ngAfterViewInit(): void {
    this.homeCleanup = bootstrapPollAppHome((pollId) => {
      this.ngZone.run(() => {
        void this.router.navigate(['/survey-view-results', pollId]);
      });
    });
  }

  public ngOnDestroy(): void {
    this.homeCleanup?.();
    this.homeCleanup = null;
  }
}
