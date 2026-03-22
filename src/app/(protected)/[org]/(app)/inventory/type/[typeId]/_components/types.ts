export interface StatusDef {
  id: string;
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
  isRequired?: boolean;
  unit?: string | null;
  options?: unknown;
  defaultValue?: string | null;
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
