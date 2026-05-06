import {
  AfterViewInit,
  Component,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { bootstrapPollAppHome } from '../app-legacy-bootstrap';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private homeCleanup: (() => void) | null = null;

  public ngAfterViewInit(): void {
    this.homeCleanup = bootstrapPollAppHome();
  }

  public ngOnDestroy(): void {
    this.homeCleanup?.();
    this.homeCleanup = null;
  }
}
