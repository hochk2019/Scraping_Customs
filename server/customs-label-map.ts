export type DetailFieldKey =
  | "documentNumber"
  | "documentType"
  | "issuingAgency"
  | "issueDate"
  | "signer"
  | "title";

export const DETAIL_LABEL_MAP: Record<string, DetailFieldKey> = {
  "Số hiệu": "documentNumber",
  "Số ký hiệu": "documentNumber",
  "Loại văn bản": "documentType",
  "Cơ quan ban hành": "issuingAgency",
  "Đơn vị ban hành": "issuingAgency",
  "Ngày ban hành": "issueDate",
  "Ngày ký": "issueDate",
  "Người ký": "signer",
  "Trích yếu nội dung": "title",
  "Trích yêu nội dung": "title",
};

export function normalizeDetailLabel(label: string): DetailFieldKey | undefined {
  const normalized = label.trim().replace(/[:：]\s*$/, "");
  return DETAIL_LABEL_MAP[normalized];
}
