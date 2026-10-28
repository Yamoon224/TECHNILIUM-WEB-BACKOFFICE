import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDER_STATUS_META } from "./orderStatus";
import { PHRASES_EN } from "./phrases";

/** Brand names and example values that read the same in both languages. */
const SAME_IN_BOTH = new Set(["Samsung", "Galaxy A15"]);

// tr("...") with a plain string literal (escaped quotes allowed).
const TRANSLATED_LITERAL = /\btr\(("(?:[^"\\]|\\.)*")\)/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(entry) ? [path] : [];
  });
}

describe("page phrases", () => {
  it("has an English wording for every text wrapped in tr(...)", () => {
    const missing: string[] = [];

    for (const file of [...sources(join(__dirname, "../app")), ...sources(join(__dirname, "../components"))]) {
      for (const match of readFileSync(file, "utf8").matchAll(TRANSLATED_LITERAL)) {
        const french = JSON.parse(match[1]) as string;
        if (!SAME_IN_BOTH.has(french) && !(french in PHRASES_EN)) {
          missing.push(`${file.split(/[\\/]/).slice(-2).join("/")}: ${french}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("never leaves an English entry empty", () => {
    for (const [french, english] of Object.entries(PHRASES_EN)) {
      expect(english.trim(), french).not.toBe("");
    }
  });

  it("translates the French order status labels used by the pages", () => {
    for (const meta of Object.values(ORDER_STATUS_META)) {
      expect(PHRASES_EN[meta.label], meta.label).toBeTruthy();
    }

    expect(PHRASES_EN["Expédiée"]).toBe("Shipped");
  });
});
