// DeadMind Industrial Operations Cast — plant roster metadata + sprite frames.
//
// Procedural portraits and walking sprites representing the multi-disciplinary
// industrial engineering team across Operations, Reliability, Controls, Safety,
// and Asset Management.

import { Texture } from 'pixi.js';
import { paintPortrait, sceneFrameBufs, SCENE_W, SCENE_H } from './portraitArt';

export type OfficeCharacterName =
  | 'michael' | 'jim' | 'pam' | 'dwight' | 'kevin' | 'angela'
  | 'oscar' | 'stanley' | 'phyllis' | 'andy' | 'kelly' | 'ryan'
  | 'toby' | 'creed' | 'meredith';

export interface CastMember {
  name: OfficeCharacterName;
  displayName: string;
  /** Signature accent color (hex) — used for the in-scene selection glow. */
  shirt: string;
  /** Blurb shown when this character is picked / has no description yet. */
  blurb: string;
}

/** Selectable plant engineering roster, in display order. */
export const OFFICE_CAST: CastMember[] = [
  { name: 'michael',  displayName: 'Marcus Vance',     shirt: '#5a6b8c', blurb: 'Plant Operations Superintendent' },
  { name: 'jim',      displayName: 'Dev Sen',          shirt: '#6fa8dc', blurb: 'DCS & SCADA Lead Engineer' },
  { name: 'pam',      displayName: 'Priya Nair',       shirt: '#9caf88', blurb: 'Asset Health & Telemetry Architect' },
  { name: 'dwight',   displayName: 'Rajan Sharma',     shirt: '#b89b3e', blurb: 'Senior Boiler Lead Specialist' },
  { name: 'kevin',    displayName: 'Kavita Rao',       shirt: '#4a7ab5', blurb: 'Process Safety & Relief Valves' },
  { name: 'angela',   displayName: 'Ananya Deshmukh',  shirt: '#8a86a6', blurb: 'Chief Statutory Compliance Officer' },
  { name: 'oscar',    displayName: 'Omar Farooq',      shirt: '#7a4b6b', blurb: 'Turbine Vibration & Modal Analyst' },
  { name: 'stanley',  displayName: 'Sanjay Patel',     shirt: '#8c5a4b', blurb: 'Senior Combustion & Feedwater Lead' },
  { name: 'phyllis',  displayName: 'Preeti Roy',       shirt: '#b08bbf', blurb: 'Plant Reliability Specialist' },
  { name: 'andy',     displayName: 'Arjun Mehta',      shirt: '#6fae6f', blurb: 'Telemetry & Sensor Instrumentation' },
  { name: 'kelly',    displayName: 'Kiran Verma',      shirt: '#d16ba5', blurb: 'Shift Dispatch & Comms Lead' },
  { name: 'ryan',     displayName: 'Rohan Gupta',      shirt: '#3a3a44', blurb: 'Junior Automation & PLC Technician' },
  { name: 'toby',     displayName: 'Tariq Al-Mansoor', shirt: '#9a8c5a', blurb: 'Industrial Safety & OISD Auditor' },
  { name: 'creed',    displayName: 'Chirag Banerjee',  shirt: '#6b7a4b', blurb: 'Substation 6.6kV Power Specialist' },
  { name: 'meredith', displayName: 'Meera Kulkarni',   shirt: '#b5544a', blurb: 'Spares & Critical Inventory Custodian' },
];

export const CAST_BY_NAME: Record<OfficeCharacterName, CastMember> =
  Object.fromEntries(OFFICE_CAST.map((c) => [c.name, c])) as Record<OfficeCharacterName, CastMember>;

export const DEFAULT_CHARACTER: OfficeCharacterName = 'jim';

export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ─── scene frames ────────────────────────────────────────────────────────────
const frameCache = new Map<OfficeCharacterName, Texture[][]>();

function bufToTexture(buf: Uint8ClampedArray): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W; canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SCENE_W, SCENE_H);
  img.data.set(buf);
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

/**
 * Frame grid CharacterSprite expects: 3 rows (down, up, right) × 7 frames
 * [walk1, walk2, walk3, type1, type2, read1, read2]. We provide a front view
 * (down — and reused for the side row, so left/right walkers still show a face)
 * and a back view (up — agents seated facing their desk show their back). The
 * three walk frames are stand / step-left / step-right.
 */
export async function getCastFrames(name: OfficeCharacterName): Promise<Texture[][]> {
  const cached = frameCache.get(name);
  if (cached) return cached;
  const { front, back } = sceneFrameBufs(name);
  const toRow = (bufs: Uint8ClampedArray[]): Texture[] => {
    const [stand, stepL, stepR] = bufs.map(bufToTexture);
    return [stand, stepL, stepR, stand, stand, stand, stand];
  };
  const frontRow = toRow(front);
  const frames: Texture[][] = [frontRow, toRow(back), frontRow]; // down, up, right
  frameCache.set(name, frames);
  return frames;
}

/**
 * Paint a character's static portrait for cards / the picker (delegates to the
 * custom procedural composer in portraitArt.ts).
 */
export async function paintCastPortrait(
  ctx: CanvasRenderingContext2D,
  name: OfficeCharacterName,
  scale = 2,
): Promise<void> {
  paintPortrait(ctx, name, scale);
}
