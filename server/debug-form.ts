import puppeteer, { Browser } from "puppeteer";

/**
 * Debug script để kiểm tra form input ngày tháng
 */

const CUSTOMS_LIST_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

async function debugForm() {
  let browser: Browser | null = null;

  try {
    console.log("[Debug Form] Khởi tạo Puppeteer browser");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      protocolTimeout: 180000,
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log("[Debug Form] Truy cập trang danh sách");
    await page.goto(CUSTOMS_LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Debug: Tìm tất cả input
    const inputsInfo = await page.evaluate(() => {
      const inputs: any[] = [];
      document.querySelectorAll("input").forEach((inp, index) => {
        inputs.push({
          index,
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          className: inp.className,
          value: inp.value,
          parent: inp.parentElement?.className,
          parentTag: inp.parentElement?.tagName,
          html: inp.outerHTML.substring(0, 200),
        });
      });
      return inputs;
    });

    console.log("[Debug Form] ===== ALL INPUTS =====");
    console.log(JSON.stringify(inputsInfo, null, 2));

    // Debug: Tìm form
    const formInfo = await page.evaluate(() => {
      const forms = document.querySelectorAll("form");
      const formsData: any[] = [];

      forms.forEach((form, index) => {
        formsData.push({
          index,
          id: form.id,
          name: form.name,
          method: form.method,
          action: form.action,
          className: form.className,
          inputCount: form.querySelectorAll("input").length,
          buttonCount: form.querySelectorAll("button").length,
          selectCount: form.querySelectorAll("select").length,
        });
      });

      return formsData;
    });

    console.log("[Debug Form] ===== FORMS =====");
    console.log(JSON.stringify(formInfo, null, 2));

    // Debug: Tìm button tìm kiếm
    const buttonInfo = await page.evaluate(() => {
      const buttons: any[] = [];
      document.querySelectorAll("button").forEach((btn, index) => {
        if (index < 20) {
          buttons.push({
            index,
            text: btn.textContent?.substring(0, 50),
            type: btn.type,
            className: btn.className,
            id: btn.id,
            onclick: btn.onclick?.toString().substring(0, 100),
            html: btn.outerHTML.substring(0, 200),
          });
        }
      });
      return buttons;
    });

    console.log("[Debug Form] ===== BUTTONS =====");
    console.log(JSON.stringify(buttonInfo, null, 2));

    // Debug: Tìm select
    const selectInfo = await page.evaluate(() => {
      const selects: any[] = [];
      document.querySelectorAll("select").forEach((sel, index) => {
        selects.push({
          index,
          name: sel.name,
          id: sel.id,
          className: sel.className,
          optionCount: sel.querySelectorAll("option").length,
          options: Array.from(sel.querySelectorAll("option"))
            .map((opt) => ({
              value: opt.value,
              text: opt.textContent?.substring(0, 50),
            }))
            .slice(0, 5),
        });
      });
      return selects;
    });

    console.log("[Debug Form] ===== SELECTS =====");
    console.log(JSON.stringify(selectInfo, null, 2));

    // Debug: Tìm label
    const labelInfo = await page.evaluate(() => {
      const labels: any[] = [];
      document.querySelectorAll("label").forEach((label, index) => {
        if (index < 20) {
          labels.push({
            index,
            text: label.textContent?.substring(0, 50),
            className: label.className,
            htmlFor: label.htmlFor,
            html: label.outerHTML.substring(0, 200),
          });
        }
      });
      return labels;
    });

    console.log("[Debug Form] ===== LABELS =====");
    console.log(JSON.stringify(labelInfo, null, 2));

    await browser.close();
    console.log("[Debug Form] ===== DEBUG COMPLETE =====");
  } catch (error) {
    console.error("[Debug Form] Lỗi:", error);
  }
}

// Run debug
debugForm();
