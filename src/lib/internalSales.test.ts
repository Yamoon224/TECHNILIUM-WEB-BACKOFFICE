import { describe, expect, it } from "vitest";
import { addToCart, cartTotal, changeDue, saleReceiptPath, sellableOffers, setQuantity, type SellableOffer } from "./internalSales";

const phone: SellableOffer = { offerId: 1, label: "Samsung Galaxy A15", unitPrice: 59_000, currency: "XOF", stock: 2 };
const cable: SellableOffer = { offerId: 2, label: "Câble USB-C", unitPrice: 2_500, currency: "XOF", stock: 10 };

describe("cart", () => {
  it("adds a line, then raises its quantity", () => {
    const cart = addToCart(addToCart([], phone), phone);

    expect(cart).toEqual([{ offer: phone, quantity: 2 }]);
  });

  it("never sells more than the shelf holds", () => {
    const cart = addToCart(addToCart(addToCart([], phone), phone), phone);

    expect(cart[0].quantity).toBe(2);
    expect(setQuantity(cart, 1, 50)[0].quantity).toBe(2);
  });

  it("removes a line set to zero, or to something that is not a number", () => {
    const cart = addToCart(addToCart([], phone), cable);

    expect(setQuantity(cart, 1, 0).map((line) => line.offer.offerId)).toEqual([2]);
    expect(setQuantity(cart, 2, Number.NaN).map((line) => line.offer.offerId)).toEqual([1]);
  });

  it("totals the lines", () => {
    expect(cartTotal(setQuantity(addToCart(addToCart([], phone), cable), 2, 4))).toBe(59_000 + 4 * 2_500);
    expect(cartTotal([])).toBe(0);
  });
});

describe("changeDue", () => {
  it("gives the change, zero for the exact amount, and null when short", () => {
    expect(changeDue(100_000, 150_000)).toBe(50_000);
    expect(changeDue(100_000, 100_000)).toBe(0);
    expect(changeDue(100_000, 90_000)).toBeNull();
  });
});

describe("sellableOffers", () => {
  const product = (offers: { id: number; seller: "technilium" | "vendor"; stock_quantity: number; in_stock: boolean }[]) => ({
    brand: "Samsung",
    name: "Galaxy A15",
    variants: [{ sku: "A15-128", offers: offers.map((offer) => ({ ...offer, price: { amount: 59_000, currency: "XOF" } })) }],
  });

  it("keeps own in-stock offers only", () => {
    const offers = sellableOffers([
      product([
        { id: 1, seller: "technilium", stock_quantity: 3, in_stock: true },
        { id: 2, seller: "vendor", stock_quantity: 9, in_stock: true },
        { id: 3, seller: "technilium", stock_quantity: 0, in_stock: false },
      ]),
    ]);

    expect(offers).toEqual([{ offerId: 1, label: "Samsung Galaxy A15 (A15-128)", unitPrice: 59_000, currency: "XOF", stock: 3 }]);
  });

  it("copes with a product that has no variants", () => {
    expect(sellableOffers([{ brand: "X", name: "Y" }])).toEqual([]);
  });
});

describe("saleReceiptPath", () => {
  it("encodes the order number", () => {
    expect(saleReceiptPath("TCH-20261028-AB12CD")).toBe("/admin/internal-sales/TCH-20261028-AB12CD/receipt");
    expect(saleReceiptPath("a/b")).toBe("/admin/internal-sales/a%2Fb/receipt");
  });
});
