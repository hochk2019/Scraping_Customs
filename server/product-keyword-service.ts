import { eq } from "drizzle-orm";
import { referenceData } from "../drizzle/schema";
import { getDb } from "./db";

export interface ProductKeywordGroup {
  name: string;
  keywords: string[];
}

export const DEFAULT_PRODUCT_KEYWORD_GROUPS: ProductKeywordGroup[] = [
  {
    name: "Dệt may",
    keywords: [
      "áo",
      "áo khoác",
      "áo sơ mi",
      "áo vest",
      "áo thun",
      "đầm",
      "váy",
      "quần jeans",
      "quần tây",
      "quần short",
      "vải",
      "sợi",
    ],
  },
  {
    name: "Giày dép & phụ kiện",
    keywords: [
      "giày",
      "dép",
      "túi",
      "vali",
      "thắt lưng",
      "mũ",
      "găng tay",
    ],
  },
  {
    name: "Điện tử",
    keywords: [
      "điện thoại",
      "máy tính",
      "laptop",
      "máy ảnh",
      "tivi",
      "máy chiếu",
      "linh kiện điện tử",
    ],
  },
  {
    name: "Gia dụng",
    keywords: [
      "tủ lạnh",
      "máy giặt",
      "máy lạnh",
      "lò vi sóng",
      "nồi",
      "chảo",
      "dao",
      "muỗng",
      "ly",
      "cốc",
      "đĩa",
      "ấm",
    ],
  },
  {
    name: "Thực phẩm & đồ uống",
    keywords: [
      "nước",
      "rượu",
      "bia",
      "cà phê",
      "trà",
      "bánh",
      "kẹo",
      "sữa",
      "gạo",
      "ngô",
      "đậu",
      "trái cây",
    ],
  },
  {
    name: "Nguyên vật liệu",
    keywords: [
      "gỗ",
      "giấy",
      "bìa",
      "sơn",
      "keo",
      "chất dẻo",
      "nhựa",
      "kim loại",
      "sắt",
      "thép",
      "nhôm",
      "đồng",
      "kẽm",
      "chì",
      "xi măng",
      "gạch",
      "kính",
      "gốm",
      "sứ",
    ],
  },
  {
    name: "Hóa chất & dược phẩm",
    keywords: [
      "hóa chất",
      "chất tẩy",
      "xà phòng",
      "mỹ phẩm",
      "nước hoa",
      "kem",
      "dầu gội",
      "thuốc",
      "dược phẩm",
    ],
  },
];

let cachedKeywordGroups: ProductKeywordGroup[] | null = null;

export async function loadProductKeywordGroups(
  forceRefresh = false
): Promise<ProductKeywordGroup[]> {
  if (!forceRefresh && cachedKeywordGroups) {
    return cachedKeywordGroups;
  }

  const db = await getDb();
  if (!db) {
    cachedKeywordGroups = DEFAULT_PRODUCT_KEYWORD_GROUPS;
    return cachedKeywordGroups;
  }

  try {
    const rows = await db
      .select({ title: referenceData.title, content: referenceData.content })
      .from(referenceData)
      .where(eq(referenceData.dataType, "product_keyword_group"));

    if (!rows.length) {
      cachedKeywordGroups = DEFAULT_PRODUCT_KEYWORD_GROUPS;
      return cachedKeywordGroups;
    }

    const groups: ProductKeywordGroup[] = [];
    for (const row of rows) {
      const normalizedName = (row.title || "Nhóm không tên").trim();
      let keywords: string[] = [];

      if (row.content) {
        try {
          const parsed = JSON.parse(row.content);
          if (Array.isArray(parsed)) {
            keywords = parsed.map((item) => String(item));
          }
        } catch (error) {
          const fallback = row.content
            .split(/\r?\n|,/) // hỗ trợ danh sách theo dòng hoặc dấu phẩy
            .map((item) => item.trim())
            .filter(Boolean);
          keywords = fallback;
        }
      }

      if (keywords.length === 0) {
        continue;
      }

      groups.push({
        name: normalizedName,
        keywords,
      });
    }

    cachedKeywordGroups = groups.length
      ? groups
      : DEFAULT_PRODUCT_KEYWORD_GROUPS;

    return cachedKeywordGroups;
  } catch (error) {
    console.warn("[KeywordGroups] Lỗi tải cấu hình từ DB, dùng mặc định", error);
    cachedKeywordGroups = DEFAULT_PRODUCT_KEYWORD_GROUPS;
    return cachedKeywordGroups;
  }
}

export function normalizeKeyword(keyword: string): string {
  return keyword.normalize("NFC").toLowerCase().trim();
}

export function buildKeywordDictionary(groups: ProductKeywordGroup[]): string[] {
  const keywordSet = new Set<string>();
  for (const group of groups) {
    for (const keyword of group.keywords) {
      keywordSet.add(normalizeKeyword(keyword));
    }
  }
  return Array.from(keywordSet);
}

export function invalidateKeywordGroupCache(): void {
  cachedKeywordGroups = null;
}
