import { describe, it, expect } from "vitest";
import {
  matchLocationInput,
  matchLotsInput,
  evaluateOperationType,
  buildMatchDescription,
  type OpInput,
  type OpTypeWithInputs,
  type ScanContext,
  type ScanLot,
  type ScanLocation,
  type MatchResult,
} from "./operations-matching";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<OpInput> = {}): OpInput {
  return {
    id: "inp-1",
    referenceKey: "source",
    label: "Source",
    type: "lots",
    required: true,
    lotConfig: null,
    ...overrides,
  };
}

function makeLot(overrides: Partial<ScanLot> = {}): ScanLot {
  return {
    lot: { id: "lot-1" },
    lotType: { id: "type-1" },
    lotStatus: { name: "Active" },
    ...overrides,
  };
}

function makeLocation(overrides: Partial<ScanLocation> = {}): ScanLocation {
  return {
    location: { id: "loc-1" },
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    lots: [],
    locations: [],
    ...overrides,
  };
}

function makeOpType(
  overrides: Partial<OpTypeWithInputs> = {},
): OpTypeWithInputs {
  return {
    id: "op-type-1",
    name: "Test Operation",
    inputs: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// matchLocationInput
// ---------------------------------------------------------------------------

describe("matchLocationInput", () => {
  it("returns null when no locations in context", () => {
    const inp = makeInput({ type: "locations" });
    const ctx = makeCtx({ locations: [] });
    expect(matchLocationInput(inp, ctx)).toBeNull();
  });

  it("returns first location when present", () => {
    const inp = makeInput({ type: "locations" });
    const ctx = makeCtx({
      locations: [makeLocation({ location: { id: "loc-A" } })],
    });

    const result = matchLocationInput(inp, ctx);
    expect(result).not.toBeNull();
    expect(result!.input).toBe(inp);
    expect(result!.value).toBe("loc-A");
  });

  it("returns first location when multiple are present", () => {
    const inp = makeInput({ type: "locations" });
    const ctx = makeCtx({
      locations: [
        makeLocation({ location: { id: "loc-A" } }),
        makeLocation({ location: { id: "loc-B" } }),
      ],
    });

    const result = matchLocationInput(inp, ctx);
    expect(result!.value).toBe("loc-A");
  });
});

// ---------------------------------------------------------------------------
// matchLotsInput
// ---------------------------------------------------------------------------

describe("matchLotsInput", () => {
  it("returns null when no lots match (empty lots array)", () => {
    const inp = makeInput({ type: "lots", lotConfig: null });
    const ctx = makeCtx({ lots: [] });
    expect(matchLotsInput(inp, ctx)).toBeNull();
  });

  it("matches all lots when no lotConfig is set", () => {
    const lots = [makeLot({ lot: { id: "a" } }), makeLot({ lot: { id: "b" } })];
    const inp = makeInput({ type: "lots", lotConfig: null });
    const ctx = makeCtx({ lots });

    const result = matchLotsInput(inp, ctx);
    expect(result).not.toBeNull();
    expect(result!.value).toEqual(["a", "b"]);
  });

  it("filters lots by lotTypeId when lotConfig is set", () => {
    const lots = [
      makeLot({ lot: { id: "a" }, lotType: { id: "type-A" } }),
      makeLot({ lot: { id: "b" }, lotType: { id: "type-B" } }),
    ];
    const inp = makeInput({
      type: "lots",
      lotConfig: { lotTypeId: "type-A", preconditionsStatuses: null },
    });
    const ctx = makeCtx({ lots });

    const result = matchLotsInput(inp, ctx);
    expect(result!.value).toEqual(["a"]);
  });

  it("further filters by precondition statuses", () => {
    const lots = [
      makeLot({
        lot: { id: "a" },
        lotType: { id: "type-1" },
        lotStatus: { name: "Active" },
      }),
      makeLot({
        lot: { id: "b" },
        lotType: { id: "type-1" },
        lotStatus: { name: "Harvested" },
      }),
    ];
    const inp = makeInput({
      type: "lots",
      lotConfig: {
        lotTypeId: "type-1",
        preconditionsStatuses: ["Active"],
      },
    });
    const ctx = makeCtx({ lots });

    const result = matchLotsInput(inp, ctx);
    expect(result!.value).toEqual(["a"]);
  });

  it("matches all lots of a type when preconditionsStatuses is empty array", () => {
    const lots = [
      makeLot({
        lot: { id: "a" },
        lotType: { id: "type-1" },
        lotStatus: { name: "Active" },
      }),
      makeLot({
        lot: { id: "b" },
        lotType: { id: "type-1" },
        lotStatus: { name: "Done" },
      }),
    ];
    const inp = makeInput({
      type: "lots",
      lotConfig: { lotTypeId: "type-1", preconditionsStatuses: [] },
    });
    const ctx = makeCtx({ lots });

    const result = matchLotsInput(inp, ctx);
    expect(result!.value).toEqual(["a", "b"]);
  });

  it("returns null when lots exist but none match lotTypeId", () => {
    const lots = [makeLot({ lot: { id: "a" }, lotType: { id: "other" } })];
    const inp = makeInput({
      type: "lots",
      lotConfig: { lotTypeId: "type-1", preconditionsStatuses: null },
    });
    const ctx = makeCtx({ lots });

    expect(matchLotsInput(inp, ctx)).toBeNull();
  });

  it("excludes lots with null lotStatus when precondition statuses are specified", () => {
    const lots = [
      makeLot({
        lot: { id: "a" },
        lotType: { id: "type-1" },
        lotStatus: null,
      }),
    ];
    const inp = makeInput({
      type: "lots",
      lotConfig: { lotTypeId: "type-1", preconditionsStatuses: ["Active"] },
    });
    const ctx = makeCtx({ lots });

    expect(matchLotsInput(inp, ctx)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// evaluateOperationType
// ---------------------------------------------------------------------------

describe("evaluateOperationType", () => {
  it("returns null when no scan inputs match", () => {
    const opType = makeOpType({
      inputs: [
        makeInput({
          id: "i1",
          type: "lots",
          lotConfig: { lotTypeId: "other", preconditionsStatuses: null },
        }),
      ],
    });
    const ctx = makeCtx({
      lots: [makeLot({ lotType: { id: "type-1" } })],
    });

    expect(evaluateOperationType(opType, ctx)).toBeNull();
  });

  it("returns score 1.0 when all scan inputs are matched", () => {
    const opType = makeOpType({
      inputs: [
        makeInput({ id: "i1", type: "lots", lotConfig: null }),
        makeInput({ id: "i2", type: "locations" }),
      ],
    });
    const ctx = makeCtx({
      lots: [makeLot()],
      locations: [makeLocation()],
    });

    const result = evaluateOperationType(opType, ctx);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1.0);
    expect(result!.matchedInputs).toHaveLength(2);
    expect(result!.unmatchedScanInputs).toHaveLength(0);
  });

  it("returns partial score when some scan inputs are unmatched", () => {
    const opType = makeOpType({
      inputs: [
        makeInput({ id: "i1", type: "lots", lotConfig: null }),
        makeInput({ id: "i2", type: "locations" }),
      ],
    });
    const ctx = makeCtx({
      lots: [makeLot()],
      locations: [],
    });

    const result = evaluateOperationType(opType, ctx);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0.5);
    expect(result!.matchedInputs).toHaveLength(1);
    expect(result!.unmatchedScanInputs).toHaveLength(1);
  });

  it("classifies non-scan inputs as promptInputs", () => {
    const opType = makeOpType({
      inputs: [
        makeInput({ id: "i1", type: "lots", lotConfig: null }),
        makeInput({ id: "i2", type: "text", referenceKey: "notes" }),
        makeInput({ id: "i3", type: "number", referenceKey: "weight" }),
      ],
    });
    const ctx = makeCtx({ lots: [makeLot()] });

    const result = evaluateOperationType(opType, ctx);
    expect(result!.promptInputs).toHaveLength(2);
    expect(result!.promptInputs.map((p) => p.referenceKey)).toEqual([
      "notes",
      "weight",
    ]);
  });

  it("allRequiredScanInputsSatisfied is true when unmatched are optional", () => {
    const opType = makeOpType({
      inputs: [
        makeInput({ id: "i1", type: "lots", lotConfig: null, required: true }),
        makeInput({ id: "i2", type: "locations", required: false }),
      ],
    });
    const ctx = makeCtx({ lots: [makeLot()], locations: [] });

    const result = evaluateOperationType(opType, ctx);
    expect(result!.allRequiredScanInputsSatisfied).toBe(true);
  });

  it("allRequiredScanInputsSatisfied is false when unmatched are required", () => {
    const opType = makeOpType({
      inputs: [
        makeInput({ id: "i1", type: "lots", lotConfig: null, required: true }),
        makeInput({ id: "i2", type: "locations", required: true }),
      ],
    });
    const ctx = makeCtx({ lots: [makeLot()], locations: [] });

    const result = evaluateOperationType(opType, ctx);
    expect(result!.allRequiredScanInputsSatisfied).toBe(false);
  });

  it("returns null when opType has only prompt inputs", () => {
    const opType = makeOpType({
      inputs: [makeInput({ id: "i1", type: "text" })],
    });
    const ctx = makeCtx({ lots: [makeLot()] });

    expect(evaluateOperationType(opType, ctx)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildMatchDescription
// ---------------------------------------------------------------------------

describe("buildMatchDescription", () => {
  it("describes singular lot match", () => {
    const result: MatchResult = {
      matchedInputs: [{ input: makeInput({ type: "lots" }), value: ["lot-1"] }],
      unmatchedScanInputs: [],
      promptInputs: [],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe("1 lot matched.");
  });

  it("describes plural lot match", () => {
    const result: MatchResult = {
      matchedInputs: [
        { input: makeInput({ type: "lots" }), value: ["a", "b", "c"] },
      ],
      unmatchedScanInputs: [],
      promptInputs: [],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe("3 lots matched.");
  });

  it("describes singular location match", () => {
    const result: MatchResult = {
      matchedInputs: [
        { input: makeInput({ type: "locations" }), value: "loc-1" },
      ],
      unmatchedScanInputs: [],
      promptInputs: [],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe("1 location matched.");
  });

  it("describes plural locations", () => {
    const result: MatchResult = {
      matchedInputs: [
        { input: makeInput({ id: "a", type: "locations" }), value: "loc-1" },
        { input: makeInput({ id: "b", type: "locations" }), value: "loc-2" },
      ],
      unmatchedScanInputs: [],
      promptInputs: [],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe("2 locations matched.");
  });

  it("describes lots and locations together", () => {
    const result: MatchResult = {
      matchedInputs: [
        { input: makeInput({ type: "lots" }), value: ["a"] },
        { input: makeInput({ type: "locations" }), value: "loc-1" },
      ],
      unmatchedScanInputs: [],
      promptInputs: [],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe("1 lot and 1 location matched.");
  });

  it("appends prompt input count (singular)", () => {
    const result: MatchResult = {
      matchedInputs: [{ input: makeInput({ type: "lots" }), value: ["a"] }],
      unmatchedScanInputs: [],
      promptInputs: [makeInput({ type: "text" })],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe(
      "1 lot matched. 1 more input needed.",
    );
  });

  it("appends prompt input count (plural)", () => {
    const result: MatchResult = {
      matchedInputs: [
        { input: makeInput({ type: "lots" }), value: ["a", "b"] },
      ],
      unmatchedScanInputs: [],
      promptInputs: [
        makeInput({ id: "p1", type: "text" }),
        makeInput({ id: "p2", type: "number" }),
      ],
      score: 1,
      allRequiredScanInputsSatisfied: true,
    };

    expect(buildMatchDescription(result)).toBe(
      "2 lots matched. 2 more inputs needed.",
    );
  });
});
