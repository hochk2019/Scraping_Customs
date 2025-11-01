import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import axios from "axios";

/**
 * Advanced Web Scraper cho trang Hải quan Việt Nam
 * Sử dụng Puppeteer để xử lý JavaScript
 * Scrape theo khoảng thời gian, duyệt tất cả trang, trích xuất chi tiết
 */

const CUSTOMS_BASE_URL = "https://www.customs.gov.vn";
const CUSTOMS_LIST_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

export const RESULT_TABLE_TIMEOUT_MS = 60_000;
export const RESULT_ROWS_TIMEOUT_MS = 5_000;

async function waitForResultRows(page: Page): Promise<void> {
  await page.waitForSelector("table tbody", {
    timeout: RESULT_TABLE_TIMEOUT_MS,
  });

  try {
    await page.waitForSelector("table tbody tr", {
      timeout: RESULT_ROWS_TIMEOUT_MS,
    });
  } catch (error) {
    const isTimeoutError =
      error instanceof Error &&
      (error.name === "TimeoutError" || /timeout/i.test(error.message));

    if (!isTimeoutError) {
      throw error;
    }

    const hasRows = await page.evaluate(() => {
      return document.querySelectorAll("table tbody tr").length > 0;
    });

    if (hasRows) {
      throw error;
    }

    console.log(
      "[Scraper] Không tìm thấy dòng dữ liệu trong bảng kết quả, tiếp tục"
    );
  }
}

interface ScraperOptions {
  fromDate: string; // dd/mm/yyyy
  toDate: string; // dd/mm/yyyy
  maxPages?: number; // Số trang tối đa để scrape
  delay?: number; // Delay giữa các request (ms)
}

interface ScrapedDocument {
  documentNumber: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  issueDate: string;
  signer: string;
  fileUrl: string;
  fileName: string;
  detailUrl: string;
  extractedText?: string;
  hsCodes?: string[];
  productNames?: string[];
}

/**
 * Khởi tạo Puppeteer browser
 */
async function initBrowser(): Promise<Browser> {
  console.log("[Scraper] Khởi tạo Puppeteer browser");
  
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  
  if (!executablePath) {
    const possiblePaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
    ];
    
    for (const path of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(path)) {
          executablePath = path;
          console.log(`[Scraper] Tìm thấy Chrome tại: ${executablePath}`);
          break;
        }
      } catch (e) {
        // Tiếp tục tìm
      }
    }
  }
  
  try {
    return await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      executablePath: executablePath,
      protocolTimeout: 180000,
      timeout: 60000,
    });
  } catch (error) {
    console.error("[Scraper] Lỗi khởi tạo Puppeteer:", error);
    throw new Error(`Không thể khởi tạo Puppeteer browser. Chrome có thể chưa được cài đặt.`);
  }
}

/**
 * Scrape trang danh sách với khoảng thời gian
 */
