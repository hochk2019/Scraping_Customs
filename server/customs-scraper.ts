import { load as cheerioLoad } from "cheerio";
import {
  DetailFieldKey,
  normalizeDetailLabel,
} from "./customs-label-map";
import { getWithNetwork } from "./network-client";

const CUSTOMS_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";
const BASE_URL = "https://www.customs.gov.vn";
const SNAPSHOT_PREFIX = "https://r.jina.ai/";

interface ScrapedDocument {
  documentNumber: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  issueDate: string;
  signer: string;
  fileUrl: string;
  fileName: string;
  detailUrl?: string;
}

interface ScrapeOptions {
  maxPages?: number;
  maxDocuments?: number;
}

interface ListingEntry {
  documentNumber: string;
  issuingAgency: string;
  issueDate: string;
  title: string;
  detailUrl: string;
}

interface DetailData {
  documentNumber: string;
  documentType: string;
  issuingAgency: string;
  issueDate: string;
  signer: string;
  title: string;
  fileUrl: string;
  fileName: string;
}

export async function scrapeCustomsDocuments(
  options: ScrapeOptions = {}
): Promise<ScrapedDocument[]> {
  try {
    console.log("[Scraper] Bắt đầu scraping từ trang Hải quan");

    const documents: ScrapedDocument[] = [];
    const seenDocumentNumbers = new Set<string>();
    const maxPages = Number.isFinite(options.maxPages)
      ? Math.max(1, Number(options.maxPages))
      : Number.POSITIVE_INFINITY;
    const maxDocuments = Number.isFinite(options.maxDocuments)
      ? Math.max(1, Number(options.maxDocuments))
      : undefined;

    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
      const pageUrl = buildPageUrl(pageIndex);
      console.log(`[Scraper] Đang tải trang danh sách: ${pageUrl}`);

      const entries = await fetchListingEntries(pageUrl);
      if (entries.length === 0) {
        console.log(
          `[Scraper] Không tìm thấy dữ liệu ở trang ${pageIndex}, dừng lại.`
        );
        break;
      }

      for (const entry of entries) {
        if (seenDocumentNumbers.has(entry.documentNumber)) {
          continue;
        }

        console.log(
          `[Scraper] Đang tải trang chi tiết: ${entry.documentNumber} -> ${entry.detailUrl}`
        );

        const detailData = await fetchDetailData(entry.detailUrl);
        const documentNumber =
          (detailData.documentNumber || entry.documentNumber).trim();

        if (!documentNumber || seenDocumentNumbers.has(documentNumber)) {
          continue;
        }

        seenDocumentNumbers.add(documentNumber);

        const fileUrl = detailData.fileUrl.trim();
        if (!fileUrl) {
          console.warn(
            `[Scraper] Bỏ qua ${documentNumber} do không tìm thấy liên kết tệp.`
          );
          continue;
        }

        const issuingAgency =
          detailData.issuingAgency || entry.issuingAgency || "Cục Hải quan";
        const issueDate =
          detailData.issueDate || entry.issueDate ||
          new Date().toLocaleDateString("vi-VN");
        const title =
          detailData.title || entry.title || "Thông báo xác định trước mã số";
        const signer = detailData.signer || issuingAgency;
        const documentType = detailData.documentType || "Thông báo";
        const fileName =
          detailData.fileName || deriveFileName(fileUrl, documentNumber);

        documents.push({
          documentNumber,
          title,
          documentType,
          issuingAgency,
          issueDate,
          signer,
          fileUrl,
          fileName,
          detailUrl: entry.detailUrl,
        });

        console.log(`[Scraper] Thu thập: ${documentNumber} - ${title}`);

        if (maxDocuments && documents.length >= maxDocuments) {
          break;
        }
      }

      if (maxDocuments && documents.length >= maxDocuments) {
        break;
      }
    }

    console.log(`[Scraper] Thu thập thành công ${documents.length} tài liệu`);
    return documents;
  } catch (error) {
    console.error("[Scraper] Lỗi scraping:", error);
    throw error;
  }
}

function buildPageUrl(pageIndex: number): string {
  if (pageIndex <= 1) {
    return CUSTOMS_URL;
  }

  const url = new URL(CUSTOMS_URL);
  url.searchParams.set("page", String(pageIndex));
  return url.toString();
}

