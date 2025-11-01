const CUSTOMS_BASE = "https://www.customs.gov.vn";

function sanitizeFallbackId(fallback?: string): string {
  if (!fallback) {
    return String(Date.now());
  }
  const normalized = fallback.normalize("NFC").replace(/[^0-9a-zA-Z]+/g, "-");
  return normalized.slice(0, 50) || String(Date.now());
}

export function deriveCustomsDocId(detailUrl?: string | null, fallback?: string) {
  if (detailUrl) {
    try {
      const url = new URL(detailUrl, CUSTOMS_BASE);
      const idParam = url.searchParams.get("id");
      if (idParam) {
        return idParam.trim();
      }
      const pathMatch = url.pathname.match(/(\d{4,})/g);
      if (pathMatch && pathMatch.length > 0) {
        return pathMatch[pathMatch.length - 1];
      }
    } catch (error) {
      console.warn("[DocumentUtils] Không thể phân tích detailUrl", detailUrl, error);
    }
  }

  return sanitizeFallbackId(fallback);
}
