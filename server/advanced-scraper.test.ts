import { describe, expect, test, vi, afterEach } from "vitest";

const launchMock = vi.fn();

vi.mock("puppeteer", () => ({
  __esModule: true,
  default: { launch: launchMock },
}));

const CUSTOMS_BASE_URL = "https://www.customs.gov.vn";
const CUSTOMS_LIST_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

const mockListPages = [
  {
    url: `${CUSTOMS_LIST_URL}&page=1`,
    links: ["/detail/1", "/detail/2"],
    hasNext: true,
  },
  {
    url: `${CUSTOMS_LIST_URL}&page=2`,
    links: ["/detail/3"],
    hasNext: false,
  },
];

const detailData: Record<string, any> = {
  [`${CUSTOMS_BASE_URL}/detail/1`]: {
    documentNumber: "VB-001",
    title: "Thông báo số 1",
    documentType: "Thông báo",
    issuingAgency: "Tổng cục Hải quan",
    issueDate: "01/01/2024",
    signer: "Ông A",
    fileUrl: "",
    fileName: "",
  },
  [`${CUSTOMS_BASE_URL}/detail/2`]: {
    documentNumber: "VB-002",
    title: "Thông báo số 2",
    documentType: "Thông báo",
    issuingAgency: "Tổng cục Hải quan",
    issueDate: "02/01/2024",
    signer: "Ông B",
    fileUrl: "",
    fileName: "",
  },
  [`${CUSTOMS_BASE_URL}/detail/3`]: {
    documentNumber: "VB-003",
    title: "Thông báo số 3",
    documentType: "Thông báo",
    issuingAgency: "Tổng cục Hải quan",
    issueDate: "03/01/2024",
    signer: "Ông C",
    fileUrl: "",
    fileName: "",
  },
};

function createListPage() {
  let currentIndex = 0;
  let currentUrl = mockListPages[currentIndex].url;
  let nextRequested = false;
  const mockDateInputs = [{ type: vi.fn() }, { type: vi.fn() }];

  return {
    setViewport: vi.fn(async () => {}),
    goto: vi.fn(async (url: string) => {
      if (url.startsWith(CUSTOMS_LIST_URL)) {
        currentIndex = 0;
        currentUrl = mockListPages[currentIndex].url;
      } else {
        currentUrl = url;
      }
    }),
    evaluate: vi.fn(async (fn: () => unknown) => {
      const source = fn.toString();

      if (source.includes("links.push")) {
        return mockListPages[currentIndex].links;
      }

      if (source.includes("nextLink ? true : false")) {
        return mockListPages[currentIndex].hasNext;
      }

      if (source.includes("nextLink.click")) {
        if (mockListPages[currentIndex].hasNext) {
          nextRequested = true;
        }
        return undefined;
      }

      return undefined;
    }),
    waitForNavigation: vi.fn(async () => {
      if (nextRequested && currentIndex < mockListPages.length - 1) {
        currentIndex += 1;
        currentUrl = mockListPages[currentIndex].url;
      }
      nextRequested = false;
    }),
    waitForSelector: vi.fn(async () => {}),
    url: () => currentUrl,
    $$: vi.fn(async () => mockDateInputs),
  };
}

function createDetailPage() {
  let currentDetailUrl = "";

  return {
    goto: vi.fn(async (url: string) => {
      currentDetailUrl = url;
    }),
    evaluate: vi.fn(async (fn: () => unknown) => {
      const source = fn.toString();
      if (source.includes('document.querySelectorAll("table tr")')) {
        return detailData[currentDetailUrl] ?? {};
      }
      return {};
    }),
    close: vi.fn(async () => {}),
  };
}

function createBrowserStub() {
  const listPage = createListPage();
  let listPageCreated = false;

  return {
    newPage: vi.fn(async () => {
      if (!listPageCreated) {
        listPageCreated = true;
        return listPage;
      }
      return createDetailPage();
    }),
    close: vi.fn(async () => {}),
    __listPage: listPage,
  };
}

describe("scrapeByDateRange", () => {
  afterEach(() => {
    vi.clearAllMocks();
    launchMock.mockReset();
  });

  test("đọc đủ dữ liệu qua nhiều trang và log chuyển trang", async () => {
    const browserStub = createBrowserStub();
    launchMock.mockResolvedValue(browserStub as unknown as any);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { scrapeByDateRange } = await import("./advanced-scraper");

    const documents = await scrapeByDateRange({
      fromDate: "01/01/2024",
      toDate: "31/01/2024",
      maxPages: 5,
    });

    expect(documents).toHaveLength(3);
    expect(documents.map((doc) => doc.documentNumber)).toEqual([
      "VB-001",
      "VB-002",
      "VB-003",
    ]);

    const loggedNextPage = logSpy.mock.calls.some((call) =>
      call[0]?.includes("Đã chuyển tới trang 2")
    );
    expect(loggedNextPage).toBe(true);

    expect(browserStub.close).toHaveBeenCalled();

    const listPage = browserStub.__listPage as ReturnType<typeof createListPage>;
    expect(listPage.waitForSelector).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