async function fetchListingEntries(pageUrl: string): Promise<ListingEntry[]> {
  const response = await getWithNetwork(pageUrl);
  const html = String(response.data ?? "");
  const htmlEntries = parseListingFromHtml(html);
  if (htmlEntries.length > 0) {
    return htmlEntries;
  }

  const snapshotUrl = `${SNAPSHOT_PREFIX}${pageUrl}`;
  console.log(
    `[Scraper] Trang ${pageUrl} không có bảng HTML, thử chế độ snapshot: ${snapshotUrl}`
  );
  const snapshotResponse = await getWithNetwork(snapshotUrl, {
    headers: { Accept: "text/plain" },
  });
  return parseListingFromMarkdown(String(snapshotResponse.data ?? ""));
}

function parseListingFromHtml(html: string): ListingEntry[] {
  const $ = cheerioLoad(html);
  const rows = $("table tbody tr").toArray();
  const results: ListingEntry[] = [];

  for (const element of rows) {
    const cells = $(element).find("td");
    if (cells.length < 4) continue;

    const documentNumberCell = $(cells[0]);
    const issuingAgencyCell = $(cells[1]);
    const issueDateCell = $(cells[2]);
    const titleCell = $(cells[3]);

    const fallbackDocumentNumber = documentNumberCell.text().trim();
    const fallbackIssuingAgency = issuingAgencyCell.text().trim();
    const fallbackIssueDate = issueDateCell.text().trim();
    const fallbackTitle = titleCell.text().trim();

    const rawDetailLink =
      documentNumberCell.find("a").attr("href") ||
      titleCell.find("a").attr("href") ||
      "";

    if (!rawDetailLink) {
      continue;
    }

    const detailUrl = ensureAbsoluteUrl(rawDetailLink);

    results.push({
      documentNumber: fallbackDocumentNumber,
      issuingAgency: fallbackIssuingAgency,
      issueDate: fallbackIssueDate,
      title: fallbackTitle,
      detailUrl,
    });
  }

  return results;
}

function parseListingFromMarkdown(markdown: string): ListingEntry[] {
  const lines = markdown.split(/\r?\n/);
  const results: ListingEntry[] = [];

  for (const line of lines) {
    if (!line.trim().startsWith("| [")) continue;

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    if (cells.length < 4) continue;

    const documentCell = extractMarkdownCell(cells[0]);
    const agencyCell = extractMarkdownCell(cells[1]);
    const dateCell = extractMarkdownCell(cells[2]);
    const titleCell = extractMarkdownCell(cells[3]);

    if (!documentCell.text) continue;

    const detailUrl = buildDetailUrlFromSnapshot(documentCell.href);

    results.push({
      documentNumber: documentCell.text,
      issuingAgency: agencyCell.text,
      issueDate: dateCell.text,
      title: titleCell.text,
      detailUrl,
    });
  }

  return results;
}

async function fetchDetailData(detailUrl: string): Promise<DetailData> {
  const response = await getWithNetwork(detailUrl);
  const html = String(response.data ?? "");
  const htmlData = parseDetailFromHtml(html);
  if (htmlData) {
    return htmlData;
  }

  const snapshotUrl = `${SNAPSHOT_PREFIX}${detailUrl}`;
  console.log(
    `[Scraper] Trang chi tiết không có bảng HTML, thử chế độ snapshot: ${snapshotUrl}`
  );
  const snapshotResponse = await getWithNetwork(snapshotUrl, {
    headers: { Accept: "text/plain" },
  });
  const markdownData = parseDetailFromMarkdown(
    String(snapshotResponse.data ?? "")
  );

  if (markdownData) {
    return markdownData;
  }

  return {
    documentNumber: "",
    documentType: "",
    issuingAgency: "",
    issueDate: "",
    signer: "",
    title: "",
    fileUrl: "",
    fileName: "",
  };
}

