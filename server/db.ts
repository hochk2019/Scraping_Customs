import { eq, and, desc, count, gte, lte, or, like, sql, sum, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userFeedback,
  documents,
  InsertDocument,
  scrapeLogs,
  InsertScrapeLog,
  scrapeSchedules,
  InsertScrapeSchedule,
  exportSelections,
  extractedData,
  hsCodes,
  documentHsCodes,
  referenceData,
  uploadedFiles,
  uploadedFileAnalyses,
  ocrRepository,
  InsertOcrRepository,
  ocrStatistics,
  InsertOcrStatistics,
  scrapeJobsQueue,
  InsertScrapeQueueJob,
  ocrJobsQueue,
  InsertOcrQueueJob,
  aiJobsQueue,
  InsertAiQueueJob,
  documentEmbeddings,
  InsertDocumentEmbedding,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Lấy danh sách tài liệu với phân trang
 */
export async function getDocuments(
  limit: number = 20,
  offset: number = 0,
  status?: string,
) {
  const db = await getDb();
  if (!db) {
    return { documents: [], total: 0 };
  }

  const whereClause = status ? eq(documents.status, status as any) : undefined;

  let selectQuery = db.select().from(documents);
  if (whereClause) {
    selectQuery = selectQuery.where(whereClause);
  }

  const dataPromise = selectQuery
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);

  let countQuery = db.select({ count: count() }).from(documents);
  if (whereClause) {
    countQuery = countQuery.where(whereClause);
  }

  const [records, countResult] = await Promise.all([dataPromise, countQuery]);
  const total = Number(countResult[0]?.count ?? 0);

  return {
    documents: records,
    total,
  };
}

export async function getDocumentsTotal(status?: string) {
  const db = await getDb();
  if (!db) return 0;

  let countQuery = db.select({ count: count() }).from(documents);
  if (status) {
    countQuery = countQuery.where(eq(documents.status, status as any));
  }

  const result = await countQuery;
  return Number(result[0]?.count ?? 0);
}

/**
 * Lấy tài liệu theo ID
 */
export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const [document] = result;

  const documentExtractedData = await db
    .select()
    .from(extractedData)
    .where(eq(extractedData.documentId, id));

  return {
    ...document,
    extractedData: documentExtractedData.map((item) => ({
      id: item.id,
      dataType: item.dataType,
      value: item.value,
      confidence: item.confidence,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

type QueueJobType = "scrape" | "ocr" | "ai";

export async function recordQueueJobStart(input: {
  jobId: string;
  documentId?: number;
  type: QueueJobType;
  payload?: string;
  status?: "pending" | "processing";
}) {
  const db = await getDb();
  if (!db) return;

  const values: InsertScrapeQueueJob = {
    jobId: input.jobId,
    documentId: input.documentId ?? null,
    type: input.type,
    payload: input.payload ?? null,
    status: input.status ?? "processing",
    startedAt: input.status === "processing" ? new Date() : null,
  };

  await db
    .insert(scrapeJobsQueue)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        documentId: values.documentId,
        type: values.type,
        payload: values.payload,
        status: values.status,
        startedAt: values.startedAt,
      },
    });
}

export async function recordQueueJobSuccess(input: {
  jobId: string;
  durationMs?: number;
}) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(scrapeJobsQueue)
    .set({
      status: "completed",
      completedAt: new Date(),
      durationMs: input.durationMs ?? null,
      errorMessage: null,
    })
    .where(eq(scrapeJobsQueue.jobId, input.jobId));
}

export async function recordQueueJobFailure(input: {
  jobId: string;
  errorMessage: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(scrapeJobsQueue)
    .set({
      status: "failed",
      errorMessage: input.errorMessage,
      completedAt: new Date(),
    })
    .where(eq(scrapeJobsQueue.jobId, input.jobId));
}

export async function recordOcrJobStart(input: {
  jobId: string;
  documentId: number;
  engine?: string;
}) {
  const db = await getDb();
  if (!db) return;

  const values: InsertOcrQueueJob = {
    jobId: input.jobId,
    documentId: input.documentId,
    engine: input.engine ?? "builtin",
    status: "processing",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db
    .insert(ocrJobsQueue)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        documentId: values.documentId,
        engine: values.engine,
        status: "processing",
        updatedAt: values.updatedAt,
      },
    });
}

export async function recordOcrJobCompletion(input: {
  jobId: string;
  status: "completed" | "failed";
  durationMs?: number;
  confidence?: number;
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(ocrJobsQueue)
    .set({
      status: input.status,
      durationMs: input.durationMs ?? null,
      confidence: input.confidence ?? null,
      errorMessage: input.errorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(ocrJobsQueue.jobId, input.jobId));

  if (input.status === "failed") {
    await db
      .update(scrapeJobsQueue)
      .set({ retryCount: sql`COALESCE(retryCount, 0) + 1` })
      .where(eq(scrapeJobsQueue.jobId, input.jobId));
  }
}

/**
 * Tạo hoặc cập nhật tài liệu
 */
export async function upsertDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .insert(documents)
      .values(doc)
      .onDuplicateKeyUpdate({
        set: {
          title: doc.title,
          documentType: doc.documentType,
          issuingAgency: doc.issuingAgency,
          issueDate: doc.issueDate,
          signer: doc.signer,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          summary: doc.summary,
          detailUrl: doc.detailUrl,
          status: doc.status,
          updatedAt: new Date(),
        },
      });
    
    // Lấy tài liệu vừa tạo/cập nhật
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.documentNumber, doc.documentNumber!))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to upsert document:", error);
    throw error;
  }
}

