import axios from "axios";
import { load as cheerioLoad } from "cheerio";
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

/**
 * Thu thập 10 tài liệu từ trang Hải quan
 */
export async function scrapeCustomsDocuments(): Promise<ScrapedDocument[]> {
  try {
    console.log("[Scraper] Bắt đầu scraping từ trang Hải quan");

    const response = await axios.get(CUSTOMS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const $ = cheerioLoad(response.data);

    const documents: ScrapedDocument[] = [];

    // Trích xuất từ bảng kết quả - tìm tất cả hàng trong bảng
    $("table tbody tr").each((index, element) => {
      if (index >= 10) return; // Chỉ lấy 10 tài liệu

      try {
        const cells = $(element).find("td");
        if (cells.length < 4) return; // Bỏ qua nếu không đủ cột

        // Trích xuất thông tin từ các cột
        const documentNumberCell = $(cells[0]);
        const issuingAgencyCell = $(cells[1]);
        const issueDateCell = $(cells[2]);
        const titleCell = $(cells[3]);

        const documentNumber = documentNumberCell.text().trim();
        const issuingAgency = issuingAgencyCell.text().trim();
        const issueDate = issueDateCell.text().trim();
        const title = titleCell.text().trim();

        // Lấy link chi tiết từ cột đầu tiên hoặc cột tiêu đề
        let detailLink =
          documentNumberCell.find("a").attr("href") ||
          titleCell.find("a").attr("href") ||
          "";
        const detailUrl = detailLink.startsWith("http")
          ? detailLink
          : detailLink
            ? `${BASE_URL}${detailLink}`
            : `${BASE_URL}/index.jsp?pageId=8&cid=1294&LinhVuc=313`;

        // Tạo file URL (giả định PDF)
        const fileUrl = `${detailUrl}?format=pdf`;

        if (documentNumber) {
          documents.push({
            documentNumber,
            title: title || "Thông báo xác định trước mã số",
            documentType: "Thông báo",
            issuingAgency: issuingAgency || "Cục Hải quan",
            issueDate: issueDate || new Date().toLocaleDateString("vi-VN"),
            signer: issuingAgency || "Cục Hải quan",
            fileUrl,
            fileName: `${documentNumber}.pdf`,
            detailUrl,
          });

          console.log(`[Scraper] Thu thập: ${documentNumber} - ${title}`);
        }
      } catch (error) {
        console.error(`[Scraper] Lỗi xử lý hàng ${index}:`, error);
      }
    });

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
    });

    console.log(`[Scraper] Tải PDF thành công: ${url}`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`[Scraper] Lỗi tải PDF: ${url}`, error);
    throw error;
  }
}