function parseDetailFromHtml(html: string): DetailData | null {
  const $ = cheerioLoad(html);
  const rows = $("table tr").toArray();
  if (rows.length === 0) {
    return null;
  }

  const detailData: Partial<Record<DetailFieldKey, string>> = {};
  let fileUrl = "";
  let fileName = "";

  for (const row of rows) {
    const cells = $(row).find("td");
    if (cells.length < 2) continue;

    const rawLabel = $(cells[0]).text().trim();
    const label = rawLabel.replace(/[:：]\s*$/, "");
    const valueCell = $(cells[1]);
    const value = valueCell.text().trim();

    const normalizedLabel = normalizeDetailLabel(label);
    if (normalizedLabel) {
      detailData[normalizedLabel] = value;
    }

    if (label.startsWith("Tải tệp nội dung toàn văn")) {
      const linkElement = valueCell.find("a[href]").first();
      const href = linkElement.attr("href");
      if (href) {
        fileUrl = ensureAbsoluteUrl(href);
      }
      fileName = linkElement.text().trim() || fileName;
    }
  }

  const documentNumber = detailData.documentNumber?.trim() ?? "";
  const documentType = detailData.documentType?.trim() ?? "";
  const issuingAgency = detailData.issuingAgency?.trim() ?? "";
  const issueDate = detailData.issueDate?.trim() ?? "";
  const signer = detailData.signer?.trim() ?? "";
  const title = detailData.title?.trim() ?? "";

  return {
    documentNumber,
    documentType,
    issuingAgency,
    issueDate,
    signer,
    title,
    fileUrl: fileUrl.trim(),
    fileName: fileName.trim(),
  };
}

function parseDetailFromMarkdown(markdown: string): DetailData | null {
  const documentNumber = matchMarkdownField(markdown, "Số hiệu");
  const documentType = matchMarkdownField(markdown, "Loại văn bản");
  const issuingAgency = matchMarkdownField(markdown, "Cơ quan ban hành");
  const issueDate = matchMarkdownField(markdown, "Ngày ban hành");
  const signer = matchMarkdownField(markdown, "Người ký");
  const summary = matchMarkdownField(markdown, "Trích yếu nội dung");
  const headingMatch = markdown.match(/^####\s+(.+)$/m);
  const title = summary || (headingMatch ? headingMatch[1].trim() : "");

  const fileMatch = markdown.match(
    /Tải tệp nội dung toàn văn\[(.+?)\]\((https?:\/\/[^\)]+)\)/
  );

  const fileName = fileMatch ? fileMatch[1].trim() : "";
  const fileUrl = fileMatch ? fileMatch[2].trim() : "";

  if (
    !documentNumber &&
    !documentType &&
    !issuingAgency &&
    !issueDate &&
    !fileUrl
  ) {
    return null;
  }

  return {
    documentNumber,
    documentType,
    issuingAgency,
    issueDate,
    signer,
    title,
    fileUrl,
    fileName,
  };
}

function extractMarkdownCell(cell: string): { text: string; href: string } {
  const linkMatch = cell.match(/\[([^\]]+)\]\(([^\)]+)\)/);
  if (linkMatch) {
    return {
      text: linkMatch[1].trim(),
      href: linkMatch[2].trim(),
    };
  }

  return {
    text: cell.trim(),
    href: "",
  };
}

function buildDetailUrlFromSnapshot(rawHref: string): string {
  if (!rawHref) {
    return `${BASE_URL}/index.jsp?pageId=3&cid=1294`;
  }

  try {
    const url = new URL(rawHref, BASE_URL);
    const id = url.searchParams.get("id");
    url.searchParams.set("pageId", "3");
    url.searchParams.set("cid", "1294");
    if (id) {
      url.searchParams.set("id", id);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return ensureAbsoluteUrl(rawHref);
  }
}

function matchMarkdownField(markdown: string, label: string): string {
  const regex = new RegExp(`${label}\\s+([^\\n]+)`, "i");
  const match = markdown.match(regex);
  return match ? match[1].trim() : "";
}

function ensureAbsoluteUrl(href: string): string {
  try {
    return new URL(href, BASE_URL).toString();
  } catch {
    return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
  }
}

function deriveFileName(fileUrl: string, fallback: string): string {
  if (fallback.trim()) {
    return fallback.trim();
  }

  if (!fileUrl) {
    return `${Date.now()}.pdf`;
  }

  const lastSegment = decodeURIComponent(fileUrl.split("/").pop() ?? "");
  return lastSegment || `${fallback || "document"}.pdf`;
}

export async function downloadPdf(url: string): Promise<Buffer> {
  try {
    console.log(`[Scraper] Tải PDF từ: ${url}`);

    const response = await getWithNetwork(url, {
      responseType: "arraybuffer",
    });

    console.log(`[Scraper] Tải PDF thành công: ${url}`);
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error(`[Scraper] Lỗi tải PDF: ${url}`, error);
    throw error;
  }
}
