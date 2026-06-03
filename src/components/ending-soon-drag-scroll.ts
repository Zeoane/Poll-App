import { requireElementById } from '../utils/dom';

const DRAG_THRESHOLD_PX = 4;

export interface EndingSoonDragScrollControllerOptions {
  readonly list?: HTMLElement;
}

/** Adds mouse click-and-drag horizontal scrolling to the ending-soon list. */
export class EndingSoonDragScrollController {
  private readonly list: HTMLElement;
  private isPointerDown = false;
  private didDrag = false;
  private startX = 0;
  private startScrollLeft = 0;
  private suppressClick = false;

  /** Resolves the scroll list and wires pointer interactions. */
  public constructor(options: EndingSoonDragScrollControllerOptions = {}) {
    this.list = options.list ?? requireElementById('ending-soon-list', HTMLElement);
    this.list.addEventListener('pointerdown', this.onPointerDown);
    this.list.addEventListener('click', this.onClickCapture, true);
  }

  /** Removes all listeners and clears any drag state. */
  public destroy(): void {
    this.list.removeEventListener('pointerdown', this.onPointerDown);
    this.list.removeEventListener('click', this.onClickCapture, true);
    this.detachDocumentListeners();
    this.endDrag();
  }

  /** Begins tracking a potential drag on primary mouse/pen button. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || event.button !== 0) {
      return;
    }
    this.isPointerDown = true;
    this.didDrag = false;
    this.startX = event.clientX;
    this.startScrollLeft = this.list.scrollLeft;
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);
  };

  /** Updates scrollLeft once the pointer passes the drag threshold. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isPointerDown) {
      return;
    }
    const dx = event.clientX - this.startX;
    if (!this.didDrag && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      this.beginDrag();
    }
    if (this.didDrag) {
      event.preventDefault();
      this.list.scrollLeft = this.startScrollLeft - dx;
    }
  };

  /** Ends the gesture and suppresses the click that follows a drag. */
  private readonly onPointerUp = (): void => {
    this.detachDocumentListeners();
    if (this.didDrag) {
      this.suppressClick = true;
    }
    this.endDrag();
  };

  /** Cancels the card-open click triggered at the end of a drag. */
  private readonly onClickCapture = (event: MouseEvent): void => {
    if (!this.suppressClick) {
      return;
    }
    this.suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Switches to the grabbing state and disables snapping while dragging. */
  private beginDrag(): void {
    this.didDrag = true;
    this.list.classList.add('poll-list--dragging');
    this.list.style.scrollSnapType = 'none';
  }

  /** Restores snapping and the resting cursor after a drag. */
  private endDrag(): void {
    this.isPointerDown = false;
    this.list.classList.remove('poll-list--dragging');
    this.list.style.scrollSnapType = '';
  }

  /** Detaches the document-level move/up listeners. */
  private detachDocumentListeners(): void {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
  }
}
