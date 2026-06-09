import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  SURVEY_END_DATE_REJECTED_INPUT_MESSAGE,
  formatGermanDmy,
  isRejectedTypedSurveyEndDate,
  minimumSurveyEndDate,
  sanitizeGermanDateRawInput,
} from './create-survey-end-date';
import {
  CALENDAR_MONTH_LABELS,
  CALENDAR_WEEKDAY_LABELS,
  buildMonthGrid,
  monthHasSelectableDay,
  normalizeToMidnight,
  resolveInitialCalendarView,
  shiftViewMonth,
  type CalendarDayCell,
} from './create-survey-end-date-picker.helpers';

@Component({
  selector: 'app-create-survey-end-date-field',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-survey-end-date-field.component.html',
  styleUrl: './create-survey-end-date-field.component.css',
})
export class CreateSurveyEndDateFieldComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  @Input() public value = '';
  @Input() public hasError = false;
  @Input() public errorMessage = '';
  @Output() public readonly valueChange = new EventEmitter<string>();

  protected calendarOpen = false;
  protected inlineRejectError = false;
  protected viewYear = minimumSurveyEndDate().getFullYear();
  protected viewMonth = minimumSurveyEndDate().getMonth();

  protected readonly rejectedInputMessage = SURVEY_END_DATE_REJECTED_INPUT_MESSAGE;

  protected readonly weekdayLabels = CALENDAR_WEEKDAY_LABELS;
  protected readonly monthLabels = CALENDAR_MONTH_LABELS;

  /** Opens the calendar popup anchored to the field. */
  protected openCalendar(): void {
    const view = resolveInitialCalendarView(this.value);
    this.viewYear = view.year;
    this.viewMonth = view.month;
    this.calendarOpen = true;
  }

  /** Closes the calendar without changing the field value. */
  protected closeCalendar(): void {
    this.calendarOpen = false;
  }

  /** Clears the end date and closes the calendar. */
  protected clearEndDate(): void {
    this.inlineRejectError = false;
    this.emitValue('');
    this.closeCalendar();
  }

  /** True when the input should show an inline or publish validation error. */
  protected showInputError(): boolean {
    return this.inlineRejectError || this.hasError;
  }

  /** Placeholder text for inline rejection or publish validation errors. */
  protected inputPlaceholder(): string {
    if (this.inlineRejectError) {
      return this.rejectedInputMessage;
    }
    return this.hasError ? this.errorMessage : '';
  }

  /**
   * Sanitizes typed input and emits the updated value.
   * @param raw - New input value from ngModel.
   */
  protected onValueInput(raw: string): void {
    this.applyTypedInput(sanitizeGermanDateRawInput(raw));
  }

  /**
   * Re-checks the current value when the field loses focus.
   */
  protected onInputBlur(): void {
    this.applyTypedInput(sanitizeGermanDateRawInput(this.value));
  }

  /**
   * Blocks `-` and `:` so only dot-separated dates can be entered.
   * @param event - Keydown event on the text input.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === ':') {
      event.preventDefault();
    }
  }

  /**
   * Sanitizes pasted text before it enters the field.
   * @param event - Paste event on the text input.
   */
  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const start = target.selectionStart ?? this.value.length;
    const end = target.selectionEnd ?? this.value.length;
    const merged = `${this.value.slice(0, start)}${pasted}${this.value.slice(end)}`;
    this.applyTypedInput(sanitizeGermanDateRawInput(merged));
  }

  /**
   * Applies a calendar day when it is selectable.
   * @param cell - Clicked day cell.
   */
  protected selectDay(cell: CalendarDayCell): void {
    if (cell.disabled) {
      return;
    }
    this.emitValue(formatGermanDmy(cell.date));
    this.closeCalendar();
  }

  /** Moves the visible month backward when allowed. */
  protected showPreviousMonth(): void {
    if (!this.canShowPreviousMonth()) {
      return;
    }
    this.applyViewShift(-1);
  }

  /** Moves the visible month forward. */
  protected showNextMonth(): void {
    this.applyViewShift(1);
  }

  /** Month title for the calendar header. */
  protected calendarTitle(): string {
    return `${this.monthLabels[this.viewMonth]} ${this.viewYear}`;
  }

  /** Day cells for the currently visible month grid. */
  protected calendarCells(): CalendarDayCell[] {
    const minDay = normalizeToMidnight(minimumSurveyEndDate());
    return buildMonthGrid(this.viewYear, this.viewMonth, minDay, this.value);
  }

  /** Whether the previous-month control should be enabled. */
  protected canShowPreviousMonth(): boolean {
    const minDay = normalizeToMidnight(minimumSurveyEndDate());
    const previous = shiftViewMonth(this.viewYear, this.viewMonth, -1);
    return monthHasSelectableDay(previous.year, previous.month, minDay);
  }

  /** Closes the calendar when Escape is pressed. */
  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    this.closeCalendar();
  }

  /**
   * Closes the calendar when the user clicks outside the field.
   * @param event - Document click used for outside detection.
   */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.calendarOpen) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && this.hostRef.nativeElement.contains(target)) {
      return;
    }
    this.closeCalendar();
  }

  /**
   * Sanitizes input, rejects complete past dates, and emits updates.
   * @param sanitized - Sanitized field text from typing or pasting.
   */
  private applyTypedInput(sanitized: string): void {
    if (isRejectedTypedSurveyEndDate(sanitized)) {
      this.inlineRejectError = true;
      this.emitValue('');
      return;
    }
    this.inlineRejectError = false;
    this.emitValue(sanitized);
  }

  /**
   * Emits a sanitized value change to the parent form.
   * @param next - Sanitized field value.
   */
  private emitValue(next: string): void {
    this.valueChange.emit(next);
  }

  /**
   * Updates the visible month by one step.
   * @param delta - Month shift direction.
   */
  private applyViewShift(delta: -1 | 1): void {
    const shifted = shiftViewMonth(this.viewYear, this.viewMonth, delta);
    this.viewYear = shifted.year;
    this.viewMonth = shifted.month;
  }
}
