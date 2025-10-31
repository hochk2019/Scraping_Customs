import axios from "axios";
import { afterEach, describe, expect, test, vi } from "vitest";
import { scrapeCustomsDocuments } from "./customs-scraper";

const LISTING_HTML = `
<table>
  <tbody>
    <tr>
      <td><a href="/index.jsp?pageId=3&id=101&cid=1294">101/QĐ-HQ</a></td>
      <td>Tổng cục Hải quan</td>
      <td>01/01/2024</td>
      <td><a href="/index.jsp?pageId=3&id=101&cid=1294">Thông báo thử nghiệm</a></td>
    </tr>
  </tbody>
</table>
`;

const DETAIL_HTML = `
<table>
  <tr><td>Số hiệu</td><td>101/QĐ-HQ</td></tr>
  <tr><td>Loại văn bản</td><td>Quyết định</td></tr>
  <tr><td>Cơ quan ban hành</td><td>Tổng cục Hải quan</td></tr>
  <tr><td>Ngày ban hành</td><td>01/01/2024</td></tr>
  <tr><td>Người ký</td><td>Nguyễn Văn A</td></tr>
  <tr><td>Trích yếu nội dung</td><td>Nội dung chi tiết</td></tr>
  <tr><td>Tải tệp nội dung toàn văn</td><td><a href="https://files.customs.gov.vn/docs/101QD.pdf">Tải về PDF</a></td></tr>
</table>
`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("scrapeCustomsDocuments", () => {
  test("map dữ liệu chi tiết và fileUrl chính xác", async () => {
    const mockGet = vi.spyOn(axios, "get");

    mockGet.mockResolvedValueOnce({ data: LISTING_HTML } as any);
    mockGet.mockResolvedValueOnce({ data: DETAIL_HTML } as any);

    const documents = await scrapeCustomsDocuments({ maxPages: 1 });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenNthCalledWith(1, expect.any(String), {
      headers: expect.any(Object),
      proxy: false,
    });

    const [document] = documents;
    expect(document).toBeDefined();
    expect(document.documentNumber).toBe("101/QĐ-HQ");
    expect(document.documentType).toBe("Quyết định");
    expect(document.issuingAgency).toBe("Tổng cục Hải quan");
    expect(document.issueDate).toBe("01/01/2024");
    expect(document.signer).toBe("Nguyễn Văn A");
    expect(document.title).toBe("Nội dung chi tiết");
    expect(document.fileUrl).toBe(
      "https://files.customs.gov.vn/docs/101QD.pdf"
    );
    expect(document.fileName).toBe("Tải về PDF");
    expect(document.detailUrl).toBe(
      "https://www.customs.gov.vn/index.jsp?pageId=3&id=101&cid=1294"
    );
  });
});
