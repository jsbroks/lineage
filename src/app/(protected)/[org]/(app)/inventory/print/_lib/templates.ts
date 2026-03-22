export interface LabelTemplate {
  id: string;
  name: string;
  category: "thermal" | "sheet";
  pageWidth: number;
  pageHeight: number;
  labelWidth: number;
  labelHeight: number;
  columns: number;
  rows: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
}

export interface LabelContent {
  showQrCode: boolean;
  showBarcode: boolean;
  showLotCode: boolean;
  showTypeName: boolean;
  showVariantName: boolean;
  customText: string;
}

export const DEFAULT_LABEL_CONTENT: LabelContent = {
  showQrCode: true,
  showBarcode: true,
  showLotCode: true,
  showTypeName: false,
  showVariantName: false,
  customText: "",
};

export const LABEL_TEMPLATES: LabelTemplate[] = [
  // --- Thermal ---
  {
    id: "dymo-30252",
    name: "Dymo 30252",
    category: "thermal",
    pageWidth: 3.5,
    pageHeight: 1.125,
    labelWidth: 3.5,
    labelHeight: 1.125,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },
  {
    id: "zebra-2x1",
    name: "Zebra 2×1",
    category: "thermal",
    pageWidth: 2,
    pageHeight: 1,
    labelWidth: 2,
    labelHeight: 1,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },
  {
    id: "zebra-4x6",
    name: "Zebra 4×6",
    category: "thermal",
    pageWidth: 4,
    pageHeight: 6,
    labelWidth: 4,
    labelHeight: 6,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },
  {
    id: "brother-dk1201",
    name: "Brother DK-1201",
    category: "thermal",
    pageWidth: 3.48,
    pageHeight: 1.14,
    labelWidth: 3.48,
    labelHeight: 1.14,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  // --- Sheet ---
  {
    id: "avery-5160",
    name: "Avery 5160 (30/sheet)",
    category: "sheet",
    pageWidth: 8.5,
    pageHeight: 11,
    labelWidth: 2.625,
    labelHeight: 1,
    columns: 3,
    rows: 10,
    marginTop: 0.5,
    marginLeft: 0.1875,
    gapX: 0.125,
    gapY: 0,
  },
  {
    id: "avery-5163",
    name: "Avery 5163 (10/sheet)",
    category: "sheet",
    pageWidth: 8.5,
    pageHeight: 11,
    labelWidth: 4,
    labelHeight: 2,
    columns: 2,
    rows: 5,
    marginTop: 0.5,
    marginLeft: 0.15625,
    gapX: 0.1875,
    gapY: 0,
  },
  {
    id: "avery-5164",
    name: "Avery 5164 (6/sheet)",
    category: "sheet",
    pageWidth: 8.5,
    pageHeight: 11,
    labelWidth: 4,
    labelHeight: 3.333,
    columns: 2,
    rows: 3,
    marginTop: 0.5,
    marginLeft: 0.15625,
    gapX: 0.1875,
    gapY: 0,
  },
];

export function getTemplate(id: string): LabelTemplate | undefined {
  return LABEL_TEMPLATES.find((t) => t.id === id);
}

const STORAGE_KEY_TEMPLATE = "print-label-template";
const STORAGE_KEY_CONTENT = "print-label-content";

export function loadSavedTemplate(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY_TEMPLATE);
}

export function saveTemplate(templateId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_TEMPLATE, templateId);
}

export function loadSavedContent(): LabelContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTENT);
    if (!raw) return null;
    return JSON.parse(raw) as LabelContent;
  } catch {
    return null;
  }
}

export function saveContent(content: LabelContent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(content));
}

export interface PrintItem {
  id: string;
  code: string;
  typeName: string;
  variantName: string | null;
}
