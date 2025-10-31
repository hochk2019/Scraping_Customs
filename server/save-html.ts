import puppeteer, { Browser } from "puppeteer";
import fs from "fs";

const CUSTOMS_LIST_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

async function saveHTML() {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      protocolTimeout: 180000,
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log("[Save HTML] Truy cập trang danh sách");
    await page.goto(CUSTOMS_LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    const html = await page.content();
    fs.writeFileSync("/tmp/customs-page.html", html);
    console.log("[Save HTML] Đã lưu HTML vào /tmp/customs-page.html");

    // Tìm nút tìm kiếm trong HTML
    if (html.includes("Tìm kiếm")) {
      const index = html.indexOf("Tìm kiếm");
      console.log("[Save HTML] Tìm thấy 'Tìm kiếm' tại vị trí:", index);
      const context = html.substring(Math.max(0, index - 300), index + 300);
      console.log("[Save HTML] Context:", context);
    }

    await browser.close();
  } catch (error) {
    console.error("[Save HTML] Lỗi:", error);
  }
}

saveHTML();
