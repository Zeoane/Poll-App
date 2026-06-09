import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-create-publish-overlay',
  standalone: true,
  template: `
    @if (open) {
      <div
        class="create-publish-overlay"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        (click)="onBackdropClick($event)"
      >
        <div class="create-publish-overlay__panel" (click)="$event.stopPropagation()">
          <button
            type="button"
            class="create-publish-overlay__close"
            [class.create-publish-overlay__close--svg]="closeIconSrc !== ''"
            aria-label="Close overlay"
            (click)="close()"
          >
            @if (closeIconSrc !== '') {
              <img [src]="closeIconSrc" alt="" width="39" height="32" />
            } @else {
              ×
            }
          </button>
          <p [id]="titleId" class="create-publish-overlay__text">{{ message }}</p>
        </div>
      </div>
    }
  `,
})
export class CreatePublishOverlayComponent {
  @Input() public open = false;
  @Input() public message = '';
  @Input() public titleId = 'create-publish-overlay-title';
  @Input() public closeIconSrc = '';
  @Output() public readonly closed = new EventEmitter<void>();

  /** Hides the overlay when Escape is pressed. */
  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (this.open) {
      this.close();
    }
  }

  /** Hides the overlay. */
  protected close(): void {
    this.closed.emit();
  }

  /**
   * Closes the overlay when the backdrop is clicked.
   * @param event - Click event from the overlay backdrop.
   */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
