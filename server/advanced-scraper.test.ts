import { describe, expect, test, vi, afterEach } from "vitest";

const launchMock = vi.fn();

vi.mock("puppeteer", () => ({
  __esModule: true,
  default: { launch: launchMock },
}));

const CUSTOMS_BASE_URL = "https://www.customs.gov.vn";
const CUSTOMS_LIST_URL =
  "https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313";

const defaultListPages = [
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

let mockListPages = defaultListPages.map((page) => ({
  ...page,
  links: [...page.links],
}));

function resetMockListPages() {
  mockListPages = defaultListPages.map((page) => ({
    ...page,
    links: [...page.links],
  }));
}

function setMockListPages(pages: typeof mockListPages) {
  mockListPages = pages;
}

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
  const mockDateInputs = [{ type: vi.fn() }, { type: vi.fn() }];

  return {
    setViewport: vi.fn(async () => {}),
    goto: vi.fn(async (url: string) => {
      const matchedIndex = mockListPages.findIndex(
        (page) => page.url === url
      );
      if (matchedIndex !== -1) {
        currentIndex = matchedIndex;
        currentUrl = mockListPages[currentIndex].url;
        return;
      }

      if (url.startsWith(CUSTOMS_LIST_URL)) {
        currentIndex = 0;
        currentUrl = mockListPages[currentIndex].url;
        return;
      }

      currentUrl = url;
    }),
    evaluate: vi.fn(async (fn: () => unknown) => {
      const source = fn.toString();

      if (source.includes("links.push")) {
        return mockListPages[currentIndex].links;
      }

      if (source.includes("nextLink ? true : false")) {
        return mockListPages[currentIndex].hasNext;
      }

      if (source.includes("nextAnchor?.getAttribute")) {
        const nextIndex = Math.min(
          currentIndex + 1,
          mockListPages.length - 1
        );
        if (!mockListPages[currentIndex].hasNext) {
          return null;
        }
        return mockListPages[nextIndex].url;
      }

      if (source.includes('querySelectorAll("table tbody tr").length > 0')) {
        return (mockListPages[currentIndex]?.links.length ?? 0) > 0;
      }

      return undefined;
    }),
    waitForNavigation: vi.fn(async () => {}),
    waitForSelector: vi.fn(async (selector: string, options?: any) => {
      if (selector === "table tbody") {
        return;
      }

      if (selector === "table tbody tr") {
        const hasRows =
          (mockListPages[currentIndex]?.links.length ?? 0) > 0;

        if (!hasRows) {
          const error = new Error("Timeout");
          (error as Error & { name: string }).name = "TimeoutError";
          throw error;
        }
      }
    }),
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
    resetMockListPages();
  });

  test("đọc đủ dữ liệu qua nhiều trang và log chuyển trang", async () => {
    const browserStub = createBrowserStub();
    launchMock.mockResolvedValue(browserStub as unknown as any);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const {
      scrapeByDateRange,
      RESULT_TABLE_TIMEOUT_MS,
      RESULT_ROWS_TIMEOUT_MS,
    } = await import("./advanced-scraper");

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

  test("kết thúc an toàn khi không có dữ liệu", async () => {
    setMockListPages([
      {
        url: `${CUSTOMS_LIST_URL}&page=1`,
        links: [],
        hasNext: false,
      },
    ]);

    const browserStub = createBrowserStub();
    launchMock.mockResolvedValue(browserStub as unknown as any);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const {
      scrapeByDateRange,
      RESULT_TABLE_TIMEOUT_MS,
      RESULT_ROWS_TIMEOUT_MS,
    } = await import("./advanced-scraper");

    const documents = await scrapeByDateRange({
      fromDate: "01/02/2024",
      toDate: "29/02/2024",
    });

    expect(documents).toHaveLength(0);
    expect(browserStub.close).toHaveBeenCalled();

    const listPage = browserStub.__listPage as ReturnType<typeof createListPage>;

    expect(listPage.waitForSelector).toHaveBeenCalledWith(
      "table tbody",
      expect.objectContaining({ timeout: RESULT_TABLE_TIMEOUT_MS })
    );

    expect(listPage.waitForSelector).toHaveBeenCalledWith(
      "table tbody tr",
      expect.objectContaining({ timeout: RESULT_ROWS_TIMEOUT_MS })
    );

    const hasEmptyLog = logSpy.mock.calls.some((call) =>
      call[0]?.includes("Không tìm thấy dòng dữ liệu")
    );

    expect(hasEmptyLog).toBe(true);

    logSpy.mockRestore();
  });
});
