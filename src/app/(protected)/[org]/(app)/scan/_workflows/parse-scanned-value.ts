const LOT_URL_PATTERN =
  /\/l\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * If the scanned value is a QR-encoded lot URL (e.g. `https://app.example.com/l/{uuid}`),
 * extract and return the lot UUID. Returns null for non-URL or non-matching strings.
 */
export function parseLotIdFromQrUrl(raw: string): string | null {
  const match = LOT_URL_PATTERN.exec(raw.trim());
  return match?.[1] ?? null;
}
