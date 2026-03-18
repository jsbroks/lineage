import { describe, it, expect } from "vitest";
import { determineItemTypeCode } from "./item-type-code";

function code(name: string) {
  return determineItemTypeCode({ name, slug: name.toLowerCase() });
}

describe("determineItemTypeCode", () => {
  describe("single word names", () => {
    it("returns first 3 characters uppercased", () => {
      expect(code("Mushrooms")).toBe("MUS");
    });

    it("handles short names", () => {
      expect(code("Ax")).toBe("AX");
    });

    it("handles exactly 3 characters", () => {
      expect(code("Box")).toBe("BOX");
    });
  });

  describe("two word names", () => {
    it("returns first 2 chars of first word + first char of second word, uppercased", () => {
      expect(code("Blue Oyster")).toBe("BLO");
    });

    it("handles short first word", () => {
      expect(code("A Thing")).toBe("AT");
    });
  });

  describe("three or more word names", () => {
    it("joins first 5 words lowercased for 3 words", () => {
      expect(code("Lions Mane Mushroom")).toBe("lionsmanemushroom");
    });

    it("truncates at 5 words for long names", () => {
      expect(code("a b c d e f g")).toBe("abcde");
    });

    it("handles exactly 3 words", () => {
      expect(code("Red Hot Chili")).toBe("redhotchili");
    });
  });

  describe("non-alpha character handling", () => {
    it("strips numbers and treats them as word separators", () => {
      expect(code("Item42Type")).toBe("itemtype");
    });

    it("strips special characters and splits into multiple words", () => {
      expect(code("Bee's-Wax")).toBe("beeswax");
    });

    it("collapses resulting empty words correctly", () => {
      expect(code("---")).toBe("");
    });
  });
});
