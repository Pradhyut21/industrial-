// DeadMind Control Room & Break Area Dialogue
//
// Shift engineering banter and field coordination:
//   • solo  — thought / observation above an engineer at an ambient spot
//   • pair  — technical exchange between two plant engineers at a station
//
// All lines are tailored to industrial operations: DCS telemetry, boiler
// calibrations, OISD compliance audits, vibration analysis, and shift handovers.

import type { OfficeCharacterName } from './cast';

/** Where an engineer is stationed — picks a contextual line pool. */
export type BreakSpot = 'coffee' | 'vending' | 'snack' | 'table';

const pick = <T,>(arr: readonly T[], seed: number): T =>
  arr[((seed % arr.length) + arr.length) % arr.length];

// ─── solo lines, by spot ─────────────────────────────────────────────────────

const COFFEE: readonly string[] = [
  'is this control room blend fresh?',
  'checking steam drum telemetry between sips',
  'triple shot before the 6.6kV bus-tie switchover',
  'first cup of shift. third logbook signed.',
  'black coffee, zero-drift sensor calibration.',
  'who left the thermocouple checklist by the kettle?',
];

const VENDING: readonly string[] = [
  'grabbing a quick snack before DCS trend audit',
  'shift ran long on the superheater curve check',
  'field tech fuel',
  'quick refuel before the OISD-118 walk-through',
  'night shift nutrition',
];

const SNACK: readonly string[] = [
  'quick bite before the turbine vibration modal test',
  'shift turnover notes are ready on the dashboard',
  'grabbing energy before the valve bench test',
  'refreshing after the 400°C furnace scan',
];

const TABLE: readonly string[] = [
  'reviewing the secondary superheater bypass curve',
  'verifying OISD-118 statutory compliance checklist',
  'checking differential pressure logs from Unit 2',
  'predecessor handover notes looking comprehensive',
  'analyzing thermocouple drift logs from last quarter',
  'syncing with DCS lead on PID loop tuning',
];

const SPOT_POOL: Record<BreakSpot, readonly string[]> = {
  coffee: COFFEE, vending: VENDING, snack: SNACK, table: TABLE,
};

// ─── character flavour — discipline-specific engineering thoughts ─────────────

const BY_CHARACTER: Partial<Record<OfficeCharacterName, readonly string[]>> = {
  superintendent:      ['Plant operations pipeline is running at 94% throughput.', 'All domain managers: confirm handover readiness before Friday.', 'DeadMind knowledge vault is sealing verified SOPs.', 'Checking executive briefing telemetry.'],
  boiler_lead:         ['Boiler B-101 differential pressure is within 0.2 bar.', 'Never bypass a safety interlock without two supervisor keys.', 'Thermocouple calibration verified under 400°C.', 'Preserving shift recovery procedures in vector store.'],
  dcs_lead:            ['DCS bus-tie synchronization looks rock solid.', 'Checking Modbus TCP latency to Substation 4.', 'Telemetry pipeline is streaming at 60 Hz.', 'PID auto-tune completed on bypass valve P-302.'],
  asset_health:        ['Digital twin telemetry mapped across all 14 plant nodes.', 'Equipment health schematic rendering in real time.', 'Vulnerability causal chains updated for CFO review.', 'Node severity overlays aligned with sensor thresholds.'],
  safety_lead:         ['PSV-104 relief valve setpoint tested at 42.5 bar.', 'Zero leakage detected on flare header safety seals.', 'Rupture disc integrity verified for Unit 3.', 'Pressure relief calculations logged in compliance audit.'],
  compliance_officer:  ['Statutory OISD-118 audit signoff completed.', 'Every maintenance procedure requires cryptographic sealing.', 'Handover transition matrix verified for all retiring leads.', 'Zero non-conformances in statutory plant records.'],
  vibration_analyst:   ['Turbine shaft vibration spectrum shows 1X harmonic peak.', 'Modal analysis indicates healthy journal bearing clearance.', 'Fast Fourier Transform clean across all 8 probe channels.', 'Vibration cascade simulation within safe envelope.'],
  combustion_lead:     ['Combustion airflow ratio tuned for peak thermal efficiency.', 'Feedwater deaerator dissolved oxygen below 5 ppb.', '38 years of boiler runbooks safely preserved in the vault.', 'Watching the oxygen trim curve settle.'],
  reliability_spec:    ['Mean time between failures improved this quarter.', 'Root cause analysis complete on feed pump seal wear.', 'Plant reliability metrics meeting ISO-55000 standards.', 'Updating rotating equipment maintenance schedules.'],
  instrumentation:     ['4-20mA current loop loop-checks green across Rack 12.', 'HART protocol diagnostic telemetry synced to field copilot.', 'Field transmitter zero and span calibrated within 0.05%.', 'RTD resistance curves validated against standard tables.'],
  dispatch_lead:       ['Shift handover dispatch broadcast sent to all pods.', 'Control room incident log synchronized across shift leads.', 'Real-time telemetry alert acknowledged in 4 seconds.', 'Dispatch coordination running smoothly across stations.'],
  plc_tech:            ['Ladder logic interlock verified in PLC simulation.', 'Checking structured text routines for conveyor sequencing.', 'Field bus drop test passed with 0 packet drops.', 'Updating I/O mapping documentation for commissioning.'],
  safety_auditor:      ['All field technicians certified for hazardous zone entry.', 'Permit-to-work audit score: 100% across all 4 units.', 'Safety hazard mitigation matrix approved by statutory board.', 'Reviewing lockout/tagout isolation logs for turnaround.'],
  power_specialist:    ['6.6kV switchgear vacuum bottle integrity verified.', 'Transformer oil dissolved gas analysis looks pristine.', 'Bus-tie fast transfer completed in under 45 milliseconds.', 'Checking battery bank float voltage in DC control room.'],
  inventory_custodian: ['Critical turbine spare rotor staged in climate-controlled bay.', 'BUNA-N seal kits inventoried for planned spring turnaround.', 'Procurement lead times for inconel valves tracked in ERP.', 'Critical spares buffer at 100% target availability.'],
};