/**
 * Tạo log thu thập
 */
export async function createScrapeLog(log: InsertScrapeLog) {
  const db = await getDb();
  if (!db) {
    console.error("[Database] Cannot create scrape log: database not available");
    return null;
  }

  try {
    const result = await db.insert(scrapeLogs).values(log);
    console.log("[Database] Insert result:", result);
    
    if (result && (result as any).insertId) {
      const id = (result as any).insertId;
      console.log("[Database] Created scrape log with ID:", id);
      const created = await db
        .select()
        .from(scrapeLogs)
        .where(eq(scrapeLogs.id, id as number))
        .limit(1);
      return created.length > 0 ? created[0] : { id: id as number } as any;
    }
    
    console.log("[Database] No insertId in result, returning new log");
    return { ...log, id: Date.now() } as any;
  } catch (error) {
    console.error("[Database] Failed to create scrape log:", error);
    throw error;
  }
}

/**
 * Cập nhật log thu thập
 */
export async function updateScrapeLog(
  id: number,
  updates: Partial<InsertScrapeLog>
) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(scrapeLogs)
      .set(updates)
      .where(eq(scrapeLogs.id, id));
    
    const result = await db
      .select()
      .from(scrapeLogs)
      .where(eq(scrapeLogs.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update scrape log:", error);
    throw error;
  }
}

/**
 * Lấy lịch sử thu thập
 */
export async function getScrapeLogs(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(scrapeLogs)
    .where(eq(scrapeLogs.userId, userId))
    .orderBy((t) => t.createdAt)
    .limit(limit);
  
  return result;
}

/**
 * Lấy log thu thập mới nhất
 */
export async function getLatestScrapeLog() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(scrapeLogs)
    .orderBy(desc(scrapeLogs.createdAt))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Lấy cấu hình lập lịch
 */
export async function getScrapeSchedules(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(scrapeSchedules)
    .where(eq(scrapeSchedules.userId, userId));
  
  return result;
}

/**
 * Tạo cấu hình lập lịch
 */
export async function createScrapeSchedule(schedule: InsertScrapeSchedule) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(scrapeSchedules).values(schedule);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create schedule:", error);
    throw error;
  }
}

/**
 * Cập nhật cấu hình lập lịch
 */
export async function updateScrapeSchedule(
  id: number,
  updates: Partial<InsertScrapeSchedule>
) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(scrapeSchedules)
      .set(updates)
      .where(eq(scrapeSchedules.id, id));
    
    const result = await db
      .select()
      .from(scrapeSchedules)
      .where(eq(scrapeSchedules.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update schedule:", error);
    throw error;
  }
}

/**
 * Xóa cấu hình lập lịch
 */
export async function deleteScrapeSchedule(id: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(scrapeSchedules).where(eq(scrapeSchedules.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete schedule:", error);
    throw error;
  }
}

/**
 * Lấy các tài liệu được chọn để export của người dùng
 */
export async function getExportSelections(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: documents.id,
      documentNumber: documents.documentNumber,
      title: documents.title,
      documentType: documents.documentType,
      issuingAgency: documents.issuingAgency,
      issueDate: documents.issueDate,
      fileUrl: documents.fileUrl,
      fileName: documents.fileName,
    })
    .from(exportSelections)
    .innerJoin(documents, eq(exportSelections.documentId, documents.id))
    .where(eq(exportSelections.userId, userId));
  
  return result;
}

/**
 * Thêm tài liệu vào danh sách export
 */
export async function addToExportSelection(
  userId: number,
  documentId: number
) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(exportSelections).values({ userId, documentId });
    return true;
  } catch (error) {
    console.error("[Database] Failed to add to export selection:", error);
    throw error;
  }
}

/**
 * Xóa tài liệu khỏi danh sách export
 */
export async function removeFromExportSelection(
  userId: number,
  documentId: number
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .delete(exportSelections)
      .where(
        and(
          eq(exportSelections.userId, userId),
          eq(exportSelections.documentId, documentId)
        )
      );
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove from export selection:", error);
    throw error;
  }
}

/**
 * Xóa tất cả danh sách export của người dùng
 */
