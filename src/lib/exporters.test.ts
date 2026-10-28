import { describe, expect, it } from "vitest";
import { exportFileName } from "./exporters";

describe("exportFileName", () => {
  it("is the table name, the date and the format's extension", () => {
    const day = new Date("2026-10-28T10:00:00Z");

    expect(exportFileName("commandes", "csv", day)).toBe("commandes-2026-10-28.csv");
    expect(exportFileName("Factures et avoirs", "xlsx", day)).toBe("factures-et-avoirs-2026-10-28.xlsx");
    expect(exportFileName("Écritures", "sql", day)).toBe("ecritures-2026-10-28.sql");
    expect(exportFileName("???", "pdf", day)).toBe("export-2026-10-28.pdf");
  });
});
