import { describe, it, expect } from "vitest";
import {
  mergeVariantDefaults,
  type VariantDefaults,
} from "./merge-option-defaults";

function vd(overrides: Partial<VariantDefaults> = {}): VariantDefaults {
  return {
    defaultValue: null,
    defaultValueCurrency: null,
    defaultQuantity: null,
    defaultQuantityUnit: null,
    defaultAttributes: null,
    ...overrides,
  };
}

describe("mergeVariantDefaults", () => {
  it("returns all nulls for empty variant defaults", () => {
    const result = mergeVariantDefaults(vd());
    expect(result).toEqual({
      value: null,
      valueCurrency: null,
      quantity: null,
      quantityUnit: null,
      attributes: {},
    });
  });

  it("applies variant defaults when no existing values", () => {
    const result = mergeVariantDefaults(
      vd({
        defaultValue: 1299,
        defaultValueCurrency: "CAD",
        defaultQuantity: "5",
        defaultQuantityUnit: "lb",
        defaultAttributes: { grade: "A" },
      }),
    );
    expect(result).toEqual({
      value: 1299,
      valueCurrency: "CAD",
      quantity: "5",
      quantityUnit: "lb",
      attributes: { grade: "A" },
    });
  });

  it("existing values take precedence over defaults", () => {
    const result = mergeVariantDefaults(
      vd({
        defaultValue: 1299,
        defaultValueCurrency: "CAD",
        defaultQuantity: "5",
        defaultQuantityUnit: "lb",
      }),
      {
        value: 500,
        valueCurrency: "USD",
        quantity: "3",
        quantityUnit: "kg",
      },
    );
    expect(result).toEqual({
      value: 500,
      valueCurrency: "USD",
      quantity: "3",
      quantityUnit: "kg",
      attributes: {},
    });
  });

  it("fills unset fields from defaults when existing is partial", () => {
    const result = mergeVariantDefaults(
      vd({
        defaultValue: 1299,
        defaultValueCurrency: "CAD",
        defaultQuantity: "5",
        defaultQuantityUnit: "lb",
      }),
      { value: 800 },
    );
    expect(result).toEqual({
      value: 800,
      valueCurrency: "CAD",
      quantity: "5",
      quantityUnit: "lb",
      attributes: {},
    });
  });

  it("existing attributes overlay on top of variant defaults", () => {
    const result = mergeVariantDefaults(
      vd({ defaultAttributes: { a: 1, b: 2, c: 3 } }),
      { attributes: { b: 99, d: 4 } },
    );
    expect(result.attributes).toEqual({ a: 1, b: 99, c: 3, d: 4 });
  });

  it("returns existing values when variant has no defaults", () => {
    const result = mergeVariantDefaults(vd(), {
      value: 500,
      valueCurrency: "USD",
      quantity: "3",
      quantityUnit: "lb",
      attributes: { color: "red" },
    });
    expect(result).toEqual({
      value: 500,
      valueCurrency: "USD",
      quantity: "3",
      quantityUnit: "lb",
      attributes: { color: "red" },
    });
  });

  it("quantityUnit applies independently of quantity", () => {
    const result = mergeVariantDefaults(vd({ defaultQuantityUnit: "lb" }));
    expect(result.quantity).toBeNull();
    expect(result.quantityUnit).toBe("lb");
  });

  it("null existing fields do not override defaults", () => {
    const result = mergeVariantDefaults(
      vd({ defaultValue: 1299, defaultValueCurrency: "CAD" }),
      { value: null, valueCurrency: null },
    );
    expect(result.value).toBe(1299);
    expect(result.valueCurrency).toBe("CAD");
  });
});
