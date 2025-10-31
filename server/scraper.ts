import puppeteer, { Browser, Page } from "puppeteer";
import { upsertDocument, createScrapeLog, updateScrapeLog } from "./db";
import { InsertDocument, InsertScrapeLog } from "../drizzle/schema";

/**
 * Scraper cho website Hải quan Việt Nam
 * Thu thập dữ liệu từ: https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313
 */

const CUSTOMS_BASE_URL = "https://www.customs.gov.vn";
const SEARCH_URL = `${CUSTOMS_BASE_URL}/index.jsp?pageId=8&cid=1294&LinhVuc=313`;
const DETAIL_URL_TEMPLATE = `${CUSTOMS_BASE_URL}/index.jsp?pageId=3&id={ID}&cid=1294`;

interface ScrapedDocument {
  documentNumber: string;
  customsDocId: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  issueDate: string;
  signer: string;
  fileUrl: string;
  fileName: string;
  summary: string;
  detailUrl: string;
}

/**
 * Khởi tạo browser instance
 */
async function initBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

/**
 * Trích xuất danh sách các kết quả từ trang tìm kiếm
 */
async function extractSearchResults(page: Page): Promise<string[]> {
  const documentIds: string[] = [];

  try {
    // Chờ bảng kết quả tải
    await page.waitForSelector("table tbody tr", { timeout: 10000 });

    // Lấy tất cả các hàng trong bảng
    const rows = await page.$$("table tbody tr");

    for (const row of rows) {
      try {
        // Lấy liên kết đầu tiên trong hàng (số hiệu)
        const link = await row.$("a");
        if (link) {
          const href = await link.evaluate((el: any) => el.getAttribute("href"));
          if (href) {
            // Trích xuất ID từ href
            // Ví dụ: href="/index.jsp?pageId=3&id=101580&cid=1294"
            const match = href.match(/id=(\d+)/);
            if (match && match[1]) {
              documentIds.push(match[1]);
            }
          }
        }
      } catch (error) {
        console.error("[Scraper] Error extracting document ID from row:", error);
      }
    }
  } catch (error) {
    console.error("[Scraper] Error extracting search results:", error);
  }

  return documentIds;
}

/**
 * Trích xuất thông tin chi tiết từ trang chi tiết tài liệu
 */
async function extractDocumentDetails(
  page: Page,
  documentId: string
): Promise<ScrapedDocument | null> {
  try {
    // Chờ bảng chi tiết tải
    await page.waitForSelector("table", { timeout: 10000 });

    // Trích xuất dữ liệu từ bảng chi tiết
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tr");
      const result: Record<string, string> = {};

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 2) {
          const label = cells[0].textContent?.trim() || "";
          const value = cells[1].textContent?.trim() || "";
          result[label] = value;
        }
      });

      // Lấy liên kết tải tệp
      const fileLink = document.querySelector(
        'a[href*="files.customs.gov.vn"]'
      );
      const fileUrl = fileLink?.getAttribute("href") || "";
      const fileName = fileLink?.textContent?.trim() || "";

      return {
        documentNumber: result["Số hiệu"] || "",
        title: result["Trích yêu nội dung"] || "",
        documentType: result["Loại văn bản"] || "",
        issuingAgency: result["Cơ quan ban hành"] || "",
        issueDate: result["Ngày ban hành"] || "",
        signer: result["Người ký"] || "",
        fileUrl,
        fileName,
        summary: result["Trích yêu nội dung"] || "",
        detailUrl: window.location.href,
      };
    });

    if (!data.documentNumber) {
      console.error("[Scraper] No document number found");
      return null;
    }

    return {
      ...data,
      customsDocId: documentId,
    };
  } catch (error) {
    console.error("[Scraper] Error extracting document details:", error);
    return null;
  }
}

/**
 * Kiểm tra xem ngày có nằm trong khoảng thời gian
 */
function isDateInRange(dateStr: string, startDate?: Date, endDate?: Date): boolean {
  if (!dateStr) return false;
  
  try {
    // Parse ngày từ chuỗi (format: dd/mm/yyyy)
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const docDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    
    if (startDate && docDate < startDate) return false;
    if (endDate && docDate > endDate) return false;
    
    return true;
  } catch (error) {
    console.error('[Scraper] Error parsing date:', dateStr, error);
    return false;
  }
}

/**
 * Thu thập dữ liệu từ một trang tìm kiếm
 */
