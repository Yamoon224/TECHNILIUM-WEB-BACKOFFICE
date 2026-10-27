import { describe, expect, it } from "vitest";
import { MAX_CODE_ATTEMPTS, codeAttemptsLeft } from "./shipping";

describe("codeAttemptsLeft", () => {
  it("counts down from the limit", () => {
    expect(codeAttemptsLeft({ code_attempts: 0 })).toBe(MAX_CODE_ATTEMPTS);
    expect(codeAttemptsLeft({ code_attempts: 2 })).toBe(MAX_CODE_ATTEMPTS - 2);
  });

  it("never goes negative once locked", () => {
    expect(codeAttemptsLeft({ code_attempts: MAX_CODE_ATTEMPTS + 3 })).toBe(0);
  });
});
