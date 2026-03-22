import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Seed data shapes — mirror the DB insert shapes without IDs (assigned at insert)
// ---------------------------------------------------------------------------

export interface SeedStatusDefinition {
  name: string;
  color?: string;
  isInitial: boolean;
  isTerminal: boolean;
  ordinal: number;
}

export interface SeedStatusTransition {
  /** References SeedStatusDefinition.name within the same item type */
  from: string;
  to: string;
}

export interface SeedOption {
  name: string;
  position: number;
  values: { value: string; position: number }[];
}

export interface SeedVariant {
  name: string;
  isDefault: boolean;
  sortOrder: number;
  /** Maps option name -> value name for this variant's option selections */
  optionSelections?: Record<string, string>;
}

export interface SeedAttributeDefinition {
  attrKey: string;
  dataType: string;
  isRequired: boolean;
  unit?: string;
  options?: Record<string, unknown>;
  defaultValue?: string;
  sortOrder: number;
}

export interface SeedItemType {
  name: string;
  description?: string;
  category: string;
  quantityName?: string;
  quantityDefaultUnit?: string;
  icon?: string;
  color?: string;
  codePrefix?: string;
  statuses: SeedStatusDefinition[];
  transitions: SeedStatusTransition[];
  options?: SeedOption[];
  variants?: SeedVariant[];
  attributes?: SeedAttributeDefinition[];
}

// ---------------------------------------------------------------------------
// Unified operation-type inputs (discriminated union on `type`)
// ---------------------------------------------------------------------------

export interface SeedItemsInputConfig {
  /** References SeedItemType.name — resolved to an ID at insert time */
  itemTypeName: string;
  qtyMin?: string;
  qtyMax?: string;
  preconditionsStatuses?: string[];
}

export interface SeedValueInputConfig {
  options?: Record<string, unknown>;
  defaultValue?: unknown;
}

/** Maps each input type discriminant to its config shape (intersected into the base). */
export interface SeedInputConfigMap {
  items: { config: SeedItemsInputConfig };
  location: {};
  string: { config?: SeedValueInputConfig };
  number: { config?: SeedValueInputConfig };
  date: { config?: SeedValueInputConfig };
}

export type SeedInputType = keyof SeedInputConfigMap;

interface SeedOperationTypeInputBase {
  referenceKey: string;
  label?: string;
  description?: string;
  required?: boolean;
  sortOrder: number;
}

/** Strongly-typed input for a known type `T`. */
export type SeedOperationTypeInputOf<T extends SeedInputType> =
  SeedOperationTypeInputBase & { type: T } & SeedInputConfigMap[T];

/** Discriminated union of all input types — narrows on `type`. */
export type SeedOperationTypeInput = {
  [K in SeedInputType]: SeedOperationTypeInputOf<K>;
}[SeedInputType];

export interface SeedOperationTypeStep {
  name: string;
  action: string;
  target?: string;
  config?: Record<string, unknown>;
  sortOrder: number;
}

export interface SeedOperationType {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  inputs?: SeedOperationTypeInput[];
  steps?: SeedOperationTypeStep[];
}

export interface SeedLocation {
  name: string;
  description?: string;
  type: string;
  children?: SeedLocation[];
}

export interface SeedData {
  itemTypes: SeedItemType[];
  operations: SeedOperationType[];
  locations: SeedLocation[];
}

// ---------------------------------------------------------------------------
// Wizard step / vertical definition
// ---------------------------------------------------------------------------

export interface StepProps {
  answers: Record<string, unknown>;
  onNext: (stepAnswers: Record<string, unknown>) => void;
  onBack: () => void;
}

export interface VerticalStep {
  key: string;
  title: string;
  component: ComponentType<StepProps>;
}

export interface VerticalDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  steps: VerticalStep[];
  buildSeedData: (answers: Record<string, unknown>) => SeedData;
}
