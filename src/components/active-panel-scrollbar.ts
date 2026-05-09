import { requireElementById } from '../utils/dom';

const THUMB_HEIGHT_PX = 64;

/** Clamps a number to an inclusive min/max range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Attaches pointer move/up listeners until the drag ends. */
function attachDocumentPointerDrag(onMove: (ev: PointerEvent) => void): void {
  const onUp = (): void => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

/** Queries track and thumb nodes under a scrollbar root. */
function resolveTrackThumb(scrollbarRoot: HTMLElement): {
  track: HTMLElement;
  thumb: HTMLElement;
} {
  const track = scrollbarRoot.querySelector('.tabs__panel-scrollbar-track');
  const thumb = scrollbarRoot.querySelector('.tabs__panel-scrollbar-thumb');
  if (!(track instanceof HTMLElement) || !(thumb instanceof HTMLElement)) {
    throw new Error('ActivePanelScrollbarController: track or thumb element is missing.');
  }
  return { track, thumb };
}

export interface ActivePanelScrollbarControllerOptions {
  readonly scrollView?: HTMLElement;
  readonly scrollbarRoot?: HTMLElement;
}

export class ActivePanelScrollbarController {
  private readonly scrollView: HTMLElement;
  private readonly scrollbarRoot: HTMLElement;
  private readonly track: HTMLElement;
  private readonly thumb: HTMLElement;

  /** Resolves scroll viewport, track, and thumb with optional overrides. */
  public constructor(options: ActivePanelScrollbarControllerOptions = {}) {
    this.scrollView =
      options.scrollView ??
      requireElementById('tab-panel-active-scroll-view', HTMLElement);
    this.scrollbarRoot =
      options.scrollbarRoot ??
      requireElementById('tab-panel-active-scrollbar', HTMLElement);
    const { track, thumb } = resolveTrackThumb(this.scrollbarRoot);
    this.track = track;
    this.thumb = thumb;
    this.attachScrollUi();
  }

  /** Shows or hides the bar and positions the thumb from scroll metrics. */
  public sync(): void {
    const el = this.scrollView;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const needsScroll = scrollHeight > clientHeight + 1;
    this.applyPresence(needsScroll, clientHeight);
    if (!needsScroll) {
      return;
    }
    this.positionThumb(scrollTop, scrollHeight, clientHeight);
  }

  /** Subscribes scroll, resize, and drag interactions once. */
  private attachScrollUi(): void {
    this.scrollView.addEventListener('scroll', () => this.sync(), { passive: true });
    const ro = new ResizeObserver(() => this.sync());
    ro.observe(this.scrollView);
    this.thumb.addEventListener('pointerdown', this.onThumbPointerDown);
    this.track.addEventListener('click', this.onTrackClick);
    this.sync();
  }

  /** Toggles visibility and track height from scroll need. */
  private applyPresence(needsScroll: boolean, clientHeight: number): void {
    this.scrollbarRoot.hidden = !needsScroll;
    if (!needsScroll) {
      this.thumb.style.transform = 'translateY(0)';
      this.track.style.height = '';
      return;
    }
    if (clientHeight > 0) {
      this.track.style.height = `${clientHeight}px`;
    }
  }

  /** Converts scrollTop to a translated thumb position. */
  private positionThumb(scrollTop: number, scrollHeight: number, clientHeight: number): void {
    const maxScroll = scrollHeight - clientHeight;
    const trackH = this.track.clientHeight;
    const maxThumbTop = Math.max(0, trackH - THUMB_HEIGHT_PX);
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    this.thumb.style.transform = `translateY(${ratio * maxThumbTop}px)`;
  }

  /** Captures geometry for mapping thumb delta to scrollTop. */
  private readThumbDragStart(scrollTop: number): {
    maxScroll: number;
    maxThumbTop: number;
    startThumbTop: number;
  } {
    const { scrollHeight, clientHeight } = this.scrollView;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const trackH = this.track.clientHeight;
    const maxThumbTop = Math.max(0, trackH - THUMB_HEIGHT_PX);
    const startThumbTop =
      maxScroll > 0 && maxThumbTop > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
    return { maxScroll, maxThumbTop, startThumbTop };
  }

  /** Starts a thumb drag that updates scrollTop on pointer move. */
  private attachThumbDrag(startY: number, startScrollTop: number): void {
    const geom = this.readThumbDragStart(startScrollTop);
    const onMove = (ev: PointerEvent): void => {
      const dy = ev.clientY - startY;
      const newThumbTop = clamp(geom.startThumbTop + dy, 0, geom.maxThumbTop);
      if (geom.maxThumbTop > 0 && geom.maxScroll > 0) {
        this.scrollView.scrollTop = (newThumbTop / geom.maxThumbTop) * geom.maxScroll;
      }
    };
    attachDocumentPointerDrag(onMove);
  }

  /** Begins thumb tracking on primary-button pointer down. */
  private readonly onThumbPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.attachThumbDrag(event.clientY, this.scrollView.scrollTop);
  };

  /** Jumps scroll when the track is clicked away from the thumb. */
  private scrollTowardTrackOffset(clickOffsetY: number): void {
    const { scrollHeight, clientHeight } = this.scrollView;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    if (maxScroll <= 0) {
      return;
    }
    const trackH = this.track.clientHeight;
    const maxThumbTop = Math.max(0, trackH - THUMB_HEIGHT_PX);
    const thumbTop = clamp(clickOffsetY - THUMB_HEIGHT_PX / 2, 0, maxThumbTop);
    if (maxThumbTop > 0) {
      this.scrollView.scrollTop = (thumbTop / maxThumbTop) * maxScroll;
    }
  }

  /** Handles track clicks while ignoring clicks on the thumb element. */
  private readonly onTrackClick = (event: MouseEvent): void => {
    if (event.target === this.thumb || this.thumb.contains(event.target as Node)) {
      return;
    }
    const rect = this.track.getBoundingClientRect();
    this.scrollTowardTrackOffset(event.clientY - rect.top);
  };
}
