import { describe, expect, it } from "vitest";
import {
  cssVariables,
  DEFAULT_APPEARANCE,
  isHexColor,
  parseAppearance,
  readableOn,
  resolveTheme,
  shade,
} from "./appearance";

describe("readableOn", () => {
  it("picks white on dark colours and near-black on light ones", () => {
    expect(readableOn("#0f1a33")).toBe("#ffffff");
    expect(readableOn("#2563eb")).toBe("#ffffff");
    expect(readableOn("#ffffff")).toBe("#0b0f19");
    expect(readableOn("#f1f5f9")).toBe("#0b0f19");
  });

  it("falls back to white for something that is not a colour", () => {
    expect(readableOn("red")).toBe("#ffffff");
  });
});

describe("shade", () => {
  it("lightens toward white and darkens toward black", () => {
    expect(shade("#000000", 0.5)).toBe("#808080");
    expect(shade("#ffffff", -0.5)).toBe("#808080");
    expect(shade("#336699", 0)).toBe("#336699");
  });

  it("leaves an invalid colour untouched", () => {
    expect(shade("nope", 0.3)).toBe("nope");
  });
});

describe("resolveTheme", () => {
  it("follows the system only in auto mode", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("isHexColor", () => {
  it("accepts only six-digit hex", () => {
    expect(isHexColor("#aabbcc")).toBe(true);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("url(javascript:alert(1))")).toBe(false);
    expect(isHexColor(12)).toBe(false);
  });
});

describe("parseAppearance", () => {
  it("returns the defaults when nothing or garbage is stored", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("{not json")).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("42")).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("null")).toEqual(DEFAULT_APPEARANCE);
  });

  it("keeps valid choices and drops invalid ones", () => {
    const parsed = parseAppearance(
      JSON.stringify({ primary: "#2563eb", theme: "dark", layout: "top", collapsed: true, topbar: "#ffffff", sidebar: "javascript:1", language: "en" }),
    );

    expect(parsed).toMatchObject({ primary: "#2563eb", theme: "dark", layout: "top", collapsed: true, topbar: "#ffffff", sidebar: null, language: "en" });
  });

  it("rejects unknown enum values", () => {
    const parsed = parseAppearance(JSON.stringify({ theme: "neon", layout: "diagonal", language: "de", primary: "blue" }));

    expect(parsed).toEqual(DEFAULT_APPEARANCE);
  });
});

describe("cssVariables", () => {
  it("derives the primary shades and its readable text colour", () => {
    const vars = cssVariables({ ...DEFAULT_APPEARANCE, primary: "#2563eb" });

    expect(vars["--gold"]).toBe("#2563eb");
    expect(vars["--on-primary"]).toBe("#ffffff");
    expect(vars["--gold-bright"]).not.toBe(vars["--gold-deep"]);
  });

  it("uses a lighter accent text colour on the dark theme and a darker one on the light theme", () => {
    const light = cssVariables({ ...DEFAULT_APPEARANCE, primary: "#2563eb" }, "light")["--gold-bright"];
    const dark = cssVariables({ ...DEFAULT_APPEARANCE, primary: "#2563eb" }, "dark")["--gold-bright"];

    expect(parseInt(dark.slice(1, 3), 16)).toBeGreaterThan(parseInt(light.slice(1, 3), 16));
  });

  it("sets a background and its text colour only when one was chosen", () => {
    expect(Object.keys(cssVariables(DEFAULT_APPEARANCE)).some((name) => name.startsWith("--shell"))).toBe(false);

    const vars = cssVariables({ ...DEFAULT_APPEARANCE, topbar: "#0f1a33" });
    expect(vars["--shell-topbar-bg"]).toBe("#0f1a33");
    expect(vars["--shell-topbar-fg"]).toBe("#ffffff");
    expect(vars["--shell-sidebar-bg"]).toBeUndefined();
  });
});
