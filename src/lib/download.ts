/**
 * Downloads a PDF that needs the bearer token: fetched as a blob and saved
 * through a temporary link (a plain link could not carry the Authorization header).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class DownloadError extends Error {}

/** Adds `?lang=` (fr | en) to a path, leaving any existing query alone. */
export function withLanguage(path: string, language: "fr" | "en"): string {
  return `${path}${path.includes("?") ? "&" : "?"}lang=${language}`;
}

export async function savePdf(token: string, path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new DownloadError(body?.message ?? `Erreur inattendue (${response.status}).`);
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** "BL-000012.pdf", matching the server's Content-Disposition. */
export function deliveryNoteFilename(shipmentId: number): string {
  return `BL-${String(shipmentId).padStart(6, "0")}.pdf`;
}

/** "REC-000012.pdf", matching the server's Content-Disposition. */
export function receiptFilename(paymentId: number): string {
  return `REC-${String(paymentId).padStart(6, "0")}.pdf`;
}
