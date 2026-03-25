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

// ---------------------------------------------------------------------------
// Stock UOM catalog — every unit of measure available as a stock UOM
// ---------------------------------------------------------------------------

export type UomCategory =
  | "mass"
  | "volume"
  | "length"
  | "area"
  | "count"
  | "molar"
  | "moles";

export type UomOption = {
  readonly label: string;
  readonly value: string;
  readonly category: UomCategory;
};

export const STOCK_UOM_OPTIONS: readonly UomOption[] = [
  { label: "Bags (bags)", value: "bags", category: "count" },
  { label: "Barrels (bbls)", value: "bbls", category: "volume" },
  { label: "Cases (cs)", value: "cs", category: "count" },
  { label: "Centimeters (cm)", value: "cm", category: "length" },
  { label: "Each (ea)", value: "ea", category: "count" },
  { label: "Feet (ft)", value: "ft", category: "length" },
  { label: "Fluid Ounces (fl oz)", value: "fl oz", category: "volume" },
  { label: "Gallons (gal)", value: "gal", category: "volume" },
  { label: "Grams (g)", value: "g", category: "mass" },
  { label: "Gross (gross)", value: "gross", category: "count" },
  { label: "Hundred Count (h)", value: "h", category: "count" },
  { label: "Inches (in)", value: "in", category: "length" },
  { label: "Kilograms (kg)", value: "kg", category: "mass" },
  { label: "Liters (L)", value: "L", category: "volume" },
  { label: "Meters (m)", value: "m", category: "length" },
  { label: "Micrograms (µg)", value: "µg", category: "mass" },
  { label: "Microliters (µL)", value: "µL", category: "volume" },
  { label: "Micromolar (µM)", value: "µM", category: "molar" },
  { label: "Micromoles (µmol)", value: "µmol", category: "moles" },
  { label: "Milligrams (mg)", value: "mg", category: "mass" },
  { label: "Milliliters (mL)", value: "mL", category: "volume" },
  { label: "Millimeters (mm)", value: "mm", category: "length" },
  { label: "Millimolar (mM)", value: "mM", category: "molar" },
  { label: "Millimoles (mmol)", value: "mmol", category: "moles" },
  { label: "Nanograms (ng)", value: "ng", category: "mass" },
  { label: "Nanoliters (nL)", value: "nL", category: "volume" },
  { label: "Nanomolar (nM)", value: "nM", category: "molar" },
  { label: "Nanomoles (nmol)", value: "nmol", category: "moles" },
  { label: "Ounces (oz)", value: "oz", category: "mass" },
  { label: "Pairs (pairs)", value: "pairs", category: "count" },
  { label: "Pieces (pcs)", value: "pcs", category: "count" },
  { label: "Pounds (lb)", value: "lb", category: "mass" },
  { label: "Sets (sets)", value: "sets", category: "count" },
  { label: "Square Centimeters (cm²)", value: "cm²", category: "area" },
  { label: "Square Feet (ft²)", value: "ft²", category: "area" },
  { label: "Square Inches (in²)", value: "in²", category: "area" },
  { label: "Square Meters (m²)", value: "m²", category: "area" },
  { label: "Thousand Count (k)", value: "k", category: "count" },
  { label: "Troy Ounces (ozt)", value: "ozt", category: "mass" },
  { label: "Yards (yd)", value: "yd", category: "length" },
] as const;

const MASS_UOM_VALUES = new Set<string>(
  STOCK_UOM_OPTIONS.filter((o) => o.category === "mass").map((o) => o.value),
);

/** Check whether a stock UOM value (e.g. "g", "µg", "ozt") is a mass unit. */
export function isMassStockUom(value: string): boolean {
  return MASS_UOM_VALUES.has(value);
}

/** Look up the category for a stock UOM value. */
export function stockUomCategory(value: string): UomCategory | null {
  return STOCK_UOM_OPTIONS.find((o) => o.value === value)?.category ?? null;
}

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
export function formatMeasurement(m: Measurement, precision = 2): string {
  const rounded = Math.round(m.value * 10 ** precision) / 10 ** precision;
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