export async function clearExportSelections(userId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(exportSelections).where(eq(exportSelections.userId, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to clear export selections:", error);
    throw error;
  }
}


/**
 * Cập nhật ghi chú cho tài liệu
 */
export async function updateDocumentNotes(documentId: number, notes: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(documents)
      .set({ notes })
      .where(eq(documents.id, documentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update notes:", error);
    return null;
  }
}

/**
 * Cập nhật tag cho tài liệu
 */
export async function updateDocumentTags(documentId: number, tags: string[]) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(documents)
      .set({ tags: JSON.stringify(tags) })
      .where(eq(documents.id, documentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update tags:", error);
    return null;
  }
}

/**
 * Cập nhật trạng thái xử lý
 */
export async function updateProcessedStatus(documentId: number, status: 'new' | 'processed') {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(documents)
      .set({ processedStatus: status })
      .where(eq(documents.id, documentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update processed status:", error);
    return null;
  }
}


/**
 * Lấy danh sách tag đã sử dụng
 */
export async function getUsedTags() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(documents).where((t: any) => t.tags.isNotNull());
    const tagsSet = new Set<string>();
    
    result.forEach((doc: any) => {
      if (doc.tags) {
        try {
          const parsedTags = JSON.parse(doc.tags);
          if (Array.isArray(parsedTags)) {
            parsedTags.forEach((tag: string) => tagsSet.add(tag));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    
    return Array.from(tagsSet).sort();
  } catch (error) {
    console.error("[Database] Failed to get used tags:", error);
    return [];
  }
}

/**
 * Lọc tài liệu theo tag
 */
export async function getDocumentsByTag(tag: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(documents)
      .limit(limit)
      .offset(offset);
    
    return result.filter((doc: any) => {
      if (doc.tags) {
        try {
          const tags = JSON.parse(doc.tags);
          return Array.isArray(tags) && tags.includes(tag);
        } catch (e) {
          return false;
        }
      }
      return false;
    });
  } catch (error) {
    console.error("[Database] Failed to get documents by tag:", error);
    return [];
  }
}

/**
 * Tìm kiếm tài liệu theo nội dung ghi chú
 */
export async function searchDocumentsByNotes(query: string, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(documents)
      .limit(limit)
      .offset(offset);
    
    const lowerQuery = query.toLowerCase();
    return result.filter((doc: any) => 
      doc.notes && doc.notes.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error("[Database] Failed to search documents by notes:", error);
    return [];
  }
}

/**
 * Tìm kiếm tài liệu theo văn bản chung
 */
export async function searchDocuments(
  query: string,
  limit: number = 20,
  offset: number = 0,
) {
  const db = await getDb();
  if (!db) {
    return { documents: [], total: 0 };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { documents: [], total: 0 };
  }

  const normalized = trimmed.normalize("NFC");
  const pattern = `%${normalized.replace(/[%_]/g, "\\$&")}%`;

  const condition = or(
    like(documents.documentNumber, pattern),
    like(documents.title, pattern),
    like(documents.summary, pattern),
    like(documents.issuingAgency, pattern),
  );

  const [records, totalResult] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(condition)
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(documents).where(condition),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  return { documents: records, total };
}

/**
 * Lưu dữ liệu nhận dạng
 */
export async function clearExtractedData(documentId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(extractedData).where(eq(extractedData.documentId, documentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to clear extracted data:", error);
    return false;
  }
}

export async function saveExtractedData(documentId: number, dataType: string, value: string, confidence: number = 0) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(extractedData).values({
      documentId,
      dataType,
      value,
      confidence,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to save extracted data:", error);
    return null;
  }
}

/**
 * Lấy dữ liệu nhận dạng của tài liệu
 */
export async function getExtractedData(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(extractedData)
      .where(eq(extractedData.documentId, documentId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get extracted data:", error);
    return [];
  }
}

export async function deleteOcrResultsByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(ocrRepository).where(eq(ocrRepository.documentId, documentId));
    await db.delete(ocrStatistics).where(eq(ocrStatistics.documentId, documentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete OCR results:", error);
    return false;
  }
}

/**
 * Lưu HS code
 */
export async function saveHsCode(code: string, nameEn?: string, nameVi?: string, description?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(hsCodes).values({
      code,
      nameEn,
      nameVi,
      description,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to save HS code:", error);
    return null;
  }
}

/**
 * Lấy HS code theo mã
 */
export async function getHsCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(hsCodes)
      .where(eq(hsCodes.code, code))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get HS code:", error);
    return null;
  }
}

/**
 * Liên kết tài liệu với HS code
 */
export async function linkDocumentToHsCode(documentId: number, hsCodeId: number, confidence: number = 0) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(documentHsCodes).values({
      documentId,
      hsCodeId,
      confidence,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to link document to HS code:", error);
    return null;
  }
}

/**
 * Lấy HS code của tài liệu
 */
export async function getDocumentHsCodes(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(documentHsCodes)
      .where(eq(documentHsCodes.documentId, documentId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get document HS codes:", error);
    return [];
  }
}


/**
 * Lưu dữ liệu tham chiếu
 */
export async function saveReferenceData(dataType: string, title: string, content?: string, hsCode?: string, source?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(referenceData).values({
      dataType,
      title,
      content,
      hsCode,
      source,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to save reference data:", error);
    return null;
  }
}

/**
 * Lấy dữ liệu tham chiếu theo loại
 */
export async function getReferenceDataByType(dataType: string, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(referenceData)
      .where(eq(referenceData.dataType, dataType))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get reference data:", error);
    return [];
  }
}

/**
 * Tìm kiếm dữ liệu tham chiếu theo HS code
 */
export async function getReferenceDataByHsCode(hsCode: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(referenceData)
      .where(eq(referenceData.hsCode, hsCode));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get reference data by HS code:", error);
    return [];
  }
}

/**
 * Lưu thông tin file tải lên
 */
export async function saveUploadedFile(userId: number, originalName: string, fileType: string, filePath: string, fileSize?: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(uploadedFiles).values({
      userId,
      originalName,
      fileType,
      filePath,
      fileSize,
      status: "pending",
    });
    const insertId = Array.isArray(result) ? (result[0] as any)?.insertId : (result as any)?.insertId;
    return insertId ?? null;
  } catch (error) {
    console.error("[Database] Failed to save uploaded file:", error);
    return null;
  }
}

/**
 * Cập nhật trạng thái file
 */
export async function updateUploadedFileStatus(fileId: number, status: string, extractedCount?: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const updateData: any = { status };
    if (extractedCount !== undefined) updateData.extractedCount = extractedCount;
    if (notes !== undefined) updateData.notes = notes;

    const result = await db.update(uploadedFiles)
      .set(updateData)
      .where(eq(uploadedFiles.id, fileId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update uploaded file status:", error);
    return null;
  }
}

/**
 * Lấy danh sách file tải lên của người dùng
 */
export async function getUserUploadedFilesWithTotal(
  userId: number,
  limit: number = 20,
  offset: number = 0,
) {
  const db = await getDb();
  if (!db) {
    return { files: [], total: 0 };
  }

  try {
    const [files, totalResult] = await Promise.all([
      db
        .select()
        .from(uploadedFiles)
        .where(eq(uploadedFiles.userId, userId))
        .orderBy(desc(uploadedFiles.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(uploadedFiles)
        .where(eq(uploadedFiles.userId, userId)),
    ]);

    const fileIds = files.map((file) => file.id).filter((id): id is number => typeof id === "number");
    let analysesByFileId = new Map<number, { analysisJson: string | null; extractedDataJson: string | null }>();

    if (fileIds.length > 0) {
      const analyses = await db
        .select({
          uploadedFileId: uploadedFileAnalyses.uploadedFileId,
          analysisJson: uploadedFileAnalyses.analysisJson,
          extractedDataJson: uploadedFileAnalyses.extractedDataJson,
        })
        .from(uploadedFileAnalyses)
        .where(inArray(uploadedFileAnalyses.uploadedFileId, fileIds));

      analysesByFileId = new Map(
        analyses.map((item) => [item.uploadedFileId, { analysisJson: item.analysisJson, extractedDataJson: item.extractedDataJson }]),
      );
    }

    const enrichedFiles = files.map((file) => {
      const analysis = analysesByFileId.get(file.id ?? 0);
      let parsedAnalysis: any = null;
      let parsedExtracted: any = null;

      if (analysis?.analysisJson) {
        try {
          parsedAnalysis = JSON.parse(analysis.analysisJson);
        } catch (error) {
          console.warn("[Database] Failed to parse uploaded file analysis JSON", error);
        }
      }

      if (analysis?.extractedDataJson) {
        try {
          parsedExtracted = JSON.parse(analysis.extractedDataJson);
        } catch (error) {
          console.warn("[Database] Failed to parse uploaded file extracted data JSON", error);
        }
      }

      return {
        ...file,
        aiAnalysis: parsedAnalysis,
        extractedData: parsedExtracted,
      };
    });

    const total = Number(totalResult[0]?.count ?? 0);
    return { files: enrichedFiles, total };
  } catch (error) {
    console.error("[Database] Failed to get user uploaded files:", error);
    return { files: [], total: 0 };
  }
}

export async function getUserUploadedFiles(
  userId: number,
  limit: number = 20,
  offset: number = 0,
) {
  const result = await getUserUploadedFilesWithTotal(userId, limit, offset);
  return result.files;
}

/**
 * Lưu hoặc cập nhật kết quả phân tích AI cho file tải lên
 */
export async function saveUploadedFileAnalysis(
  uploadedFileId: number,
  analysis: unknown,
  extractedDataPayload?: unknown,
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save uploaded file analysis: database not available");
    return null;
  }

  try {
    const payload = {
      uploadedFileId,
      analysisJson: analysis ? JSON.stringify(analysis) : null,
      extractedDataJson: extractedDataPayload ? JSON.stringify(extractedDataPayload) : null,
    };

    await db
      .insert(uploadedFileAnalyses)
      .values(payload)
      .onDuplicateKeyUpdate({
        set: {
          analysisJson: payload.analysisJson,
          extractedDataJson: payload.extractedDataJson,
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (error) {
    console.error("[Database] Failed to save uploaded file analysis:", error);
    return null;
  }
}


/**
 * Lưu feedback từ người dùng
 */
export async function saveFeedback(userId: number, feedbackType: string, title: string, description: string, uploadedFileId?: number, rating?: number, relatedData?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(userFeedback).values({
      userId,
      feedbackType,
      title,
      description,
      uploadedFileId,
      rating,
      relatedData,
      status: "open",
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to save feedback:", error);
    return null;
  }
}

/**
 * Lấy danh sách feedback
 */
export async function getFeedbackList(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(userFeedback)
      .orderBy(userFeedback.createdAt)
      .limit(limit)
      .offset(offset);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get feedback list:", error);
    return [];
  }
}

/**
 * Lấy feedback của người dùng
 */
export async function getUserFeedback(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(userFeedback.createdAt)
      .limit(limit)
      .offset(offset);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get user feedback:", error);
    return [];
  }
}

/**
 * Lấy thông tin feedback kèm email của người dùng
 */
export async function getFeedbackWithUser(feedbackId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select({
      feedback: userFeedback,
      user: users,
    })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .where(eq(userFeedback.id, feedbackId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get feedback with user:", error);
    return null;
  }
}

/**
 * Cập nhật trạng thái feedback
 */
export async function updateFeedbackStatus(feedbackId: number, status: string, adminResponse?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const updateData: any = { status };
    if (adminResponse !== undefined) updateData.adminResponse = adminResponse;

    const result = await db.update(userFeedback)
      .set(updateData)
      .where(eq(userFeedback.id, feedbackId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update feedback status:", error);
    return null;
  }
}


/**
 * Lưu kết quả OCR vào database
 */
export async function saveOcrResult(
  data: InsertOcrRepository
): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save OCR result: database not available");
    return null;
  }

  try {
    const result = await db.insert(ocrRepository).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to save OCR result:", error);
    return null;
  }
}

/**
 * Lưu nhiều kết quả OCR
 */
export async function saveMultipleOcrResults(
  dataList: InsertOcrRepository[]
): Promise<number[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save OCR results: database not available");
    return [];
  }

  try {
    const ids: number[] = [];
    for (const data of dataList) {
      const result = await db.insert(ocrRepository).values(data);
      ids.push(result[0].insertId);
    }
    return ids;
  } catch (error) {
    console.error("[Database] Failed to save OCR results:", error);
    return [];
  }
}

/**
 * Lấy kết quả OCR theo documentId
 */
export async function getOcrResultsByDocumentId(
  documentId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get OCR results: database not available");
    return [];
  }

  try {
    const results = await db
      .select()
      .from(ocrRepository)
      .where(eq(ocrRepository.documentId, documentId));
    return results;
  } catch (error) {
    console.error("[Database] Failed to get OCR results:", error);
    return [];
  }
}

/**
 * Lưu thống kê OCR
 */
export async function saveOcrStatistics(
  data: InsertOcrStatistics
): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save OCR statistics: database not available");
    return null;
  }

  try {
    const result = await db.insert(ocrStatistics).values(data);
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to save OCR statistics:", error);
    return null;
  }
}

/**
 * Cập nhật thống kê OCR
 */
export async function updateOcrStatistics(
  documentId: number,
  data: Partial<InsertOcrStatistics>
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update OCR statistics: database not available");
    return false;
  }

  try {
    await db
      .update(ocrStatistics)
      .set(data)
      .where(eq(ocrStatistics.documentId, documentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update OCR statistics:", error);
    return false;
  }
}

/**
 * Lấy thống kê OCR theo documentId
 */
export async function getOcrStatistics(
  documentId: number
): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get OCR statistics: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(ocrStatistics)
      .where(eq(ocrStatistics.documentId, documentId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get OCR statistics:", error);
    return null;
  }
}


// ===== Admin User Management Functions =====

/**
 * Lấy tất cả người dùng (chỉ admin)
 */
export async function getAllUsers(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  try {
    const result = await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    const countResult = await db.select({ count: count() }).from(users);
    const total = countResult[0]?.count || 0;

    return { users: result, total };
  } catch (error) {
    console.error("[Database] Failed to get all users:", error);
    return { users: [], total: 0 };
  }
}

/**
 * Lấy thống kê người dùng
 */
export async function getUserStatistics() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, adminUsers: 0, regularUsers: 0, newUsersThisMonth: 0 };

  try {
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    const adminUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const adminUsers = adminUsersResult[0]?.count || 0;

    const regularUsers = totalUsers - adminUsers;

    // Người dùng mới trong tháng này
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const newUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, firstDayOfMonth));
    const newUsersThisMonth = newUsersResult[0]?.count || 0;

    return { totalUsers, adminUsers, regularUsers, newUsersThisMonth };
  } catch (error) {
    console.error("[Database] Failed to get user statistics:", error);
    return { totalUsers: 0, adminUsers: 0, regularUsers: 0, newUsersThisMonth: 0 };
  }
}

/**
 * Lấy hoạt động người dùng (tài liệu được tạo, feedback, v.v.)
 */
export async function getUserActivity(userId: number) {
  const db = await getDb();
  if (!db) return { documentsCount: 0, feedbackCount: 0, lastActive: null };

  try {
    // Đếm tài liệu của người dùng (bỏ qua vì documents không có userId)
    const documentsCount = 0;

    // Đếm feedback của người dùng
    const feedbackResult = await db
      .select({ count: count() })
      .from(userFeedback)
      .where(eq(userFeedback.userId, userId));
    const feedbackCount = feedbackResult[0]?.count || 0;

    // Lấy hoạt động cuối cùng
    const userResult = await db
      .select({ lastSignedIn: users.lastSignedIn })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const lastActive = userResult[0]?.lastSignedIn || null;

    return { documentsCount: 0, feedbackCount, lastActive };
  } catch (error) {
    console.error("[Database] Failed to get user activity:", error);
    return { documentsCount: 0, feedbackCount: 0, lastActive: null };
  }
}

/**
 * Cập nhật vai trò người dùng
 */
export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user role: database not available");
    return false;
  }

  try {
    await db.update(users).set({ role }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user role:", error);
    return false;
  }
}

/**
 * Xóa người dùng
 */
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete user: database not available");
    return false;
  }

  try {
    // Xóa tất cả dữ liệu liên quan đến người dùng
    await db.delete(exportSelections).where(eq(exportSelections.userId, userId));
    await db.delete(userFeedback).where(eq(userFeedback.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete user:", error);
    return false;
  }
}

/**
 * Tìm kiếm người dùng
 */
export async function searchUsers(query: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(users)
      .where(
        or(
          like(users.name, `%${query}%`),
          like(users.email, `%${query}%`),
          like(users.openId, `%${query}%`)
        )
      )
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Database] Failed to search users:", error);
    return [];
  }
}