export async function scrapeByDateRange(
  options: ScraperOptions
): Promise<ScrapedDocument[]> {
  let browser: Browser | null = null;

  try {
    browser = await initBrowser();
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Truy cập trang danh sách
    console.log("[Scraper] Truy cập trang danh sách");
    await page.goto(CUSTOMS_LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Điền khoảng thời gian
    console.log(
      `[Scraper] Điền khoảng thời gian: ${options.fromDate} - ${options.toDate}`
    );
    await fillDateRange(page, options.fromDate, options.toDate);

    // Click nút tìm kiếm
    console.log("[Scraper] Click nút tìm kiếm");
    await page.evaluate(() => {
      // Tìm button/element chứa icon fa-search và text 'Tìm kiếm'
      const searchElements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const searchButton = searchElements.find(el => {
        const hasIcon = el.querySelector('.fa-search') !== null;
        const hasText = el.textContent?.includes('Tìm kiếm');
        return hasIcon || hasText;
      });
      
      if (searchButton) {
        console.log('[Scraper] Tìm thấy nút tìm kiếm, click vào');
        (searchButton as HTMLElement).click();
      } else {
        console.log('[Scraper] Không tìm thấy nút tìm kiếm');
      }
    });
    
    // Chờ kết quả tìm kiếm
    await new Promise(resolve => setTimeout(resolve, 3000)); // Chờ 3 giây để trang cập nhật
    try {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    } catch (error) {
      console.log('[Scraper] Timeout chờ navigation, tiếp tục');
    }

    // Scrape tất cả trang
    const allDocuments: ScrapedDocument[] = [];
    let currentPage = 1;
    const maxPages = options.maxPages || 10;
    let listUrl = page.url();

    if (!browser) {
      throw new Error("Browser chưa được khởi tạo");
    }

    while (currentPage <= maxPages) {
      listUrl = page.url();
      console.log(`[Scraper] Scraping trang ${currentPage}: ${listUrl}`);

      await waitForResultRows(page);

      // Trích xuất các liên kết từ trang hiện tại
      const documentLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll("table tbody tr").forEach((row) => {
          const link = row.querySelector("td a");
          if (link) {
            links.push(link.getAttribute("href") || "");
          }
        });
        return links;
      });

      // Scrape chi tiết cho mỗi tài liệu
      for (const link of documentLinks) {
        if (!link) continue;

        try {
          const detailUrl = link.startsWith("http")
            ? link
            : `${CUSTOMS_BASE_URL}${link}`;
          const doc = await scrapeDetailPage(browser, detailUrl);
          if (doc) {
            allDocuments.push(doc);
          }
        } catch (error) {
          console.error(`[Scraper] Lỗi scraping chi tiết: ${link}`, error);
        }

        // Delay giữa các request
        if (options.delay) {
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }
      }

      await waitForResultRows(page);

      // Chuyển sang trang tiếp theo
      const nextPageHref = await page.evaluate(() => {
        const anchorCandidates = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("a")
        );

        const nextAnchor = anchorCandidates.find((link) => {
          const text = link.textContent?.trim();
          if (!text) return false;
          return text === ">>" || text.toLowerCase().includes("sau");
        });

        return nextAnchor?.getAttribute("href") ?? null;
      });

      if (!nextPageHref) {
        console.log("[Scraper] Không tìm thấy trang tiếp theo, dừng lại");
        break;
      }

      const nextPageUrl = new URL(nextPageHref, listUrl || CUSTOMS_BASE_URL).toString();
      console.log(`[Scraper] Chuyển sang trang tiếp theo: ${nextPageUrl}`);

      await page.goto(nextPageUrl, { waitUntil: "networkidle2", timeout: 60000 });
      await waitForResultRows(page);

      currentPage++;
      listUrl = page.url();
      console.log(`[Scraper] Đã chuyển tới trang ${currentPage}: ${listUrl}`);
    }

    console.log(
      `[Scraper] Thu thập thành công ${allDocuments.length} tài liệu`
    );
    return allDocuments;
  } catch (error) {
    console.error("[Scraper] Lỗi scraping:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Điền khoảng thời gian trên form
 */
async function fillDateRange(
  page: Page,
  fromDate: string,
  toDate: string
): Promise<void> {
  const isoFrom = convertToIsoDate(fromDate);
  const isoTo = convertToIsoDate(toDate);

  const slashFrom = normalizeSlashDate(fromDate);
  const slashTo = normalizeSlashDate(toDate);

  const filledCount = await page.evaluate(
    ({ isoFrom, isoTo, slashFrom, slashTo }) => {
      const setValue = (input: HTMLInputElement, value: string) => {
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };

      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>("input")
      );

      const pickers = inputs.filter((input) =>
        /date|text/i.test(input.type || "")
      );

      let filled = 0;

      for (const input of pickers) {
        if (filled >= 2) break;

        const labelText =
          input.getAttribute("placeholder")?.toLowerCase() || "";
        const name = input.getAttribute("name")?.toLowerCase() || "";
        const id = (input.id || "").toLowerCase();
        const targetValue =
          filled === 0
            ? input.type === "date"
              ? isoFrom
              : slashFrom
            : input.type === "date"
              ? isoTo
              : slashTo;

        if (
          input.type === "date" ||
          /từ|from|start|tu_ngay/.test(labelText + name + id) ||
          filled === 1 ||
          /đến|to|end|den_ngay/.test(labelText + name + id)
        ) {
          setValue(input, targetValue);
          filled += 1;
        }
      }

      return filled;
    },
    { isoFrom, isoTo, slashFrom, slashTo }
  );

  if (filledCount >= 2) {
    return;
  }

  // Fallback: type trực tiếp nếu script trên không tìm thấy đủ input
  const dateInputs = await page.$$("input[type='date']");
  if (dateInputs.length >= 2) {
    await page.evaluate(
      ({ isoFrom, isoTo }) => {
        const inputs = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[type='date']")
        );
        if (inputs[0]) {
          inputs[0].value = isoFrom;
          inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
          inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (inputs[1]) {
          inputs[1].value = isoTo;
          inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
          inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      { isoFrom, isoTo }
    );
    return;
  }

  const textInputs = await page.$$("input[type='text']");
  if (textInputs.length >= 2) {
    await page.evaluate(
      ({ slashFrom, slashTo }) => {
        const inputs = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[type='text']")
        );
        if (inputs[0]) {
          inputs[0].value = slashFrom;
          inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
          inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (inputs[1]) {
          inputs[1].value = slashTo;
          inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
          inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      { slashFrom, slashTo }
    );
  }
}

function convertToIsoDate(date: string): string {
  const [day, month, year] = date.split("/");
  if (!day || !month || !year) {
    return date;
  }
  const paddedDay = day.padStart(2, "0");
  const paddedMonth = month.padStart(2, "0");
  return `${year}-${paddedMonth}-${paddedDay}`;
}

function normalizeSlashDate(date: string): string {
  const [day, month, year] = date.split("/");
  if (!day || !month || !year) {
    return date;
  }
  const paddedDay = day.padStart(2, "0");
  const paddedMonth = month.padStart(2, "0");
  return `${paddedDay}/${paddedMonth}/${year}`;
}

/**
 * Scrape trang chi tiết
 */
async function scrapeDetailPage(
  browser: Browser,
  detailUrl: string
): Promise<ScrapedDocument | null> {
  const newPage = await browser.newPage();
  try {
    console.log(`[Scraper] Scraping chi tiết: ${detailUrl}`);

    await newPage.goto(detailUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // Trích xuất thông tin
    const documentData = await newPage.evaluate(() => {
      const data: any = {};

      // Trích xuất các trường thông tin
      document.querySelectorAll("table tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 2) {
          const label = cells[0].textContent?.trim() || "";
          const value = cells[1].textContent?.trim() || "";

          if (label.includes("Số hiệu")) data.documentNumber = value;
          if (label.includes("Trích yêu")) data.title = value;
          if (label.includes("Loại")) data.documentType = value;
          if (label.includes("Cơ quan")) data.issuingAgency = value;
          if (label.includes("Ngày")) data.issueDate = value;
          if (label.includes("Người")) data.signer = value;
        }
      });

      // Trích xuất liên kết PDF
      const pdfLink = document.querySelector("a[href*='.pdf']");
      if (pdfLink) {
        data.fileUrl = pdfLink.getAttribute("href") || "";
        data.fileName = pdfLink.textContent?.trim() || "";
      }

      return data;
    });

    // Tải PDF và xử lý OCR
    let extractedText = "";
    let hsCodes: string[] = [];
    let productNames: string[] = [];

    const resolvedFileUrl = documentData.fileUrl
      ? new URL(documentData.fileUrl, CUSTOMS_BASE_URL).toString()
      : "";

    if (resolvedFileUrl) {
      try {
        // Tải PDF
        const pdfBuffer = await downloadPdf(resolvedFileUrl);

        // Xử lý OCR (sẽ được xử lý bởi ocr-processor.ts)
        // extractedText = await extractTextFromPdf(pdfBuffer);
        // hsCodes = extractHsCodesFromText(extractedText);
        // productNames = extractProductNamesFromText(extractedText);
      } catch (error) {
        console.error(`[Scraper] Lỗi tải PDF: ${resolvedFileUrl}`, error);
      }
    }

    return {
      documentNumber: documentData.documentNumber || "",
      title: documentData.title || "",
      documentType: documentData.documentType || "Thông báo",
      issuingAgency: documentData.issuingAgency || "Cục Hải quan",
      issueDate: documentData.issueDate || "",
      signer: documentData.signer || "",
      fileUrl: resolvedFileUrl,
      fileName: documentData.fileName || "",
      detailUrl,
      extractedText,
      hsCodes,
      productNames,
    };
  } catch (error) {
    console.error(`[Scraper] Lỗi scraping chi tiết: ${detailUrl}`, error);
    return null;
  } finally {
    await newPage.close();
  }
}

/**
 * Tải PDF từ URL
 */
async function downloadPdf(url: string): Promise<Buffer> {
  try {
    console.log(`[Scraper] Tải PDF từ: ${url}`);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 seconds
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
