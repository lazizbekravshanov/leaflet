import { describe, it, expect } from "vitest";
import { requireString, requireEmail, requireUsername } from "@/lib/validate";
import { ValidationError } from "@/lib/errors";

describe("requireString", () => {
  it("trims and returns the value", () => {
    expect(requireString("  hi  ", "x")).toBe("hi");
  });

  it("rejects non-strings and length violations", () => {
    expect(() => requireString(42, "x")).toThrow(ValidationError);
    expect(() => requireString("ab", "x", { min: 3 })).toThrow(/at least 3/);
    expect(() => requireString("abcdef", "x", { max: 3 })).toThrow(/at most 3/);
  });

  it("enforces a BYTE limit, not a char limit (the bcrypt-72 fix)", () => {
    // 36 × 'é' = 72 bytes (é is 2 bytes UTF-8) — passes.
    expect(requireString("é".repeat(36), "password", { maxBytes: 72 })).toHaveLength(36);
    // 37 × 'é' = 74 bytes — rejected, even though it's only 37 chars.
    expect(() => requireString("é".repeat(37), "password", { maxBytes: 72 })).toThrow(
      /at most 72 bytes/,
    );
  });
});

describe("requireEmail", () => {
  it("lowercases valid addresses", () => {
    expect(requireEmail("A@B.Com")).toBe("a@b.com");
  });
  it("rejects malformed addresses", () => {
    expect(() => requireEmail("nope")).toThrow(ValidationError);
  });
});

describe("requireUsername", () => {
  it("accepts 3–20 lowercase/digit/underscore", () => {
    expect(requireUsername("amelia_99")).toBe("amelia_99");
  });
  it("rejects bad shapes", () => {
    expect(() => requireUsername("ab")).toThrow(ValidationError);
    expect(() => requireUsername("Has Spaces")).toThrow(ValidationError);
  });
});
