import { describe, expect, it } from "vitest";
import { passwordProblem } from "./passwordRules";

describe("passwordProblem", () => {
  it("accepts 8+ characters with a letter and a digit", () => {
    expect(passwordProblem("Nouveau123")).toBeNull();
    expect(passwordProblem("été12345")).toBeNull();
  });

  it("names the first thing that is wrong", () => {
    expect(passwordProblem("a1")).toBe("short");
    expect(passwordProblem("12345678")).toBe("letter");
    expect(passwordProblem("abcdefgh")).toBe("digit");
  });

  it("checks the confirmation only when one is given", () => {
    expect(passwordProblem("Nouveau123", "Nouveau123")).toBeNull();
    expect(passwordProblem("Nouveau123", "Autre12345")).toBe("mismatch");
    expect(passwordProblem("Nouveau123", undefined)).toBeNull();
  });
});
