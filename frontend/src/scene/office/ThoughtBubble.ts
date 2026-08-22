import { Container, Graphics, Text } from 'pixi.js';
import { colors } from '@/design/tokens';
import { toolIcon } from './ToolBubble';

// A comic "thought cloud" pinned above an avatar's head showing what it's doing
// RIGHT NOW (the agent's live `action`, e.g. "edit App.tsx" / "bash npm test").
// Distinct from the darker ToolBubble speech bubble: a light cream cloud with a
// trailing-puff tail — the visual shorthand for "thinking". Built to DESIGN.md:
// integer pixels, hard 1px ink outline, limited palette, no soft shadows.
//
// Shares ToolBubble's fade state machine and word-wrapping so behaviour reads
// consistently; the differences are the look (cloud + tail, light fill) and that
// it stays put until the action changes (no auto-linger while the agent works).

const PADDING_X = 10;
const PADDING_Y = 6;
const CORNER_RADIUS = 6;
const MAX_WIDTH = 190;
const FILL_COLOR = 0x121018;            // dark titanium glass
const OUTLINE_COLOR = 0x5e5672;         // high-contrast crisp border
const TEXT_COLOR = '#ffffff';           // ultra-crisp pure white
const FONT_SIZE = 15;
const RENDER_SCALE = 0.5;               // render at 2x, scale down for crispness
const OFFSET_Y = -34;                   // positioned cleanly above head
const FADE_IN_DURATION = 0.2;
const FADE_OUT_DURATION = 0.35;
const LINGER_DURATION = 4.5;            // linger cleanly
const DOTS_CYCLE_SPEED = 0.45;
const WRAP_WIDTH = MAX_WIDTH / RENDER_SCALE - PADDING_X * 2;
const MAX_CHARS = 120;

type BubbleState = 'hidden' | 'fading-in' | 'visible' | 'lingering' | 'fading-out';

export class ThoughtBubble {
  readonly container: Container;
  private inner: Container;
  private bg: Graphics;
  private tail: Graphics;
  private label: Text;
  private state: BubbleState = 'hidden';
  private fadeElapsed = 0;
  private lingerElapsed = 0;
  private bgW = 0;
  private bgH = 0;
  private isThinking = false;
  private dotsElapsed = 0;
  private dotsPhase = 0;
  private extraLift = 0;
  private zoom = 1;
  private boundsW = 0;
  private boundsH = 0;

  constructor() {
    this.container = new Container();
    this.container.zIndex = 100000;
    this.container.eventMode = 'none';
    this.container.alpha = 0;
    this.container.visible = false;

    this.inner = new Container();
    this.inner.scale.set(RENDER_SCALE);
    this.container.addChild(this.inner);

    this.tail = new Graphics();
    this.bg = new Graphics();
    this.label = new Text({
      text: '',
      style: {
        fontSize: FONT_SIZE,
        fontWeight: '600',
        fill: TEXT_COLOR,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        align: 'left',
        wordWrap: true,
        wordWrapWidth: WRAP_WIDTH,
        breakWords: true
      }
    });
    this.label.x = PADDING_X;
    this.label.y = PADDING_Y;

    // tail first so it sits behind the body
    this.inner.addChild(this.tail, this.bg, this.label);
  }

  /** Show the current activity. Empty text → an animated "…" (model thinking).
   *  `tool` (an agent's `carrying`) prefixes a small glyph when present. */
  show(text: string, tool?: string): void {
    this.isThinking = !text.trim();
    if (this.isThinking) {
      this.dotsElapsed = 0;
      this.dotsPhase = 0;
      this.label.text = '.';
    } else {
      const display = tool ? `${toolIcon(tool)} ${text}` : text;
      // Word-wrap (style.wordWrap) handles the horizontal fit, so the card can no
      // longer overflow; we only cap the raw length so a very long action wraps to
      // a few lines rather than a wall of text.
      this.label.text = display.length > MAX_CHARS
        ? display.slice(0, MAX_CHARS - 1).trimEnd() + '…'
        : display;
    }
    this.redraw();
    this.reveal();
  }

  private reveal(): void {
    if (this.state === 'hidden' || this.state === 'fading-out') {
      this.state = 'fading-in';
      this.fadeElapsed = 0;
      this.container.visible = true;
    } else {
      // already up — swap text in place without re-fading
      this.state = 'visible';
      this.container.alpha = 1;
    }
    this.lingerElapsed = 0;
  }

  /** Begin fading out (after a short linger) — call when the agent goes quiet. */
  startLinger(): void {
    if (this.state === 'hidden') return;
    this.state = 'lingering';
    this.lingerElapsed = 0;
  }

  /** Update for the camera zoom: keep the bubble's SCREEN size from dropping
   *  below 1:1 by counter-scaling while the world is zoomed out. */
  setZoom(z: number): void {
    if (!(z > 0) || z === this.zoom) return;
    this.zoom = z;
    this.container.scale.set(this.compensation());
  }

