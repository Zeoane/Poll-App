import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

/** Logs a failed Angular bootstrap attempt to the console. */
function logBootstrapError(err: unknown): void {
  console.error(err);
}

bootstrapApplication(AppComponent, appConfig).catch(logBootstrapError);
