import { Component, Input } from '@angular/core';

type Q2Key = 'a' | 'b' | 'c' | 'd' | 'e';
const Q2_KEYS: readonly Q2Key[] = ['a', 'b', 'c', 'd', 'e'];

/** Keeps only the first selected Q2 option when multi-select is disabled. */
function collapseQ2Selections(
  selections: Record<Q2Key, boolean>,
): void {
  let kept = false;
  for (const key of Q2_KEYS) {
    if (!selections[key]) {
      continue;
    }
    if (kept) {
      selections[key] = false;
    } else {
      kept = true;
    }
  }
}

@Component({
  selector: 'app-survey-view-results-demo-questions',
  standalone: true,
  templateUrl: './survey-view-results-demo-questions.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class SurveyViewResultsDemoQuestionsComponent {
  @Input() leadWithTemplateQ1 = false;

  previewQ1Checked = { a: false, b: false, c: false, d: false };

  demoPreview = {
    q2: { a: false, b: false, c: false, d: false, e: false },
    q3: { a: false, b: false, c: false, d: false },
    q4: { a: false, b: false, c: false },
  };

  q2MultipleEnabled = false;

  /** Toggles one template preview option in question 1. */
  toggleQ1(key: 'a' | 'b' | 'c' | 'd'): void {
    this.previewQ1Checked[key] = !this.previewQ1Checked[key];
  }

  /** Toggles multi-select mode for demo question 2. */
  toggleQ2MultipleHint(): void {
    this.q2MultipleEnabled = !this.q2MultipleEnabled;
    if (!this.q2MultipleEnabled) {
      collapseQ2Selections(this.demoPreview.q2);
    }
  }

  /** Toggles one option in demo question 2. */
  toggleQ2(key: Q2Key): void {
    if (this.q2MultipleEnabled) {
      this.demoPreview.q2[key] = !this.demoPreview.q2[key];
      return;
    }
    const wasOn = this.demoPreview.q2[key];
    for (const entry of Q2_KEYS) {
      this.demoPreview.q2[entry] = false;
    }
    if (!wasOn) {
      this.demoPreview.q2[key] = true;
    }
  }

  /** Toggles one option in demo question 3. */
  toggleQ3(key: 'a' | 'b' | 'c' | 'd'): void {
    this.demoPreview.q3[key] = !this.demoPreview.q3[key];
  }

  /** Toggles one option in demo question 4. */
  toggleQ4(key: 'a' | 'b' | 'c'): void {
    this.demoPreview.q4[key] = !this.demoPreview.q4[key];
  }
}
