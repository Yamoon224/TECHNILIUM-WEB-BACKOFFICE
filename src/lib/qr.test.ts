import { describe, expect, it } from "vitest";
import { clampLogoRatio, isLogoFileAllowed, logoBox, LOGO_RATIO, parseQrPayload, qrFileName } from "./qr";

describe("logoBox", () => {
  it("centres a square logo of the asked share of the code", () => {
    expect(logoBox(500, 0.2)).toEqual({ x: 200, y: 200, side: 100 });
  });

  it("never lets the logo grow past what error correction can hide", () => {
    expect(logoBox(500, 0.9).side).toBe(Math.round(500 * LOGO_RATIO.max));
    expect(logoBox(500, 0).side).toBe(Math.round(500 * LOGO_RATIO.min));
  });

  it("falls back to the default share for a nonsense value", () => {
    expect(clampLogoRatio(Number.NaN)).toBe(LOGO_RATIO.default);
  });
});

describe("parseQrPayload", () => {
  it("reads back what a code says", () => {
    expect(parseQrPayload("TECHNILIUM:ORDER:TCH-20261025-AB12CD")).toEqual({ kind: "order", reference: "TCH-20261025-AB12CD" });
    expect(parseQrPayload(" TECHNILIUM:SUPPLY:12 ")).toEqual({ kind: "supply", reference: "12" });
  });

  it("refuses anything else", () => {
    expect(parseQrPayload("https://exemple.com")).toBeNull();
    expect(parseQrPayload("TECHNILIUM:USER:1")).toBeNull();
    expect(parseQrPayload("TECHNILIUM:ORDER:<script>")).toBeNull();
  });
});

describe("qrFileName", () => {
  it("keeps a file name safe", () => {
    expect(qrFileName("invoice", "F-2026/0042", "png")).toBe("qr-invoice-F-2026-0042.png");
    expect(qrFileName("order", "../../x", "svg")).toBe("qr-order-x.svg");
    expect(qrFileName("order", "???", "svg")).toBe("qr-order-code.svg");
  });
});

describe("isLogoFileAllowed", () => {
  it("accepts raster pictures of a sensible size, never SVG", () => {
    expect(isLogoFileAllowed({ type: "image/png", size: 1000 })).toBe(true);
    expect(isLogoFileAllowed({ type: "image/svg+xml", size: 1000 })).toBe(false);
    expect(isLogoFileAllowed({ type: "image/png", size: 3 * 1024 * 1024 })).toBe(false);
    expect(isLogoFileAllowed({ type: "image/png", size: 0 })).toBe(false);
  });
});
