import { AfterViewInit, Component } from '@angular/core';

import { bootstrapPollApp } from './app-legacy-bootstrap';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    bootstrapPollApp();
  }
}
