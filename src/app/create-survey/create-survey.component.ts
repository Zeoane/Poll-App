import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { getSharedPollService } from '../app-legacy-bootstrap';
import {
  POLL_TITLE_MAX_CHARS,
  POLL_TITLE_MAX_WORDS,
  POLL_CATEGORIES,
} from '../../types/poll';

let idSeq = 0;
function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now()}-${idSeq}`;
}

interface AnswerRow {
  id: string;
  text: string;
}

interface QuestionBlock {
  id: string;
  prompt: string;
  allowMultiple: boolean;
  answers: AnswerRow[];
}

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent {
  private readonly router = inject(Router);

  protected readonly categoryOptions = POLL_CATEGORIES;

  protected surveyName = '';
  protected describingText = '';
  protected endDate = '';
  protected category = '';

  protected questions: QuestionBlock[] = [
    {
      id: nextId('q'),
      prompt: '',
      allowMultiple: false,
      answers: [
        { id: nextId('a'), text: '' },
        { id: nextId('a'), text: '' },
      ],
    },
  ];

  protected publishError = signal<string | null>(null);
  protected toastVisible = signal(false);

  protected clearSurveyName(): void {
    this.surveyName = '';
  }

  protected clearDescribingText(): void {
    this.describingText = '';
  }

  protected clearEndDate(): void {
    this.endDate = '';
  }

  protected clearQuestionPrompt(index: number): void {
    const q = this.questions[index];
    if (q) {
      q.prompt = '';
    }
  }

  protected clearAnswer(qIndex: number, aIndex: number): void {
    const row = this.questions[qIndex]?.answers[aIndex];
    if (row) {
      row.text = '';
    }
  }

  protected addAnswer(qIndex: number): void {
    const q = this.questions[qIndex];
    if (!q) {
      return;
    }
    q.answers.push({ id: nextId('a'), text: '' });
  }

  protected addQuestion(): void {
    this.questions.push({
      id: nextId('q'),
      prompt: '',
      allowMultiple: false,
      answers: [
        { id: nextId('a'), text: '' },
        { id: nextId('a'), text: '' },
      ],
    });
  }

  protected removeQuestion(qIndex: number): void {
    if (this.questions.length <= 1) {
      return;
    }
    this.questions.splice(qIndex, 1);
  }

  protected cancel(): void {
    void this.router.navigateByUrl('/');
  }

  protected dismissToast(): void {
    this.toastVisible.set(false);
  }

  protected optionLetter(index: number): string {
    return `${String.fromCharCode(65 + index)}.`;
  }

  protected publish(): void {
    this.publishError.set(null);

    const title = this.surveyName.trim();
    if (title.length < 3) {
      this.publishError.set(
        'Bitte einen Umfragennamen mit mindestens 3 Zeichen eingeben.',
      );
      return;
    }
    if (title.length > POLL_TITLE_MAX_CHARS) {
      this.publishError.set(
        `Der Name darf höchstens ${POLL_TITLE_MAX_CHARS} Zeichen haben.`,
      );
      return;
    }
    const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > POLL_TITLE_MAX_WORDS) {
      this.publishError.set(
        `Der Name darf höchstens ${POLL_TITLE_MAX_WORDS} Wörter haben.`,
      );
      return;
    }

    const first = this.questions[0];
    if (!first) {
      this.publishError.set('Keine Frage vorhanden.');
      return;
    }
    const opts = first.answers.map((a) => a.text.trim()).filter(Boolean);
    if (opts.length < 2) {
      this.publishError.set(
        'Bei der ersten Frage bitte mindestens zwei Antworten ausfüllen.',
      );
      return;
    }

    let description = this.describingText.trim();
    const extraQs = this.questions.slice(1);
    if (extraQs.length > 0) {
      const lines = extraQs
        .map((q, i) => {
          const p = q.prompt.trim();
          return p.length > 0 ? `${i + 2}. ${p}` : null;
        })
        .filter((x): x is string => x !== null);
      if (lines.length > 0) {
        description =
          (description.length > 0 ? `${description}\n\n` : '') +
          lines.join('\n');
      }
    }
    if (description.length === 0) {
      description =
        first.prompt.trim().length > 0
          ? first.prompt.trim()
          : 'Umfrage ohne Beschreibung.';
    }

    const deadline = this.parseEndDate(this.endDate.trim());
    const cat = this.category.trim();

    getSharedPollService().createPoll({
      title,
      description,
      category: cat.length > 0 ? cat : null,
      options: opts,
      deadline,
    });

    this.toastVisible.set(true);
    window.setTimeout(() => {
      this.toastVisible.set(false);
      void this.router.navigateByUrl('/');
    }, 2800);
  }

  private parseEndDate(raw: string): Date | null {
    const s = raw.trim();
    if (s.length === 0) {
      return null;
    }

    let y: number;
    let m: number;
    let d: number;

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);

    if (iso !== null) {
      y = Number(iso[1]);
      m = Number(iso[2]);
      d = Number(iso[3]);
    } else if (de !== null) {
      d = Number(de[1]);
      m = Number(de[2]);
      y = Number(de[3]);
    } else {
      return null;
    }

    if (
      Number.isNaN(y) ||
      Number.isNaN(m) ||
      Number.isNaN(d) ||
      !this.isValidCalendarDay(y, m, d)
    ) {
      return null;
    }

    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  private isValidCalendarDay(y: number, m: number, d: number): boolean {
    if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
      return false;
    }
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
}