  /** World-units multiplier that cancels a < 1 camera zoom (1 at zoom ≥ 1). */
  private compensation(): number {
    return 1 / Math.min(this.zoom, 1);
  }

  /** The world rect the bubble must stay inside (the map size, in px). */
  setBounds(w: number, h: number): void {
    this.boundsW = w;
    this.boundsH = h;
  }

  setPosition(px: number, py: number): void {
    const comp = this.compensation();
    const w = this.bgW * RENDER_SCALE * comp;
    const h = this.bgH * RENDER_SCALE * comp;
    let x = px - w / 2;
    let y = py + OFFSET_Y - h - this.extraLift;
    const margin = 20;
    if (this.boundsW > 0) {
      // Clamp into the world, tooltip-style: slide horizontally, and a cloud
      // that would poke above the top edge slides down instead (it may then
      // cover the avatar's hat — better than being unreadable off-world).
      x = Math.min(Math.max(x, margin), Math.max(margin, this.boundsW - w - margin));
      y = Math.min(Math.max(y, margin), Math.max(margin, this.boundsH - h - margin));
    }
    this.container.x = Math.round(x);
    this.container.y = Math.round(y);
  }

  /** Extra upward shift (px), set by the scene's bubble-overlap pass. */
  setLift(px: number): void {
    this.extraLift = px;
  }

  /** The bubble's base screen rect (ignoring any lift) for a given anchor, or
   *  null when hidden. Used by the scene to detect and resolve overlaps. */
  getLayout(px: number, py: number): { x: number; y: number; w: number; h: number } | null {
    if (this.state === 'hidden') return null;
    const comp = this.compensation();
    const w = this.bgW * RENDER_SCALE * comp;
    const h = this.bgH * RENDER_SCALE * comp;
    let x = px - w / 2;
    let y = py + OFFSET_Y - h;
    const margin = 20;
    if (this.boundsW > 0) {
      // Report the CLAMPED base rect so the overlap resolver stacks bubbles
      // where they actually render, not where they ideally would.
      x = Math.min(Math.max(x, margin), Math.max(margin, this.boundsW - w - margin));
      y = Math.min(Math.max(y, margin), Math.max(margin, this.boundsH - h - margin));
    }
    return { x, y, w, h };
  }

  hide(): void {
    this.state = 'hidden';
    this.isThinking = false;
    this.container.alpha = 0;
    this.container.visible = false;
  }

  isHidden(): boolean {
    return this.state === 'hidden';
  }

  update(dt: number): void {
    if (this.isThinking && (this.state === 'visible' || this.state === 'fading-in')) {
      this.dotsElapsed += dt;
      const newPhase = Math.floor(this.dotsElapsed / DOTS_CYCLE_SPEED) % 3;
      if (newPhase !== this.dotsPhase) {
        this.dotsPhase = newPhase;
        this.label.text = ['.', '..', '...'][this.dotsPhase];
        this.redraw();
      }
    }

    switch (this.state) {
      case 'fading-in': {
        this.fadeElapsed += dt;
        const t = Math.min(this.fadeElapsed / FADE_IN_DURATION, 1);
        this.container.alpha = t;
        if (t >= 1) this.state = 'visible';
        break;
      }
      case 'lingering': {
        this.lingerElapsed += dt;
        if (this.lingerElapsed >= LINGER_DURATION) {
          this.state = 'fading-out';
          this.fadeElapsed = 0;
        }
        break;
      }
      case 'fading-out': {
        this.fadeElapsed += dt;
        const t = Math.min(this.fadeElapsed / FADE_OUT_DURATION, 1);
        this.container.alpha = 1 - t;
        if (t >= 1) this.hide();
        break;
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  private redraw(): void {
    // The cloud always wraps the MEASURED text. Clamping the bg to MAX_WIDTH
    // while the label keeps its real width let text paint past the bubble edge
    // whenever the measurement overshot wordWrapWidth a touch (emoji glyphs,
    // fallback-font metrics) — on the dark map that read as "horizontally cut".
    // wordWrap already bounds the label, so the bg needs no clamp of its own.
    this.bgW = Math.max(48, this.label.width + PADDING_X * 2);
    this.bgH = this.label.height + PADDING_Y * 2;

    this.bg.clear();
    this.bg.roundRect(0, 0, this.bgW, this.bgH, CORNER_RADIUS);
    this.bg.fill({ color: FILL_COLOR, alpha: 0.94 });
    this.bg.stroke({ color: OUTLINE_COLOR, width: 1.5 });

    // Thought-cloud tail: two subtle rounded dots trailing down toward the character's head
    this.tail.clear();
    const baseX = Math.min(this.bgW * 0.32, 24);
    const puff = (cx: number, cy: number, r: number) => {
      this.tail.circle(cx, cy, r).fill({ color: FILL_COLOR, alpha: 0.94 }).stroke({ color: OUTLINE_COLOR, width: 1.5 });
    };
    puff(baseX, this.bgH + 4, 3);
    puff(baseX - 4, this.bgH + 8, 2);
  }
}
