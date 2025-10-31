import puppeteer, { Browser } from "puppeteer";

/**
 * Debug script để kiểm tra HTML structure của trang Hải quan
 */

const CUSTOMS_BASE_URL = "https://www.customs.gov.vn";
const CUSTOMS_LIST_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

async function debugScrapePage() {
  let browser: Browser | null = null;

  try {
    console.log("[Debug] Khởi tạo Puppeteer browser");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      protocolTimeout: 180000,
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log("[Debug] Truy cập trang danh sách");
    await page.goto(CUSTOMS_LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Debug: In ra HTML của trang
    const pageContent = await page.content();
    console.log("[Debug] ===== PAGE CONTENT =====");
    console.log(pageContent.substring(0, 5000)); // In 5000 ký tự đầu tiên

    // Debug: Tìm bảng
    const tableInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      const divTables = document.querySelectorAll("[class*='table']");
      
      return {
        tableCount: tables.length,
        divTableCount: divTables.length,
        firstTableHTML: tables[0]?.outerHTML?.substring(0, 500) || "No table found",
        allSelectors: {
          "table": document.querySelectorAll("table").length,
          "table tbody tr": document.querySelectorAll("table tbody tr").length,
          "table tr": document.querySelectorAll("table tr").length,
          "[class*='table'] tr": document.querySelectorAll("[class*='table'] tr").length,
          "div[class*='row']": document.querySelectorAll("div[class*='row']").length,
          "tr": document.querySelectorAll("tr").length,
          "a[href*='detail']": document.querySelectorAll("a[href*='detail']").length,
          "a[href*='view']": document.querySelectorAll("a[href*='view']").length,
        }
      };
    });

    console.log("[Debug] ===== TABLE INFO =====");
    console.log(JSON.stringify(tableInfo, null, 2));

    // Debug: Tìm tất cả links
    const linksInfo = await page.evaluate(() => {
      const links: any[] = [];
      document.querySelectorAll("a").forEach((link, index) => {
        if (index < 20) { // In 20 links đầu tiên
          links.push({
            text: link.textContent?.substring(0, 50),
            href: link.href?.substring(0, 100),
            className: link.className,
          });
        }
      });
      return links;
    });

    console.log("[Debug] ===== FIRST 20 LINKS =====");
    console.log(JSON.stringify(linksInfo, null, 2));

    // Debug: Tìm form input ngày
    const formInfo = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input");
      const selects = document.querySelectorAll("select");
      const buttons = document.querySelectorAll("button");

      return {
        inputCount: inputs.length,
        selectCount: selects.length,
        buttonCount: buttons.length,
        inputs: Array.from(inputs).map((inp, i) => ({
          index: i,
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          className: inp.className,
        })).slice(0, 10),
        buttons: Array.from(buttons).map((btn, i) => ({
          index: i,
          text: btn.textContent?.substring(0, 50),
          className: btn.className,
          id: btn.id,
        })).slice(0, 10),
      };
    });

    console.log("[Debug] ===== FORM INFO =====");
    console.log(JSON.stringify(formInfo, null, 2));

    // Debug: Tìm rows trong bảng
    const rowsInfo = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tbody tr");
      const rowsData: any[] = [];

      rows.forEach((row, index) => {
        if (index < 5) { // In 5 rows đầu tiên
          const cells = row.querySelectorAll("td");
          const cellsText: string[] = [];
          cells.forEach((cell) => {
            cellsText.push(cell.textContent?.substring(0, 50) || "");
          });
          rowsData.push({
            index,
            cellCount: cells.length,
            cells: cellsText,
            html: row.outerHTML.substring(0, 200),
          });
        }
      });

      return {
        totalRows: rows.length,
        firstFiveRows: rowsData,
      };
    });

    console.log("[Debug] ===== ROWS INFO =====");
    console.log(JSON.stringify(rowsInfo, null, 2));

    await browser.close();
    console.log("[Debug] ===== DEBUG COMPLETE =====");
  } catch (error) {
    console.error("[Debug] Lỗi:", error);
  }
}

// Run debug
debugScrapePage();
