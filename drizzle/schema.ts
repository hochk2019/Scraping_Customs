import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bảng lưu trữ các tài liệu từ Hải quan
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  // Số hiệu văn bản, ví dụ: 29001/TB-CHQ
  documentNumber: varchar("documentNumber", { length: 100 }).notNull().unique(),
  // ID từ URL của trang chi tiết
  customsDocId: varchar("customsDocId", { length: 50 }).notNull(),
  // Tiêu đề/Trích yêu nội dung
  title: text("title"),
  // Loại văn bản: Thông báo, Công văn, v.v.
  documentType: varchar("documentType", { length: 100 }),
  // Cơ quan ban hành: Cục Hải quan, Bộ Tài chính, v.v.
  issuingAgency: varchar("issuingAgency", { length: 200 }),
  // Ngày ban hành
  issueDate: varchar("issueDate", { length: 20 }),
  // Người ký
  signer: varchar("signer", { length: 200 }),
  // Liên kết tải tệp PDF
  fileUrl: text("fileUrl"),
  // Tên tệp
  fileName: varchar("fileName", { length: 255 }),
  // Nội dung tóm tắt
  summary: text("summary"),
  // URL của trang chi tiết
  detailUrl: text("detailUrl"),
  // Trạng thái: pending, downloaded, failed
  status: mysqlEnum("status", ["pending", "downloaded", "failed"]).default("pending"),
  // Ghi chú lỗi nếu có
  errorMessage: text("errorMessage"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Thời gian tải tệp
  downloadedAt: timestamp("downloadedAt"),
  notes: text("notes"),
  tags: text("tags"),
  processedStatus: mysqlEnum("processedStatus", ["new", "processed"]).default("new"),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Bảng lưu trữ lịch sử thu thập dữ liệu
 */
export const scrapeLogs = mysqlTable("scrapeLogs", {
  id: int("id").autoincrement().primaryKey(),
  // ID của người dùng thực hiện
  userId: int("userId").notNull(),
  // Loại thu thập: manual (thủ công) hoặc scheduled (tự động)
  scrapeType: mysqlEnum("scrapeType", ["manual", "scheduled"]).notNull(),
  // Thời gian bắt đầu
  startTime: timestamp("startTime").defaultNow().notNull(),
  // Thời gian kết thúc
  endTime: timestamp("endTime"),
  // Số lượng tài liệu tìm thấy
  documentsFound: int("documentsFound").default(0),
  // Số lượng tài liệu đã tải
  documentsDownloaded: int("documentsDownloaded").default(0),
  // Trạng thái: running, completed, failed
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running"),
  // Ghi chú lỗi nếu có
  errorMessage: text("errorMessage"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScrapeLog = typeof scrapeLogs.$inferSelect;
export type InsertScrapeLog = typeof scrapeLogs.$inferInsert;

/**
 * Bảng lưu trữ cấu hình lập lịch thu thập tự động
 */
export const scrapeSchedules = mysqlTable("scrapeSchedules", {
  id: int("id").autoincrement().primaryKey(),
  // ID của người dùng sở hữu
  userId: int("userId").notNull(),
  // Tên cấu hình
  name: varchar("name", { length: 255 }).notNull(),
  // Biểu thức cron: "0 0 * * *" = hàng ngày lúc 00:00
  cronExpression: varchar("cronExpression", { length: 100 }).notNull(),
  // Trạng thái: active, inactive
  isActive: int("isActive").default(1),
  // Thời gian chạy lần cuối
  lastRunAt: timestamp("lastRunAt"),
  // Thời gian chạy lần tiếp theo
  nextRunAt: timestamp("nextRunAt"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScrapeSchedule = typeof scrapeSchedules.$inferSelect;
export type InsertScrapeSchedule = typeof scrapeSchedules.$inferInsert;

/**
 * Bảng lưu trữ các tài liệu được chọn để export
 */
export const exportSelections = mysqlTable("exportSelections", {
  id: int("id").autoincrement().primaryKey(),
  // ID của người dùng
  userId: int("userId").notNull(),
  // ID của tài liệu
  documentId: int("documentId").notNull(),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExportSelection = typeof exportSelections.$inferSelect;
export type InsertExportSelection = typeof exportSelections.$inferInsert;

/**
 * Bảng lưu trữ dữ liệu nhận dạng từ tài liệu
 */
export const extractedData = mysqlTable("extractedData", {
  id: int("id").autoincrement().primaryKey(),
  // ID của tài liệu
  documentId: int("documentId").notNull(),
  // Loại dữ liệu: hs_code, product_name, tariff, etc.
  dataType: varchar("dataType", { length: 100 }).notNull(),
  // Giá trị dữ liệu
  value: text("value").notNull(),
  // Độ tin cậy (0-100)
  confidence: int("confidence").default(0),
  // Ghi chú
  notes: text("notes"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtractedData = typeof extractedData.$inferSelect;
export type InsertExtractedData = typeof extractedData.$inferInsert;

/**
 * Bảng lưu trữ HS code và thông tin liên quan
 */
export const hsCodes = mysqlTable("hsCodes", {
  id: int("id").autoincrement().primaryKey(),
  // Mã HS code (ví dụ: 6204.62.20)
  code: varchar("code", { length: 20 }).notNull().unique(),
  // Tên hàng tiếng Anh
  nameEn: text("nameEn"),
  // Tên hàng tiếng Việt
  nameVi: text("nameVi"),
  // Mô tả chi tiết
  description: text("description"),
  // Biểu thuế nhập khẩu
  importTariff: varchar("importTariff", { length: 50 }),
  // Biểu thuế xuất khẩu
  exportTariff: varchar("exportTariff", { length: 50 }),
  // Chú giải HS code
  notes: text("notes"),
  // Số lần được tham chiếu
  referenceCount: int("referenceCount").default(0),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HsCode = typeof hsCodes.$inferSelect;
export type InsertHsCode = typeof hsCodes.$inferInsert;

/**
 * Bảng liên kết giữa tài liệu và HS code
 */
export const documentHsCodes = mysqlTable("documentHsCodes", {
  id: int("id").autoincrement().primaryKey(),
  // ID của tài liệu
  documentId: int("documentId").notNull(),
  // ID của HS code
  hsCodeId: int("hsCodeId").notNull(),
  // Độ tin cậy (0-100)
  confidence: int("confidence").default(0),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentHsCode = typeof documentHsCodes.$inferSelect;
export type InsertDocumentHsCode = typeof documentHsCodes.$inferInsert;


/**
 * Bảng lưu trữ dữ liệu tham chiếu (biểu thuế, tên hàng, chú giải)
 */
export const referenceData = mysqlTable("referenceData", {
  id: int("id").autoincrement().primaryKey(),
  // Loại dữ liệu: tariff, product_name, hs_note, etc.
  dataType: varchar("dataType", { length: 100 }).notNull(),
  // Mã HS code liên quan
  hsCode: varchar("hsCode", { length: 20 }),
  // Tiêu đề/tên
  title: text("title").notNull(),
  // Nội dung chi tiết
  content: text("content"),
  // Nguồn dữ liệu (file name, URL, etc.)
  source: varchar("source", { length: 255 }),
  // Ngôn ngữ (vi, en)
  language: varchar("language", { length: 10 }).default("vi"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferenceData = typeof referenceData.$inferSelect;
export type InsertReferenceData = typeof referenceData.$inferInsert;

/**
 * Bảng lưu trữ thông tin file tải lên
 */
export const uploadedFiles = mysqlTable("uploadedFiles", {
  id: int("id").autoincrement().primaryKey(),
  // ID của người dùng
  userId: int("userId").notNull(),
  // Tên file gốc
  originalName: varchar("originalName", { length: 255 }).notNull(),
  // Loại file (excel, pdf, word, json, csv)
  fileType: varchar("fileType", { length: 50 }).notNull(),
  // Đường dẫn file trên server
  filePath: varchar("filePath", { length: 255 }).notNull(),
  // Kích thước file (bytes)
  fileSize: int("fileSize"),
  // Trạng thái xử lý (pending, processing, completed, failed)
  status: varchar("status", { length: 50 }).default("pending"),
  // Số lượng bản ghi được trích xuất
  extractedCount: int("extractedCount").default(0),
  // Ghi chú/lỗi
  notes: text("notes"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;

/**
 * Bảng lưu trữ kết quả phân tích AI cho file tải lên
 */
export const uploadedFileAnalyses = mysqlTable(
  "uploadedFileAnalyses",
  {
    id: int("id").autoincrement().primaryKey(),
    uploadedFileId: int("uploadedFileId").notNull(),
    analysisJson: text("analysisJson"),
    extractedDataJson: text("extractedDataJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    uploadedFileUnique: uniqueIndex("uploadedFileAnalyses_uploadedFileId_unique").on(
      table.uploadedFileId,
    ),
  }),
);

export type UploadedFileAnalysis = typeof uploadedFileAnalyses.$inferSelect;
export type InsertUploadedFileAnalysis = typeof uploadedFileAnalyses.$inferInsert;


/**
 * Bảng lưu trữ phản hồi từ người dùng
 */
export const userFeedback = mysqlTable("userFeedback", {
  id: int("id").autoincrement().primaryKey(),
  // ID của người dùng
  userId: int("userId").notNull(),
  // ID của file tải lên (nếu có)
  uploadedFileId: int("uploadedFileId"),
  // Loại feedback: bug_report, improvement_suggestion, data_correction
  feedbackType: varchar("feedbackType", { length: 50 }).notNull(),
  // Tiêu đề feedback
  title: varchar("title", { length: 255 }).notNull(),
  // Nội dung chi tiết
  description: text("description").notNull(),
  // Dữ liệu liên quan (JSON)
  relatedData: text("relatedData"),
  // Đánh giá (1-5 sao)
  rating: int("rating"),
  // Trạng thái: open, in_progress, resolved, closed
  status: varchar("status", { length: 50 }).default("open"),
  // Phản hồi từ admin
  adminResponse: text("adminResponse"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;


/**
 * Bảng lưu trữ kho dữ liệu OCR từ các liên kết
 */
export const ocrRepository = mysqlTable("ocrRepository", {
  id: int("id").autoincrement().primaryKey(),
  // ID của tài liệu
  documentId: int("documentId").notNull(),
  // Số hiệu tài liệu
  documentNumber: varchar("documentNumber", { length: 100 }).notNull(),
  // Tiêu đề tài liệu
  documentTitle: text("documentTitle"),
  // URL liên kết PDF
  linkUrl: text("linkUrl").notNull(),
  // Trạng thái xử lý: success, failed
  status: varchar("status", { length: 50 }).notNull(),
  // Văn bản được trích xuất
  extractedText: text("extractedText"),
  // Mã HS code được trích xuất (JSON array)
  hsCodes: text("hsCodes"),
  // Tên hàng được trích xuất (JSON array)
  productNames: text("productNames"),
  // Độ dài văn bản
  textLength: int("textLength").default(0),
  // Số từ trong văn bản
  wordCount: int("wordCount").default(0),
  // Thông báo lỗi (nếu có)
  errorMessage: text("errorMessage"),
  // Thời gian xử lý (milliseconds)
  processingTime: int("processingTime"),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OcrRepository = typeof ocrRepository.$inferSelect;
export type InsertOcrRepository = typeof ocrRepository.$inferInsert;

/**
 * Bảng lưu trữ thống kê OCR
 */
export const ocrStatistics = mysqlTable("ocrStatistics", {
  id: int("id").autoincrement().primaryKey(),
  // ID của tài liệu
  documentId: int("documentId").notNull(),
  // Tổng số liên kết đã xử lý
  totalLinks: int("totalLinks").default(0),
  // Số liên kết thành công
  successfulLinks: int("successfulLinks").default(0),
  // Số liên kết lỗi
  failedLinks: int("failedLinks").default(0),
  // Tổng số HS code
  totalHsCodes: int("totalHsCodes").default(0),
  // Số HS code duy nhất
  uniqueHsCodes: int("uniqueHsCodes").default(0),
  // Tổng số tên hàng
  totalProductNames: int("totalProductNames").default(0),
  // Số tên hàng duy nhất
  uniqueProductNames: int("uniqueProductNames").default(0),
  // Tổng độ dài văn bản
  totalTextLength: int("totalTextLength").default(0),
  // Tổng số từ
  totalWordCount: int("totalWordCount").default(0),
  // Tỷ lệ thành công (%)
  successRate: int("successRate").default(0),
  // Thời gian tạo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Thời gian cập nhật
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OcrStatistics = typeof ocrStatistics.$inferSelect;
export type InsertOcrStatistics = typeof ocrStatistics.$inferInsert;
