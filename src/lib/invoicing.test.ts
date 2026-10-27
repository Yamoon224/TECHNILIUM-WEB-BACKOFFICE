import { describe, expect, it } from "vitest";
import { isCreditable, remainingCreditable, type Invoice } from "./invoicing";

function doc(overrides: Partial<Invoice>): Invoice {
  return {
    id: 1,
    number: "FAC-2026-000001",
    type: "invoice",
    order_number: "TCH-1",
    credited_invoice_id: null,
    customer_name: "Awa",
    currency: "XOF",
    vat_rate_percent: 18,
    net_amount: 100,
    vat_amount: 18,
    total_amount: 118,
    reason: null,
    issued_at: "2026-10-27T10:00:00Z",
    lines: null,
    ...overrides,
  };
}

describe("isCreditable", () => {
  it("allows crediting a live invoice", () => {
    const invoice = doc({});
    expect(isCreditable(invoice, [invoice])).toBe(true);
  });

  it("refuses an invoice that already has a credit note", () => {
    const invoice = doc({});
    const credit = doc({ id: 2, type: "credit_note", credited_invoice_id: 1 });
    expect(isCreditable(invoice, [credit, invoice])).toBe(false);
  });

  it("stays creditable after a partial credit note, for the remainder only", () => {
    const invoice = doc({ total_amount: 118 });
    const partial = doc({ id: 2, type: "credit_note", credited_invoice_id: 1, total_amount: 50 });
    expect(isCreditable(invoice, [partial, invoice])).toBe(true);
    expect(remainingCreditable(invoice, [partial, invoice])).toBe(68);
  });

  it("refuses to credit a credit note", () => {
    const credit = doc({ id: 2, type: "credit_note", credited_invoice_id: 1 });
    expect(isCreditable(credit, [credit])).toBe(false);
  });
});
