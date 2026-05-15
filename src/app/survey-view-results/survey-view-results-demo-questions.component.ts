import { Component, Input } from '@angular/core';

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
  /** In template preview, render Question 1 here so all items share the same host (same grid/hit-testing as Q2–Q4). */
  @Input() leadWithTemplateQ1 = false;

  /** Template preview — Question 1 (button toggles avoid fragile checkbox hit-testing). */
  previewQ1Checked = { a: false, b: false, c: false, d: false };

  /** Questions 2–4 — same pattern */
  demoPreview = {
    q2: { a: false, b: false, c: false, d: false, e: false },
    q3: { a: false, b: false, c: false, d: false },
    q4: { a: false, b: false, c: false },
  };

  toggleQ1(key: 'a' | 'b' | 'c' | 'd'): void {
    this.previewQ1Checked[key] = !this.previewQ1Checked[key];
  }

  /** Question 2: allow multiple option selections only after the hint control is activated. */
  q2MultipleEnabled = false;

  toggleQ2MultipleHint(): void {
    this.q2MultipleEnabled = !this.q2MultipleEnabled;
    if (!this.q2MultipleEnabled) {
      const keys = ['a', 'b', 'c', 'd', 'e'] as const;
      let kept = false;
      for (const k of keys) {
        if (!this.demoPreview.q2[k]) {
          continue;
        }
        if (kept) {
          this.demoPreview.q2[k] = false;
        } else {
          kept = true;
        }
      }
    }
  }

  toggleQ2(key: 'a' | 'b' | 'c' | 'd' | 'e'): void {
    if (this.q2MultipleEnabled) {
      this.demoPreview.q2[key] = !this.demoPreview.q2[key];
      return;
    }
    const wasOn = this.demoPreview.q2[key];
    for (const k of ['a', 'b', 'c', 'd', 'e'] as const) {
      this.demoPreview.q2[k] = false;
    }
    if (!wasOn) {
      this.demoPreview.q2[key] = true;
    }
  }

  toggleQ3(key: 'a' | 'b' | 'c' | 'd'): void {
    this.demoPreview.q3[key] = !this.demoPreview.q3[key];
  }

  toggleQ4(key: 'a' | 'b' | 'c'): void {
    this.demoPreview.q4[key] = !this.demoPreview.q4[key];
  }
}
