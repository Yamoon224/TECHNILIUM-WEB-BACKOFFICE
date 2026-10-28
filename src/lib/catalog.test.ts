import { describe, expect, it } from "vitest";
import { imageProblem, MAX_IMAGE_BYTES } from "./catalog";

describe("imageProblem", () => {
  it("accepts JPG, PNG and WebP within the size limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(imageProblem({ type, size: 1000 })).toBeNull();
    }
    expect(imageProblem({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it("refuses other formats, SVG included", () => {
    expect(imageProblem({ type: "image/svg+xml", size: 100 })).toMatch(/Format/);
    expect(imageProblem({ type: "application/pdf", size: 100 })).toMatch(/Format/);
  });

  it("refuses an oversized file", () => {
    expect(imageProblem({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toMatch(/2 Mo/);
  });
});
