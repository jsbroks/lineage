export const MASS_UNITS = [
  "mg",
  "g",
  "kg",
  "oz",
  "lb",
  "ton",
  "tonne",
] as const;

export type MassUnit = (typeof MASS_UNITS)[number];

export const COUNT_UNITS = ["each"] as const;
export type CountUnit = (typeof COUNT_UNITS)[number];

export type Unit = MassUnit | CountUnit;

const GRAMS_PER: Record<MassUnit, number> = {
  mg: 0.001,
  g: 1,
  kg: 1_000,
  oz: 28.349_523_125,
  lb: 453.592_37,
  ton: 907_184.74,
  tonne: 1_000_000,
};

const UNIT_ALIASES: Record<string, Unit> = {
  milligram: "mg",
  milligrams: "mg",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  kgs: "kg",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  ton: "ton",
  tons: "ton",
  "short ton": "ton",
  "short tons": "ton",
  tonne: "tonne",
  tonnes: "tonne",
  "metric ton": "tonne",
  "metric tons": "tonne",
  each: "each",
  ea: "each",
  pcs: "each",
  piece: "each",
  pieces: "each",
  unit: "each",
  units: "each",
};

export function isMassUnit(u: Unit): u is MassUnit {
  return (MASS_UNITS as readonly string[]).includes(u);
}

export function isCountUnit(u: Unit): u is CountUnit {
  return (COUNT_UNITS as readonly string[]).includes(u);
}

/**
 * Resolve a free-form string (case-insensitive) to a canonical Unit.
 * Returns `null` when the string is unrecognised.
 */
export function parseUnit(raw: string): Unit | null {
  const key = raw.trim().toLowerCase();
  if ((MASS_UNITS as readonly string[]).includes(key)) return key as MassUnit;
  if ((COUNT_UNITS as readonly string[]).includes(key)) return key as CountUnit;
  return UNIT_ALIASES[key] ?? null;
}

/** True when both units belong to the same dimension (mass ↔ mass). */
export function isConvertible(from: Unit, to: Unit): boolean {
  if (from === to) return true;
  return isMassUnit(from) && isMassUnit(to);
}

/** Convert a value between two mass units. */
export function convert(value: number, from: MassUnit, to: MassUnit): number {
  if (from === to) return value;
  return (value * GRAMS_PER[from]) / GRAMS_PER[to];
}

/** Normalize any mass value to grams. */
export function toGrams(value: number, from: MassUnit): number {
  return value * GRAMS_PER[from];
}

/** Create a value in grams from any mass unit, then express in the target unit. */
export function fromGrams(grams: number, to: MassUnit): number {
  return grams / GRAMS_PER[to];
}

export type Measurement = { value: number; unit: Unit };

/**
 * Normalize a measurement to its base unit (grams for mass, unchanged for count).
 * Useful for storing values in a canonical form for comparison and aggregation.
 */
export function normalize(m: Measurement): Measurement {
  if (isCountUnit(m.unit)) return { value: m.value, unit: "each" };
  return { value: toGrams(m.value, m.unit), unit: "g" };
}

/**
 * Format a measurement for display.
 * Rounds to `precision` decimal places (default 2).
 */
export function formatMeasurement(
  m: Measurement,
  precision = 2,
): string {
  const rounded =
    Math.round(m.value * 10 ** precision) / 10 ** precision;
  return `${rounded} ${m.unit}`;
}

/**
 * Convenience: parse a raw unit string, convert the value, and return both.
 * Throws if either unit is unrecognised or the units aren't convertible.
 */
export function convertRaw(
  value: number,
  fromRaw: string,
  toRaw: string,
): Measurement {
  const from = parseUnit(fromRaw);
  const to = parseUnit(toRaw);
  if (!from) throw new Error(`Unknown unit: "${fromRaw}"`);
  if (!to) throw new Error(`Unknown unit: "${toRaw}"`);
  if (!isConvertible(from, to)) {
    throw new Error(`Cannot convert between "${from}" and "${to}"`);
  }
  if (from === to) return { value, unit: to };
  if (!isMassUnit(from) || !isMassUnit(to)) {
    return { value, unit: to };
  }
  return { value: convert(value, from, to), unit: to };
}
