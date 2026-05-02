import { requireElementById } from '../utils/dom.js';

/** Feste Thumb-Höhe wie Scroll.svg / Figma (nicht proportional zur Liste). */
const THUMB_HEIGHT_PX = 64;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ActivePanelScrollbarControllerOptions {
  readonly scrollView?: HTMLElement;
  readonly scrollbarRoot?: HTMLElement;
}

/**
 * Eigene Scroll-Leiste für das aktive Umfragen-Panel: natives Balken versteckt,
 * Thumb 8×64 mit Scroll.svg, ohne Browser-Pfeile (u.a. Firefox).
 */
export class ActivePanelScrollbarController {
  private readonly scrollView: HTMLElement;
  private readonly scrollbarRoot: HTMLElement;
  private readonly track: HTMLElement;
  private readonly thumb: HTMLElement;

  public constructor(options: ActivePanelScrollbarControllerOptions = {}) {
    this.scrollView =
      options.scrollView ??
      requireElementById('tab-panel-active-scroll-view', HTMLElement);
    this.scrollbarRoot =
      options.scrollbarRoot ??
      requireElementById('tab-panel-active-scrollbar', HTMLElement);

    const track = this.scrollbarRoot.querySelector('.tabs__panel-scrollbar-track');
    const thumb = this.scrollbarRoot.querySelector('.tabs__panel-scrollbar-thumb');
    if (!(track instanceof HTMLElement) || !(thumb instanceof HTMLElement)) {
      throw new Error('ActivePanelScrollbarController: Track oder Thumb fehlt.');
    }
    this.track = track;
    this.thumb = thumb;

    this.scrollView.addEventListener('scroll', () => this.sync(), { passive: true });
    const ro = new ResizeObserver(() => this.sync());
    ro.observe(this.scrollView);

    this.thumb.addEventListener('pointerdown', this.onThumbPointerDown);
    this.track.addEventListener('click', this.onTrackClick);
    this.sync();
  }

  /** Sichtbarkeit der Leiste und Thumb-Position an scrollTop / Inhalt anpassen. */
  public sync(): void {
    const el = this.scrollView;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const needsScroll = scrollHeight > clientHeight + 1;

    this.scrollbarRoot.hidden = !needsScroll;

    if (!needsScroll) {
      this.thumb.style.transform = 'translateY(0)';
      this.track.style.height = '';
      return;
    }

    const viewportH = el.clientHeight;
    if (viewportH > 0) {
      this.track.style.height = `${viewportH}px`;
    }

    const maxScroll = scrollHeight - clientHeight;
    const trackH = this.track.clientHeight;
    const maxThumbTop = Math.max(0, trackH - THUMB_HEIGHT_PX);
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    const thumbTop = ratio * maxThumbTop;
    this.thumb.style.transform = `translateY(${thumbTop}px)`;
  }

  private readonly onThumbPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const startScrollTop = this.scrollView.scrollTop;
    const { scrollHeight, clientHeight } = this.scrollView;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const trackH = this.track.clientHeight;
    const maxThumbTop = Math.max(0, trackH - THUMB_HEIGHT_PX);
    const startThumbTop =
      maxScroll > 0 && maxThumbTop > 0
        ? (startScrollTop / maxScroll) * maxThumbTop
        : 0;

    const onMove = (ev: PointerEvent): void => {
      const dy = ev.clientY - startY;
      const newThumbTop = clamp(startThumbTop + dy, 0, maxThumbTop);
      if (maxThumbTop > 0 && maxScroll > 0) {
        this.scrollView.scrollTop = (newThumbTop / maxThumbTop) * maxScroll;
      }
    };

    const onUp = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  private readonly onTrackClick = (event: MouseEvent): void => {
    if (event.target === this.thumb || this.thumb.contains(event.target as Node)) {
      return;
    }

    const { scrollHeight, clientHeight } = this.scrollView;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    if (maxScroll <= 0) return;

    const rect = this.track.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const trackH = this.track.clientHeight;
    const maxThumbTop = Math.max(0, trackH - THUMB_HEIGHT_PX);
    const thumbTop = clamp(clickY - THUMB_HEIGHT_PX / 2, 0, maxThumbTop);

    if (maxThumbTop > 0) {
      this.scrollView.scrollTop = (thumbTop / maxThumbTop) * maxScroll;
    }
  };
}
