import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Seed data shapes — mirror the DB insert shapes without IDs (assigned at insert)
// ---------------------------------------------------------------------------

export const STATUS_CATEGORIES = [
  "unstarted",
  "in_progress",
  "done",
  "canceled",
] as const;

export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

export interface SeedStatusDefinition {
  name: string;
  color?: string;
  category: StatusCategory;
  ordinal: number;
}

export interface SeedStatusTransition {
  /** References SeedStatusDefinition.name within the same lot type */
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

export interface SeedLotType {
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

export interface SeedLotsInputConfig {
  /** References SeedLotType.name — resolved to an ID at insert time */
  lotTypeName: string;
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
  lots: { config: SeedLotsInputConfig };
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
  lotTypes: SeedLotType[];
  operations: SeedOperationType[];
  locations: SeedLocation[];
}

// ---------------------------------------------------------------------------
// Wizard step / vertical definition
// ---------------------------------------------------------------------------

export interface StepProps<T = Record<string, unknown>> {
  answers: T;
  onNext: (stepAnswers: Partial<T>) => void;
  onBack: () => void;
}

export interface VerticalStep<T = Record<string, unknown>> {
  key: string;
  title: string;
  component: ComponentType<StepProps<T>>;
}

export interface VerticalDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  steps: VerticalStep[];
  buildSeedData: (answers: Record<string, unknown>) => SeedData;
}

/**
 * Type-safe vertical builder — enforces that all steps and buildSeedData
 * agree on the answer shape `T`, then erases the generic for the registry.
 */
export function defineVertical<T extends Record<string, unknown>>(def: {
  key: string;
  name: string;
  description: string;
  icon: string;
  steps: VerticalStep<T>[];
  buildSeedData: (answers: T) => SeedData;
}): VerticalDefinition {
  return def as VerticalDefinition;
}
