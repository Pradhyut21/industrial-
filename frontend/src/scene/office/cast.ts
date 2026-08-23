// DeadMind Industrial Operations Cast — plant roster metadata + sprite frames.
//
// Procedural portraits and walking sprites representing the multi-disciplinary
// industrial engineering team across Operations, Reliability, Controls, Safety,
// and Asset Management.

import { Texture } from 'pixi.js';
import { paintPortrait, sceneFrameBufs, SCENE_W, SCENE_H } from './portraitArt';

export type OfficeCharacterName =
  | 'superintendent' | 'dcs_lead' | 'asset_health' | 'boiler_lead' | 'safety_lead' | 'compliance_officer'
  | 'vibration_analyst' | 'combustion_lead' | 'reliability_spec' | 'instrumentation' | 'dispatch_lead' | 'plc_tech'
  | 'safety_auditor' | 'power_specialist' | 'inventory_custodian';

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
  { name: 'superintendent',       displayName: 'Marcus Vance',     shirt: '#5a6b8c', blurb: 'Plant Operations Superintendent' },
  { name: 'dcs_lead',             displayName: 'Dev Sen',          shirt: '#6fa8dc', blurb: 'DCS & SCADA Lead Engineer' },
  { name: 'asset_health',         displayName: 'Priya Nair',       shirt: '#9caf88', blurb: 'Asset Health & Telemetry Architect' },
  { name: 'boiler_lead',          displayName: 'Rajan Sharma',     shirt: '#b89b3e', blurb: 'Senior Boiler Lead Specialist' },
  { name: 'safety_lead',          displayName: 'Kavita Rao',       shirt: '#4a7ab5', blurb: 'Process Safety & Relief Valves' },
  { name: 'compliance_officer',   displayName: 'Ananya Deshmukh',  shirt: '#8a86a6', blurb: 'Chief Statutory Compliance Officer' },
  { name: 'vibration_analyst',    displayName: 'Omar Farooq',      shirt: '#7a4b6b', blurb: 'Turbine Vibration & Modal Analyst' },
  { name: 'combustion_lead',      displayName: 'Sanjay Patel',     shirt: '#8c5a4b', blurb: 'Senior Combustion & Feedwater Lead' },
  { name: 'reliability_spec',     displayName: 'Preeti Roy',       shirt: '#b08bbf', blurb: 'Plant Reliability Specialist' },
  { name: 'instrumentation',      displayName: 'Arjun Mehta',      shirt: '#6fae6f', blurb: 'Telemetry & Sensor Instrumentation' },
  { name: 'dispatch_lead',        displayName: 'Kiran Verma',      shirt: '#d16ba5', blurb: 'Shift Dispatch & Comms Lead' },
  { name: 'plc_tech',             displayName: 'Rohan Gupta',      shirt: '#3a3a44', blurb: 'Junior Automation & PLC Technician' },
  { name: 'safety_auditor',       displayName: 'Tariq Al-Mansoor', shirt: '#9a8c5a', blurb: 'Industrial Safety & OISD Auditor' },
  { name: 'power_specialist',     displayName: 'Chirag Banerjee',  shirt: '#6b7a4b', blurb: 'Substation 6.6kV Power Specialist' },
  { name: 'inventory_custodian',  displayName: 'Meera Kulkarni',   shirt: '#b5544a', blurb: 'Spares & Critical Inventory Custodian' },
];

export const CAST_BY_NAME: Record<OfficeCharacterName, CastMember> =
  Object.fromEntries(OFFICE_CAST.map((c) => [c.name, c])) as Record<OfficeCharacterName, CastMember>;

export const DEFAULT_CHARACTER: OfficeCharacterName = 'dcs_lead';

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
