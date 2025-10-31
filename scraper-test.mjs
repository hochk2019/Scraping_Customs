import axios from "axios";
import * as cheerio from "cheerio";

const CUSTOMS_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

async function scrape() {
  try {
    console.log("[Scraper] Bắt đầu scraping từ trang Hải quan");

    const response = await axios.get(CUSTOMS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const documents = [];

    $("table tbody tr").each((index, element) => {
      if (index >= 10) return;

      const cells = $(element).find("td");
      if (cells.length < 4) return;

      const documentNumber = $(cells[0]).text().trim();
      const issuingAgency = $(cells[1]).text().trim();
      const issueDate = $(cells[2]).text().trim();
      const title = $(cells[3]).text().trim();

      if (documentNumber) {
        documents.push({
          documentNumber,
          title,
          issuingAgency,
          issueDate,
        });
        console.log(
          `[${index + 1}] ${documentNumber} - ${title.substring(0, 60)}...`
        );
      }
    });

    console.log(`\nThu thập thành công ${documents.length} tài liệu\n`);
    console.log(JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error("Lỗi:", error.message);
  }
}

scrape();