/** A solo field thought line. Character flavour ~60% of the time, else spot line. */
export function pickSoloLine(character: OfficeCharacterName, spot: BreakSpot, seed: number): string {
  const flavour = BY_CHARACTER[character];
  if (flavour && seed % 5 < 3) return pick(flavour, Math.floor(seed / 5));
  return pick(SPOT_POOL[spot], seed);
}

// ─── paired exchanges (two engineers at one station) ─────────────────────────

type Exchange = readonly string[];

const EXCHANGES: readonly Exchange[] = [
  ['Did you review the bypass valve calibration logs?', 'Checked them this morning — zero drift on the positioner.', 'Excellent, let’s seal the procedure into DeadMind.'],
  ['How is the steam drum level responding to the step change?', 'PID loop settled within 12 seconds with no overshoot.', 'Clean tuning. Good work.'],
  ['Are the 6.6kV bus-tie fast transfer tests scheduled?', 'Yes, running during the low-demand window at 02:00.', 'I will have the transient recorder armed.'],
  ['Did the turbine vibration probe pick up any sub-synchronous whirl?', 'Clean 1X peak only, journal bearing oil film is stable.', 'That confirms the lube oil viscosity is right on spec.'],
  ['What is the status of the OISD-118 statutory compliance audit?', 'All 14 safety checklists validated and signed off.', 'Ready for executive operations presentation.'],
  ['How much knowledge has been captured for the boiler turnaround?', '97% of Rajan’s 38-year operational heuristics are in the vault.', 'Zero-downtime succession is officially ready.'],
  ['Did you check the dissolved oxygen in the deaerator outlet?', 'Steady at 3 ppb, chemical dosing is right on target.', 'That will protect the economizer tubes from pitting.'],
  ['Are the Modbus TCP packets arriving reliably from Substation 4?', 'Zero packet drops across 100,000 poll cycles.', 'Deterministic communications confirmed.'],
  ['How is the Field Copilot performing for the technicians?', 'Retrieval precision at 84% with hybrid semantic gating.', 'Technicians are resolving field alarms in half the time.'],
  ['Did the relief valve bench test meet statutory ASME Section VIII?', 'Lift pressure verified at exactly 42.5 bar.', 'Logging the certification into the compliance database.'],
  ['Is the secondary superheater bypass curve ready for cold start?', 'Calibrated up to 400°C with thermal incident safeguards.', 'Ready for plant manager authorization.'],
  ['How does the digital twin schematic look for the CFO overview?', 'Real-time failure cascades mapped with live telemetry feeds.', 'Provides full plant risk visibility.'],
];

const KEYED_EXCHANGES: Partial<Record<OfficeCharacterName, Exchange>> = {
  superintendent:    ['What is our overall plant continuity readiness score?', '94% across all three operations pods.', 'Let\'s drive it to 100% before the turnaround.'],
  boiler_lead:       ['Never ignore a 0.1 bar differential pressure fluctuation.', 'Agreed, early detection prevents boiler thermal shock.', 'Preserve the heuristic in DeadMind.'],
  dcs_lead:          ['DCS communication bus is operating at peak telemetry rates.', 'Fast polling enabled across all station RTUs.', 'SCADA screen latency is under 20 milliseconds.'],
  vibration_analyst: ['Turbine shaft centerline orbit is perfectly circular.', 'No signs of misalignment or rotor unbalance.', 'Modal health confirmed.'],
  compliance_officer:['Every procedure change must carry verifiable audit trails.', 'Cryptographic hashes logged for all updated SOPs.', 'Complies fully with regulatory standards.'],
  safety_lead:       ['Flare header backpressure is steady below 0.5 bar.', 'All rupture disc pressure indicators are green.', 'Safety barrier verified.'],
  combustion_lead:   ['Combustion flame scanner telemetry looks solid.', 'Air-fuel ratio is optimized for minimum NOx emissions.', 'Running smooth and steady.'],
  instrumentation:   ['Transmitter loop calibration complete on Rack 12.', 'HART diagnostics report 100% sensor health.', 'Field telemetry locked in.'],
  safety_auditor:    ['Permit-to-work safety verification signed for hot work.', 'Combustible gas sniff test returned 0% LEL.', 'Safe to proceed with maintenance.'],
  power_specialist:  ['Substation transformer insulation resistance test passed.', 'Dielectric breakdown voltage is well above 60kV.', 'Power grid ready for full load.'],
};

/** A multi-beat exchange for two engineers sharing a station. */
export function pickExchange(speaker: OfficeCharacterName, seed: number): Exchange {
  const keyed = KEYED_EXCHANGES[speaker];
  if (keyed && seed % 3 === 0) return keyed;
  return pick(EXCHANGES, seed);
}

