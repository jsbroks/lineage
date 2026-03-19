export interface StatusDef {
  slug: string;
  name: string;
  color: string | null;
  isInitial: boolean;
  isTerminal: boolean;
}

export interface VariantDef {
  id: string;
  name: string;
}

export interface LocationDef {
  id: string;
  name: string;
}

export interface AttrDef {
  id: string;
  attrKey: string;
  dataType: string;
  unit?: string | null;
  options?: unknown;
}

export interface ItemRow {
  id: string;
  code: string;
  status: string;
  variantName: string | null;
  locationName: string | null;
  quantity: string;
  quantityUom: string | null;
  createdAt: string | Date;
}