async function scrapePage(
  browser: Browser,
  pageNumber: number = 1,
  startDate?: Date,
  endDate?: Date
): Promise<ScrapedDocument[]> {
  let page: Page | null = null;
  const documents: ScrapedDocument[] = [];

  try {
    page = await browser.newPage();

    // Truy cập trang tìm kiếm
    const searchUrl = `${SEARCH_URL}&page=${pageNumber}`;
    console.log(`[Scraper] Accessing: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Trích xuất danh sách ID
    const documentIds = await extractSearchResults(page);
    console.log(`[Scraper] Found ${documentIds.length} documents on page ${pageNumber}`);

    // Thu thập chi tiết cho mỗi tài liệu
    for (const docId of documentIds) {
      try {
        const detailUrl = DETAIL_URL_TEMPLATE.replace("{ID}", docId);
        console.log(`[Scraper] Scraping document: ${docId}`);

        await page.goto(detailUrl, { waitUntil: "networkidle2", timeout: 30000 });

        const docData = await extractDocumentDetails(page, docId);
        if (docData) {
          if (isDateInRange(docData.issueDate, startDate, endDate)) {
            documents.push(docData);
          } else {
            console.log(`[Scraper] Document ${docId} is outside date range`);
          }
        }

        // Delay để tránh bị chặn
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Scraper] Error scraping document ${docId}:`, error);
      }
    }
  } catch (error) {
    console.error("[Scraper] Error scraping page:", error);
  } finally {
    if (page) {
      await page.close();
    }
  }

  return documents;
}

/**
 * Thu thập dữ liệu từ nhiều trang
 */
export async function scrapeCustomsData(
  maxPages: number = 1,
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean; logId: number | null; count: number }> {
  let browser: Browser | null = null;
  let logId: number | null = null;
  let totalDocuments = 0;
  let successCount = 0;

  try {
    // Tạo log thu thập
    const logResult = await createScrapeLog({
      userId,
      scrapeType: "manual",
      startTime: new Date(),
      status: "running",
    });

    if (!logResult || !logResult.id) {
      throw new Error("Failed to create scrape log");
    }

    logId = logResult.id;

    // Khởi tạo browser
    browser = await initBrowser();
    console.log("[Scraper] Browser initialized");

    // Thu thập từ nhiều trang
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`[Scraper] Scraping page ${pageNum}/${maxPages}`);
        const documents = await scrapePage(browser, pageNum, startDate, endDate);

        // Lưu vào database
        for (const doc of documents) {
          try {
            const insertDoc: InsertDocument = {
              documentNumber: doc.documentNumber,
              customsDocId: doc.customsDocId,
              title: doc.title,
              documentType: doc.documentType,
              issuingAgency: doc.issuingAgency,
              issueDate: doc.issueDate,
              signer: doc.signer,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              summary: doc.summary,
              detailUrl: doc.detailUrl,
              status: "pending",
            };

            await upsertDocument(insertDoc);
            successCount++;
          } catch (error) {
            console.error(
              `[Scraper] Error saving document ${doc.documentNumber}:`,
              error
            );
          }
        }

        totalDocuments += documents.length;

        // Delay giữa các trang
        if (pageNum < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`[Scraper] Error scraping page ${pageNum}:`, error);
      }
    }

    // Cập nhật log
    if (logId) {
      await updateScrapeLog(logId, {
        endTime: new Date(),
        status: "completed",
        documentsFound: totalDocuments,
        documentsDownloaded: successCount,
      });
    }

    console.log(
      `[Scraper] Scraping completed. Found: ${totalDocuments}, Saved: ${successCount}`
    );

    return {
      success: true,
      logId,
      count: successCount,
    };
  } catch (error) {
    console.error("[Scraper] Fatal error during scraping:", error);

    // Cập nhật log với lỗi
    if (logId) {
      await updateScrapeLog(logId, {
        endTime: new Date(),
        status: "failed",
        errorMessage: String(error),
      });
    }

    return {
      success: false,
      logId,
      count: 0,
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log("[Scraper] Browser closed");
    }
  }
}

/**
 * Tải tệp PDF từ URL
 */
export async function downloadPdfFile(
  fileUrl: string,
  documentId: number
): Promise<boolean> {
  let browser: Browser | null = null;

  try {
    browser = await initBrowser();
    const page = await browser.newPage();

    // Tải tệp
    await page.goto(fileUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Cập nhật trạng thái
    await upsertDocument({
      id: documentId,
      status: "downloaded",
      downloadedAt: new Date(),
    } as any);

    return true;
  } catch (error) {
    console.error(`[Scraper] Error downloading PDF from ${fileUrl}:`, error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