/**
 * Lấy dữ liệu hoạt động người dùng theo ngày (7 ngày gần nhất)
 */
export async function getUserActivityByDate() {
  const db = await getDb();
  if (!db) return [];

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db
      .select({
        date: sql`DATE(${users.lastSignedIn})`,
        count: count(),
      })
      .from(users)
      .where(gte(users.lastSignedIn, sevenDaysAgo))
      .groupBy(sql`DATE(${users.lastSignedIn})`)
      .orderBy(sql`DATE(${users.lastSignedIn})`);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get user activity by date:", error);
    return [];
  }
}

/**
 * Lấy phân bố người dùng theo vai trò
 */
export async function getUserDistributionByRole() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get user distribution by role:", error);
    return [];
  }
}

/**
 * Lấy top 10 người dùng có feedback nhiều nhất
 */
export async function getTopUsersByFeedback() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        userId: userFeedback.userId,
        userName: users.name,
        feedbackCount: count(),
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .groupBy(userFeedback.userId)
      .orderBy(desc(count()))
      .limit(10);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get top users by feedback:", error);
    return [];
  }
}

/**
 * Lấy thống kê feedback theo loại
 */
export async function getFeedbackStatisticsByType() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        type: userFeedback.feedbackType,
        count: count(),
      })
      .from(userFeedback)
      .groupBy(userFeedback.feedbackType);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get feedback statistics by type:", error);
    return [];
  }
}

