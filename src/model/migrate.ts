// Upgrades saved data from an older format version to the current one (CLAUDE.md rule 17). Each step upgrades one
// version; data is still checked by validate.ts afterwards, so a damaged file is never used.
import { SCHEMA_VERSION } from './types';

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Version 1 → 2 (6 Nov 2026): settings gain `layouts`, empty, so every page shows its default. */
function v1to2(settings: Raw): Raw {
  return { ...settings, layouts: {}, schemaVersion: 2 };
}

const STEPS: Record<number, (s: Raw) => Raw> = { 1: v1to2 };

/**
 * Returns the settings upgraded to the current version, or the same object when nothing needed upgrading.
 * Unknown or newer versions are left as they are (validation then reports them).
 */
export function migrateSettings(settings: unknown): unknown {
  if (!isObj(settings)) return settings;
  let s = settings;
  while (typeof s.schemaVersion === 'number' && s.schemaVersion < SCHEMA_VERSION && STEPS[s.schemaVersion]) s = STEPS[s.schemaVersion]!(s);
  return s;
}

