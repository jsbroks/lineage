export type VariantDefaults = {
  defaultValue: number | null;
  defaultValueCurrency: string | null;
  defaultQuantity: string | null;
  defaultQuantityUnit: string | null;
  defaultAttributes: Record<string, unknown> | null;
};

export type ItemDefaults = {
  value: number | null;
  valueCurrency: string | null;
  quantity: string | null;
  quantityUnit: string | null;
  attributes: Record<string, unknown>;
};

/**
 * Apply a variant's defaults to an item, keeping any non-null existing values.
 * Existing fields always take precedence. For attributes, existing keys overlay
 * on top of variant defaults (shallow merge).
 */
export function mergeVariantDefaults(
  variant: VariantDefaults,
  existing?: Partial<ItemDefaults>,
): ItemDefaults {
  let value = variant.defaultValue;
  let valueCurrency = variant.defaultValueCurrency;
  let quantity = variant.defaultQuantity;
  let quantityUnit = variant.defaultQuantityUnit;
  let attributes: Record<string, unknown> = variant.defaultAttributes
    ? { ...variant.defaultAttributes }
    : {};

  if (existing) {
    if (existing.value !== undefined && existing.value !== null) {
      value = existing.value;
    }
    if (
      existing.valueCurrency !== undefined &&
      existing.valueCurrency !== null
    ) {
      valueCurrency = existing.valueCurrency;
    }
    if (existing.quantity !== undefined && existing.quantity !== null) {
      quantity = existing.quantity;
    }
    if (existing.quantityUnit !== undefined && existing.quantityUnit !== null) {
      quantityUnit = existing.quantityUnit;
    }
    if (existing.attributes) {
      attributes = { ...attributes, ...existing.attributes };
    }
  }

  return { value, valueCurrency, quantity, quantityUnit, attributes };
}