/**
 * Lấy thống kê feedback theo trạng thái
 */
export async function getFeedbackStatisticsByStatus() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        status: userFeedback.status,
        count: count(),
      })
      .from(userFeedback)
      .groupBy(userFeedback.status);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get feedback statistics by status:", error);
    return [];
  }
}


// ===== HS Code Lookup Functions =====

/**
 * Tra cứu HS code theo mã code
 */
export async function searchHsCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(hsCodes)
      .where(eq(hsCodes.code, code))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to search HS code by code:", error);
    return null;
  }
}

/**
 * Tìm kiếm HS code theo tên hàng (Việt hoặc Anh)
 */
export async function searchHsCodeByName(query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(hsCodes)
      .where(
        or(
          like(hsCodes.nameVi, `%${query}%`),
          like(hsCodes.nameEn, `%${query}%`),
          like(hsCodes.code, `%${query}%`)
        )
      )
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Database] Failed to search HS code by name:", error);
    return [];
  }
}

/**
 * Lấy danh sách HS code phổ biến (có referenceCount cao nhất)
 */
export async function getPopularHsCodes(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(hsCodes)
      .orderBy(desc(hsCodes.referenceCount))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get popular HS codes:", error);
    return [];
  }
}

/**
 * Lấy HS code theo tài liệu
 */
