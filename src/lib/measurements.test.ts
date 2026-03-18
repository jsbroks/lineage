import { describe, it, expect } from "vitest";
import {
  convert,
  toGrams,
  fromGrams,
  normalize,
  parseUnit,
  isConvertible,
  formatMeasurement,
  convertRaw,
} from "./measurements";

describe("parseUnit", () => {
  it("resolves canonical abbreviations", () => {
    expect(parseUnit("g")).toBe("g");
    expect(parseUnit("kg")).toBe("kg");
    expect(parseUnit("lb")).toBe("lb");
    expect(parseUnit("oz")).toBe("oz");
    expect(parseUnit("each")).toBe("each");
  });

  it("resolves aliases case-insensitively", () => {
    expect(parseUnit("Pounds")).toBe("lb");
    expect(parseUnit("LBS")).toBe("lb");
    expect(parseUnit("Kilogram")).toBe("kg");
    expect(parseUnit("OUNCES")).toBe("oz");
    expect(parseUnit("metric ton")).toBe("tonne");
    expect(parseUnit("EA")).toBe("each");
  });

  it("returns null for unknown strings", () => {
    expect(parseUnit("furlongs")).toBeNull();
    expect(parseUnit("")).toBeNull();
  });
});

describe("isConvertible", () => {
  it("mass units are convertible to each other", () => {
    expect(isConvertible("g", "kg")).toBe(true);
    expect(isConvertible("lb", "oz")).toBe(true);
  });

  it("identical units are always convertible", () => {
    expect(isConvertible("each", "each")).toBe(true);
  });

  it("count and mass are not convertible", () => {
    expect(isConvertible("each", "kg")).toBe(false);
    expect(isConvertible("lb", "each")).toBe(false);
  });
});

describe("convert", () => {
  it("identity returns same value", () => {
    expect(convert(5, "g", "g")).toBe(5);
  });

  it("kg ↔ g", () => {
    expect(convert(1, "kg", "g")).toBe(1000);
    expect(convert(500, "g", "kg")).toBe(0.5);
  });

  it("lb ↔ kg", () => {
    expect(convert(1, "lb", "kg")).toBeCloseTo(0.453_592, 4);
    expect(convert(1, "kg", "lb")).toBeCloseTo(2.204_623, 3);
  });

  it("oz ↔ lb", () => {
    expect(convert(16, "oz", "lb")).toBeCloseTo(1, 5);
  });

  it("ton ↔ lb", () => {
    expect(convert(1, "ton", "lb")).toBeCloseTo(2000, 1);
  });

  it("tonne ↔ kg", () => {
    expect(convert(1, "tonne", "kg")).toBe(1000);
  });
});

describe("toGrams / fromGrams", () => {
  it("round-trips correctly", () => {
    expect(fromGrams(toGrams(3.5, "lb"), "lb")).toBeCloseTo(3.5, 10);
    expect(fromGrams(toGrams(250, "mg"), "mg")).toBeCloseTo(250, 10);
  });
});

describe("normalize", () => {
  it("converts mass to grams", () => {
    const result = normalize({ value: 2, unit: "kg" });
    expect(result).toEqual({ value: 2000, unit: "g" });
  });

  it("leaves count units unchanged", () => {
    const result = normalize({ value: 10, unit: "each" });
    expect(result).toEqual({ value: 10, unit: "each" });
  });
});

describe("formatMeasurement", () => {
  it("formats with default precision", () => {
    expect(formatMeasurement({ value: 1.456, unit: "kg" })).toBe("1.46 kg");
  });

  it("formats with custom precision", () => {
    expect(formatMeasurement({ value: 1.23456, unit: "lb" }, 3)).toBe(
      "1.235 lb",
    );
  });
});

describe("convertRaw", () => {
  it("converts using raw string units", () => {
    const result = convertRaw(1, "Pounds", "kg");
    expect(result.value).toBeCloseTo(0.453_592, 4);
    expect(result.unit).toBe("kg");
  });

  it("throws on unknown unit", () => {
    expect(() => convertRaw(1, "furlongs", "kg")).toThrow('Unknown unit');
  });

  it("throws on incompatible units", () => {
    expect(() => convertRaw(1, "lb", "each")).toThrow("Cannot convert");
  });
});
