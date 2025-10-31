import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import {
  DetailFieldKey,
  normalizeDetailLabel,
} from "./customs-label-map";
// Database operations sẽ được xử lý thông qua API endpoint

/**
 * Web Scraper cho trang Hải quan Việt Nam
 * Mục đích: Thu thập công văn, thông báo từ trang chủ Hải quan
 */

const CUSTOMS_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";
const BASE_URL = "https://www.customs.gov.vn";

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
}

/**
 * Thu thập 10 tài liệu từ trang Hải quan
 */
export async function scrapeCustomsDocuments(
  options: ScrapeOptions = {}
): Promise<ScrapedDocument[]> {
  try {
    console.log("[Scraper] Bắt đầu scraping từ trang Hải quan");

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    const documents: ScrapedDocument[] = [];
    const pageQueue: string[] = [CUSTOMS_URL];
    const visitedPages = new Set<string>();
    const maxPages = Number.isFinite(options.maxPages)
      ? Math.max(0, Number(options.maxPages))
      : undefined;

    while (pageQueue.length > 0) {
      if (maxPages !== undefined && visitedPages.size >= maxPages) {
        console.log(
          `[Scraper] Đã đạt giới hạn số trang cho phép (${maxPages})`
        );
        break;
      }

      const pageUrl = pageQueue.shift();
      if (!pageUrl || visitedPages.has(pageUrl)) {
        continue;
      }

      visitedPages.add(pageUrl);

      console.log(`[Scraper] Đang tải trang danh sách: ${pageUrl}`);
      const response = await axios.get(pageUrl, { headers, proxy: false });
      const $ = cheerioLoad(response.data);

      const rows = $("table tbody tr").toArray();

      for (const element of rows) {
        try {
          const cells = $(element).find("td");
          if (cells.length < 4) continue; // Bỏ qua nếu không đủ cột

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

          let detailUrl: string;
          try {
            detailUrl = new URL(rawDetailLink, BASE_URL).toString();
          } catch {
            detailUrl = `${BASE_URL}${rawDetailLink}`;
          }

          console.log(
            `[Scraper] Đang tải trang chi tiết: ${fallbackDocumentNumber} -> ${detailUrl}`
          );

          const detailResponse = await axios.get(detailUrl, {
            headers,
            proxy: false,
          });
          const detail$ = cheerioLoad(detailResponse.data);

          const detailRows = detail$("table tr").toArray();
          const detailData: Partial<Record<DetailFieldKey, string>> = {};
          let fileUrl = "";
          let fileName = "";

          for (const row of detailRows) {
            const detailCells = detail$(row).find("td");
            if (detailCells.length < 2) continue;

            const rawLabel = detail$(detailCells[0]).text().trim();
            const label = rawLabel.replace(/[:：]\s*$/, "");
            const valueCell = detail$(detailCells[1]);
            const value = valueCell.text().trim();

            const normalizedLabel = normalizeDetailLabel(label);

            if (normalizedLabel) {
              detailData[normalizedLabel] = value;
            }

            if (label.startsWith("Tải tệp nội dung toàn văn")) {
              const linkElement = valueCell.find("a[href]").first();
              const href = linkElement.attr("href");
              if (href) {
                try {
                  fileUrl = new URL(href, BASE_URL).toString();
                } catch {
                  fileUrl = `${BASE_URL}${href}`;
                }
              }
              fileName = linkElement.text().trim() || fileName;
            }
          }

          const documentNumber = (
            detailData.documentNumber || fallbackDocumentNumber
          ).trim();
          if (!documentNumber) {
            continue;
          }

          const documentType = (
            detailData.documentType || "Thông báo"
          ).trim();
          const issuingAgency = (
            detailData.issuingAgency ||
            fallbackIssuingAgency ||
            "Cục Hải quan"
          ).trim();
          const issueDate = (
            detailData.issueDate ||
            fallbackIssueDate ||
            new Date().toLocaleDateString("vi-VN")
          ).trim();
          const signer = (
            detailData.signer ||
            fallbackIssuingAgency ||
            "Cục Hải quan"
          ).trim();
          const title = (
            detailData.title ||
            fallbackTitle ||
            "Thông báo xác định trước mã số"
          ).trim();

          const normalizedFileName = fileName.trim()
            ? fileName.trim()
            : fileUrl
            ? decodeURIComponent(fileUrl.split("/").pop() || "")
            : `${documentNumber}.pdf`;

          documents.push({
            documentNumber,
            title,
            documentType,
            issuingAgency,
            issueDate,
            signer,
            fileUrl,
            fileName: normalizedFileName,
            detailUrl,
          });

          console.log(`[Scraper] Thu thập: ${documentNumber} - ${title}`);
        } catch (error) {
          console.error("[Scraper] Lỗi xử lý tài liệu:", error);
        }
      }

      // Thu thập các liên kết phân trang để xử lý tiếp
      const paginationLinks = new Set<string>();
      $("a[href*='pageId=8'][href*='page=']").each((_, element) => {
        const href = $(element).attr("href");
        if (!href || href.startsWith("javascript")) return;

        try {
          const pageLink = new URL(href, BASE_URL).toString();
          paginationLinks.add(pageLink);
        } catch (error) {
          console.warn("[Scraper] Không thể phân tích liên kết phân trang:", error);
        }
      });

      for (const link of paginationLinks) {
        if (!visitedPages.has(link) && !pageQueue.includes(link)) {
          pageQueue.push(link);
        }
      }
    }

    console.log(`[Scraper] Thu thập thành công ${documents.length} tài liệu`);
    return documents;
  } catch (error) {
    console.error("[Scraper] Lỗi scraping:", error);
    throw error;
  }
}

/**
 * Tải PDF từ URL
 */
export async function downloadPdf(url: string): Promise<Buffer> {
  try {
    console.log(`[Scraper] Tải PDF từ: ${url}`);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      proxy: false,
    });

    console.log(`[Scraper] Tải PDF thành công: ${url}`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`[Scraper] Lỗi tải PDF: ${url}`, error);
    throw error;
  }
}