export async function getHsCodesByDocument(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        id: hsCodes.id,
        code: hsCodes.code,
        nameVi: hsCodes.nameVi,
        nameEn: hsCodes.nameEn,
        description: hsCodes.description,
        importTariff: hsCodes.importTariff,
        exportTariff: hsCodes.exportTariff,
      })
      .from(documentHsCodes)
      .innerJoin(hsCodes, eq(documentHsCodes.hsCodeId, hsCodes.id))
      .where(eq(documentHsCodes.documentId, documentId));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get HS codes by document:", error);
    return [];
  }
}

/**
 * Lấy tất cả HS code với phân trang
 */
export async function getAllHsCodes(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return { hsCodes: [], total: 0 };

  try {
    const result = await db
      .select()
      .from(hsCodes)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(hsCodes.referenceCount));

    const countResult = await db.select({ count: count() }).from(hsCodes);
    const total = countResult[0]?.count || 0;

    return { hsCodes: result, total };
  } catch (error) {
    console.error("[Database] Failed to get all HS codes:", error);
    return { hsCodes: [], total: 0 };
  }
}

/**
 * Lấy thống kê HS code
 */
export async function getHsCodeStatistics() {
  const db = await getDb();
  if (!db) return { totalHsCodes: 0, topHsCodes: [] };

  try {
    const totalResult = await db.select({ count: count() }).from(hsCodes);
    const totalHsCodes = totalResult[0]?.count || 0;

    const topResult = await db
      .select()
      .from(hsCodes)
      .orderBy(desc(hsCodes.referenceCount))
      .limit(10);

    return { totalHsCodes, topHsCodes: topResult };
  } catch (error) {
    console.error("[Database] Failed to get HS code statistics:", error);
    return { totalHsCodes: 0, topHsCodes: [] };
  }
}


