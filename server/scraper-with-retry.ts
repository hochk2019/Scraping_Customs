import puppeteer, { Browser, Page } from "puppeteer";
import axios from "axios";
import { retryWithBackoff } from "./retry-utils";

/**
 * Retry wrapper cho scrapeDetailPage
 */
export async function scrapeDetailPageWithRetry(
  page: Page,
  detailUrl: string
): Promise<any | null> {
  const result = await retryWithBackoff(
    async () => {
      console.log(`[Scraper] Scraping chi tiet: ${detailUrl}`);
      
      const newPage = page;
      await newPage.goto(detailUrl, { 
        waitUntil: "networkidle2", 
        timeout: 60000 
      });

      // Trich xuat thong tin
      const documentData = await newPage.evaluate(() => {
        const data: any = {};
        document.querySelectorAll("table tr").forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            const label = cells[0].textContent?.trim() || "";
            const value = cells[1].textContent?.trim() || "";
            if (label.includes("So hieu")) data.documentNumber = value;
            if (label.includes("Trich yeu")) data.title = value;
            if (label.includes("Loai")) data.documentType = value;
            if (label.includes("Co quan")) data.issuingAgency = value;
            if (label.includes("Ngay")) data.issueDate = value;
            if (label.includes("Nguoi")) data.signer = value;
          }
        });
        const pdfLink = document.querySelector("a[href*='.pdf']");
        if (pdfLink) {
          data.fileUrl = pdfLink.getAttribute("href") || "";
          data.fileName = pdfLink.textContent?.trim() || "";
        }
        return data;
      });

      return documentData;
    },
    { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
  );

  if (!result.success) {
    console.error(
      `[Scraper] Loi scraping chi tiet sau ${result.attempts} lan thu:`,
      result.error?.message
    );
    return null;
  }

  return result.data;
}

/**
 * Retry wrapper cho downloadPdf
 */
export async function downloadPdfWithRetry(url: string): Promise<Buffer | null> {
  const result = await retryWithBackoff(
    async () => {
      console.log(`[Scraper] Tai PDF tu: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      console.log(`[Scraper] Tai PDF thanh cong: ${url}`);
      return Buffer.from(response.data);
    },
    { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
  );

  if (!result.success) {
    console.error(
      `[Scraper] Loi tai PDF sau ${result.attempts} lan thu:`,
      result.error?.message
    );
    return null;
  }

  return result.data || null;
}
