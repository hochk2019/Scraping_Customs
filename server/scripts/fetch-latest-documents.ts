import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scrapeCustomsDocuments } from "../customs-scraper";

interface OfflineDocumentRecord {
  id: number;
  documentNumber: string;
  customsDocId: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  issueDate: string;
  signer: string;
  fileUrl: string;
  fileName: string;
  summary: string;
  detailUrl: string;
  status: "pending" | "downloaded" | "failed";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  downloadedAt: string;
  notes: string | null;
  tags: string | null;
  processedStatus: "new" | "processed";
  isOffline: true;
}

function resolveCustomsDocId(detailUrl: string | undefined): string {
  if (detailUrl) {
    try {
      const parsed = new URL(detailUrl);
      const id = parsed.searchParams.get("id");
      if (id) {
        return id;
      }
    } catch (error) {
      console.warn("[fetch-latest] Không thể parse detailUrl", detailUrl, error);
    }
  }
  return Date.now().toString();
}

function buildOfflineDocument(
  doc: Awaited<ReturnType<typeof scrapeCustomsDocuments>>[number],
  index: number,
  timestamp: string,
): OfflineDocumentRecord {
  const summary = doc.title?.trim() || "Không có trích yếu";
  return {
    id: -(index + 1),
    documentNumber: doc.documentNumber,
    customsDocId: resolveCustomsDocId(doc.detailUrl),
    title: summary,
    documentType: doc.documentType || "Thông báo",
    issuingAgency: doc.issuingAgency || "Cục Hải quan",
    issueDate: doc.issueDate || new Date().toLocaleDateString("vi-VN"),
    signer: doc.signer || doc.issuingAgency || "Cục Hải quan",
    fileUrl: doc.fileUrl,
    fileName: doc.fileName || `${doc.documentNumber.replace(/\s+/g, "_")}.pdf`,
    summary,
    detailUrl: doc.detailUrl || "",
    status: "downloaded",
    errorMessage: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    downloadedAt: timestamp,
    notes: null,
    tags: null,
    processedStatus: "processed",
    isOffline: true,
  };
}

function formatTsModule(records: OfflineDocumentRecord[]): string {
  const jsonLiteral = JSON.stringify(records, null, 2);
  return `import type { DocumentListItem } from "@/components/DocumentDetailDrawer";

type OfflineDocument = (DocumentListItem & { isOffline: true });

export const offlineDocuments = ${jsonLiteral} as OfflineDocument[];
`;
}

async function main() {
  console.log("[fetch-latest] Đang thu thập dữ liệu từ Hải quan...");
  const documents = await scrapeCustomsDocuments({ maxDocuments: 10, maxPages: 5 });
  if (documents.length === 0) {
    throw new Error("Không thu được tài liệu nào từ trang Hải quan");
  }

  const timestamp = new Date().toISOString();
  const records = documents.map((doc, index) => buildOfflineDocument(doc, index, timestamp));

  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(dirname, "../..");

  const jsonPath = path.join(projectRoot, "sample-data.json");
  await writeFile(jsonPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  console.log(`[fetch-latest] Đã cập nhật ${jsonPath}`);

  const offlineModulePath = path.join(projectRoot, "client", "src", "data", "offline-documents.ts");
  await writeFile(offlineModulePath, formatTsModule(records), "utf8");
  console.log(`[fetch-latest] Đã cập nhật ${offlineModulePath}`);
}

main().catch((error) => {
  console.error("[fetch-latest] Lỗi:", error);
  process.exitCode = 1;
});