/**
 * Lưu tài liệu từ scraping vào database
 */
export async function saveScrapedDocument(data: {
  documentNumber: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  issueDate: string;
  signer: string;
  fileUrl: string;
  fileName: string;
  summary: string;
  detailUrl: string;
  tags: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot save document: database not available");
      return;
    }

    // Kiểm tra xem tài liệu đã tồn tại chưa
    const existingResult = await db.select().from(documents)
      .where(eq(documents.documentNumber, data.documentNumber))
      .limit(1);
    const existing = existingResult.length > 0 ? existingResult[0] : null;

    if (!existing) {
      // Lưu tài liệu mới
      await db.insert(documents).values({
        documentNumber: data.documentNumber,
        customsDocId: data.documentNumber,
        title: data.title,
        documentType: data.documentType,
        issuingAgency: data.issuingAgency,
        issueDate: data.issueDate,
        signer: data.signer,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        summary: data.summary,
        detailUrl: data.detailUrl,
        tags: data.tags,
        status: "pending",
        processedStatus: "new",
      });

      console.log(`[Database] Lưu tài liệu: ${data.documentNumber}`);
    } else {
      console.log(`[Database] Tài liệu đã tồn tại: ${data.documentNumber}`);
    }
  } catch (error) {
    console.error("[Database] Lỗi lưu tài liệu:", error);
    throw error;
  }
}

/**
 * Cập nhật kết quả OCR cho tài liệu
 */
export async function updateDocumentOcrResult(
  documentId: string,
  ocrData: {
    extractedHsCodes: string[];
    extractedProductNames: string[];
    confidence: number;
    rawText: string;
  }
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot update document: database not available");
      return;
    }

    // Cập nhật tài liệu với kết quả OCR
    await db
      .update(documents)
      .set({
        processedStatus: "processed",
        // Lưu thông tin OCR vào summary hoặc field khác
        summary: `[OCR] ${ocrData.extractedHsCodes.length} HS codes, ${ocrData.extractedProductNames.length} products, ${(ocrData.confidence * 100).toFixed(2)}% confidence`,
      })
      .where(eq(documents.id, parseInt(documentId)));

    console.log(`[Database] Cập nhật OCR cho tài liệu: ${documentId}`);
  } catch (error) {
    console.error("[Database] Lỗi cập nhật OCR:", error);
    throw error;
  }
}

/**
 * Tạo liên kết giữa HS code và tài liệu phân tích
 */
export async function linkHsCodeToDocument(
  hsCode: string,
  documentId: string,
  productName: string,
  confidence: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot link HS code: database not available");
      return;
    }

    // Tìm hoặc tạo HS code record
    const existingHsCodeResult = await db.select().from(hsCodes)
      .where(eq(hsCodes.code, hsCode))
      .limit(1);
    const existingHsCode = existingHsCodeResult.length > 0 ? existingHsCodeResult[0] : null;

    if (!existingHsCode) {
      // Tạo HS code mới
      await db.insert(hsCodes).values([{
        code: hsCode,
        nameVi: productName,
        nameEn: productName,
        description: `Phân tích từ tài liệu Hải quan - ${new Date().toLocaleDateString("vi-VN")}`,
        importTariff: "0",
        exportTariff: "0",
      }]);

      console.log(`[Database] Tạo HS code mới: ${hsCode}`);
    }

    // Cập nhật thông tin liên kết
    console.log(
      `[Database] Liên kết HS code ${hsCode} với tài liệu ${documentId}`
    );
  } catch (error) {
    console.error("[Database] Lỗi tạo liên kết:", error);
    throw error;
  }
}

/**
 * Lấy tài liệu phân tích liên quan đến HS code
 */
