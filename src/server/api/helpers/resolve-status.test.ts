import { describe, it, expect, vi } from "vitest";
import { resolveStatusId, UUID_RE } from "./resolve-status";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Stub builder — simulates drizzle's fluent query chain
// ---------------------------------------------------------------------------

type Row = { id: string };

function createTx(queries: Row[][]) {
  let callIndex = 0;

  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(() => {
      const result = queries[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(result);
    }),
  };

  return chain;
}

const LOT_TYPE_ID = "type-1";
const STATUS_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ---------------------------------------------------------------------------
// UUID_RE
// ---------------------------------------------------------------------------

describe("UUID_RE", () => {
  it("matches valid UUIDs", () => {
    expect(UUID_RE.test(STATUS_UUID)).toBe(true);
    expect(UUID_RE.test("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(UUID_RE.test("Active")).toBe(false);
    expect(UUID_RE.test("created")).toBe(false);
    expect(UUID_RE.test("not-a-uuid")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveStatusId
// ---------------------------------------------------------------------------

describe("resolveStatusId", () => {
  describe("UUID input", () => {
    it("resolves by exact UUID match", async () => {
      const tx = createTx([[{ id: STATUS_UUID }]]);
      const result = await resolveStatusId(tx, LOT_TYPE_ID, STATUS_UUID);
      expect(result).toBe(STATUS_UUID);
    });

    it("throws when UUID does not belong to the lot type", async () => {
      const tx = createTx([[]]);
      await expect(
        resolveStatusId(tx, LOT_TYPE_ID, STATUS_UUID),
      ).rejects.toThrow(TRPCError);
      await expect(
        resolveStatusId(createTx([[]]), LOT_TYPE_ID, STATUS_UUID),
      ).rejects.toThrow(/does not belong to this lot type/);
    });
  });

  describe("name input", () => {
    it("resolves by status name match", async () => {
      const tx = createTx([[{ id: "status-active" }]]);
      const result = await resolveStatusId(tx, LOT_TYPE_ID, "Active");
      expect(result).toBe("status-active");
    });

    it("falls back to category-based resolution when name is not found", async () => {
      const tx = createTx([[], [{ id: "status-unstarted" }]]);
      const result = await resolveStatusId(tx, LOT_TYPE_ID, "Nonexistent");
      expect(result).toBe("status-unstarted");
    });

    it("throws when no match and no fallback found", async () => {
      const tx = createTx([[], []]);
      await expect(
        resolveStatusId(tx, LOT_TYPE_ID, "Nonexistent"),
      ).rejects.toThrow(TRPCError);
      await expect(
        resolveStatusId(createTx([[], []]), LOT_TYPE_ID, "Nonexistent"),
      ).rejects.toThrow(/Could not resolve status/);
    });
  });

  describe("empty status definitions", () => {
    it("throws with descriptive message when no statuses are configured", async () => {
      const tx = createTx([[], []]);
      await expect(
        resolveStatusId(tx, LOT_TYPE_ID, "anything"),
      ).rejects.toThrow(/No statuses are configured/);
    });
  });
});
