import { describe, expect, it } from "vitest";
import { deliveryNoteFilename, receiptFilename, withLanguage } from "./download";

describe("withLanguage", () => {
  it("adds the language to a path with or without a query", () => {
    expect(withLanguage("/admin/payments/3/receipt", "en")).toBe("/admin/payments/3/receipt?lang=en");
    expect(withLanguage("/x?a=1", "fr")).toBe("/x?a=1&lang=fr");
  });
});

describe("file names", () => {
  it("match the server's numbering", () => {
    expect(deliveryNoteFilename(12)).toBe("BL-000012.pdf");
    expect(receiptFilename(7)).toBe("REC-000007.pdf");
  });
});