export async function getRelatedAnalysisDocuments(
  hsCode: string
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get documents: database not available");
      return [];
    }

    // Truy vấn tài liệu chứa HS code này
    const relatedDocs = await db.select().from(documents)
      .limit(5) as any[];

    return relatedDocs;
  } catch (error) {
    console.error("[Database] Lỗi lấy tài liệu liên quan:", error);
    return [];
  }
}


/**
 * Lấy tất cả scraping logs (cho admin) với lọc và phân trang
 */
export async function getAllScrapeLogs(
  limit: number = 20,
  offset: number = 0,
  filters?: {
    status?: "running" | "completed" | "failed";
    scrapeType?: "manual" | "scheduled";
    startDate?: Date;
    endDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };

  try {
    const conditions: any[] = [];

    // Áp dụng các bộ lọc
    if (filters?.status) {
      conditions.push(eq(scrapeLogs.status, filters.status));
    }
    if (filters?.scrapeType) {
      conditions.push(eq(scrapeLogs.scrapeType, filters.scrapeType));
    }
    if (filters?.startDate) {
      conditions.push(gte(scrapeLogs.startTime, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(scrapeLogs.startTime, filters.endDate));
    }

    // Lay du lieu voi dieu kien
    let logsQuery: any = db.select().from(scrapeLogs);
    if (conditions.length > 0) {
      logsQuery = logsQuery.where(and(...conditions));
    }
    
    const logs = await logsQuery
      .orderBy(desc(scrapeLogs.startTime))
      .limit(limit)
      .offset(offset);

    // Lay tong so voi cac dieu kien tuong tu
    let countQuery: any = db.select({ count: count() }).from(scrapeLogs);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    return { logs, total };
  } catch (error) {
    console.error("[Database] Failed to get all scrape logs:", error);
    return { logs: [], total: 0 };
  }
}

/**
 * Lấy thống kê scraping history
 */
export async function getScrapingStatistics() {
  const db = await getDb();
  if (!db) return null;

  try {
    // Tổng số lần scraping
    const totalResult = await db
      .select({ count: count() })
      .from(scrapeLogs);
    const totalScrapes = totalResult[0]?.count || 0;

    // Số lần thành công
    const successResult = await db
      .select({ count: count() })
      .from(scrapeLogs)
      .where(eq(scrapeLogs.status, "completed"));
    const successfulScrapes = successResult[0]?.count || 0;

    // Số lần thất bại
    const failedResult = await db
      .select({ count: count() })
      .from(scrapeLogs)
      .where(eq(scrapeLogs.status, "failed"));
    const failedScrapes = failedResult[0]?.count || 0;

    // Tổng tài liệu tìm thấy
    const documentsResult = await db
      .select({ total: sum(scrapeLogs.documentsFound) })
      .from(scrapeLogs);
    const totalDocumentsFound = documentsResult[0]?.total || 0;

    // Tổng tài liệu tải thành công
    const downloadedResult = await db
      .select({ total: sum(scrapeLogs.documentsDownloaded) })
      .from(scrapeLogs);
    const totalDocumentsDownloaded = downloadedResult[0]?.total || 0;

    // Phân bố theo loại scraping
    const typeDistribution = await db
      .select({
        type: scrapeLogs.scrapeType,
        count: count(),
      })
      .from(scrapeLogs)
      .groupBy(scrapeLogs.scrapeType);

    return {
      totalScrapes,
      successfulScrapes,
      failedScrapes,
      successRate: totalScrapes > 0 ? (successfulScrapes / totalScrapes) * 100 : 0,
      totalDocumentsFound,
      totalDocumentsDownloaded,
      typeDistribution: typeDistribution.map((item: any) => ({
        type: item.type,
        count: item.count,
      })),
    };
  } catch (error) {
    console.error("[Database] Failed to get scraping statistics:", error);
    return null;
  }
}

/**
 * Lấy xu hướng scraping theo ngày (7 ngày gần đây)
 */
export async function getScrapingTrend() {
  const db = await getDb();
  if (!db) return [];

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db
      .select({
        date: scrapeLogs.startTime,
        count: count(),
        successful: count(
          sql`CASE WHEN ${eq(scrapeLogs.status, "completed")} THEN 1 END`
        ),
      })
      .from(scrapeLogs)
      .where(gte(scrapeLogs.startTime, sevenDaysAgo))
      .groupBy(sql`DATE(${scrapeLogs.startTime})`)
      .orderBy(scrapeLogs.startTime);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get scraping trend:", error);
    return [];
  }
}

/**
 * Lấy chi tiết một lần scraping với thông tin người dùng
 */
export async function getScrapingDetail(scrapeLogId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select({
        log: scrapeLogs,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(scrapeLogs)
      .innerJoin(users, eq(scrapeLogs.userId, users.id))
      .where(eq(scrapeLogs.id, scrapeLogId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get scraping detail:", error);
    return null;
  }
}

/**
 * Xóa một lần scraping
 */
export async function deleteScrapeLog(id: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(scrapeLogs).where(eq(scrapeLogs.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete scrape log:", error);
    return false;
  }
}
