import { useMemo } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Link2,
  User2,
  Building2,
  Tag,
  Clipboard,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

interface DocumentDetailDrawerProps {
  documentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackDocument?: DocumentListItem | null;
}

type RouterOutputs = inferRouterOutputs<AppRouter>;
type DocumentDetail = NonNullable<RouterOutputs["documents"]["getById"]>;
type DocumentListItem = RouterOutputs["documents"]["list"]["documents"][number];

type ExtractedDataItem = DocumentDetail extends { extractedData: infer T }
  ? T extends Array<infer U>
    ? U
    : never
  : never;

const statusStyles: Record<string, { label: string; className: string }> = {
  downloaded: {
    label: "Đã tải",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  failed: {
    label: "Lỗi",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  pending: {
    label: "Chờ xử lý",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
};

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "Không xác định";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return date instanceof Date ? parsed.toLocaleString("vi-VN") : String(date);
  }
  return parsed.toLocaleString("vi-VN");
}

function normalizeList(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch (error) {
    // ignore JSON parse errors and fall back to splitting by comma
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderExtractedData(items: ExtractedDataItem[] | undefined) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 text-slate-400" />
        <div className="space-y-1 text-sm text-slate-600">
          <p>Chưa có dữ liệu OCR hoặc phân tích nào được lưu cho tài liệu này.</p>
          <p className="text-xs text-slate-500">
            Hãy chạy pipeline OCR hoặc tải lại tài liệu để cập nhật thông tin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="capitalize">
              {item.dataType.replace(/_/g, " ")}
            </Badge>
            {typeof item.confidence === "number" && (
              <span className="text-xs font-medium text-slate-500">
                Độ tin cậy: {item.confidence}%
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
            {String(item.value ?? "").trim() || "(Không có dữ liệu)"}
          </p>
          {item.notes && (
            <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
              Ghi chú: {item.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function DocumentDetailDrawer({
  documentId,
  open,
  onOpenChange,
  fallbackDocument,
}: DocumentDetailDrawerProps) {
  const {
    data: document,
    isLoading,
    isFetching,
  } = trpc.documents.getById.useQuery(
    { id: documentId ?? 0 },
    {
      enabled: Boolean(open && documentId),
      staleTime: 60_000,
    }
  );

  const mergedDocument = useMemo<DocumentDetail | DocumentListItem | null>(() => {
    if (document) {
      return document;
    }
    return fallbackDocument ?? null;
  }, [document, fallbackDocument]);

  const status = mergedDocument?.status ?? "pending";
  const statusStyle = statusStyles[status] ?? statusStyles.pending;

  const handleDownload = () => {
    if (mergedDocument?.fileUrl) {
      window.open(mergedDocument.fileUrl, "_blank", "noopener");
    }
  };

  const handleOpenDetail = () => {
    if (mergedDocument?.detailUrl) {
      window.open(mergedDocument.detailUrl, "_blank", "noopener");
    }
  };

  const handleCopyLink = async () => {
    const urlToCopy = mergedDocument?.fileUrl || mergedDocument?.detailUrl;
    if (!urlToCopy) {
      toast.warning("Không tìm thấy liên kết để sao chép");
      return;
    }
    try {
      await navigator.clipboard.writeText(urlToCopy);
      toast.success("Đã sao chép liên kết vào bộ nhớ tạm");
    } catch (error) {
      toast.error("Không thể sao chép, vui lòng thử lại");
    }
  };

  const tags = normalizeList((mergedDocument as DocumentDetail | null)?.tags ?? null);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-xl">
        <DrawerHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DrawerTitle className="text-xl font-semibold">
              {mergedDocument?.documentNumber || "Chi tiết tài liệu"}
            </DrawerTitle>
            <Badge className={`border ${statusStyle.className}`}>{statusStyle.label}</Badge>
          </div>
          <DrawerDescription className="text-left text-sm text-slate-600">
            {mergedDocument?.title || "Không có tiêu đề"}
          </DrawerDescription>
        </DrawerHeader>
        <Separator />
        <ScrollArea className="h-[calc(100vh-240px)] px-4 py-6">
          {isLoading && !mergedDocument ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <FileText className="h-4 w-4" />
                  Thông tin chính
                </h3>
                <div className="grid gap-3 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Cơ quan ban hành</p>
                      <p>{mergedDocument?.issuingAgency || "Chưa rõ"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ngày ban hành</p>
                      <p>{formatDate(mergedDocument?.issueDate)}</p>
                    </div>
                  </div>
                  {mergedDocument?.documentType && (
                    <div className="flex items-start gap-2">
                      <Tag className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Loại văn bản</p>
                        <p>{mergedDocument.documentType}</p>
                      </div>
                    </div>
                  )}
                  {mergedDocument?.signer && (
                    <div className="flex items-start gap-2">
                      <User2 className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Người ký</p>
                        <p>{mergedDocument.signer}</p>
                      </div>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Từ khóa nổi bật</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <Clipboard className="h-4 w-4" />
                  Tóm tắt nội dung
                </h3>
                <p className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {String(mergedDocument?.summary ?? "Chưa có tóm tắt").trim() || "Chưa có tóm tắt"}
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  <Sparkles className="h-4 w-4" />
                  Dữ liệu OCR & gợi ý
                </h3>
                {renderExtractedData((document as DocumentDetail | undefined)?.extractedData)}
              </section>

              {(mergedDocument as DocumentDetail | null)?.notes && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <AlertCircle className="h-4 w-4" />
                    Ghi chú nội bộ
                  </h3>
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {(mergedDocument as DocumentDetail).notes}
                  </p>
                </section>
              )}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <DrawerFooter className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="default" size="sm" onClick={handleDownload} disabled={!mergedDocument?.fileUrl}>
              <Download className="mr-2 h-4 w-4" />
              Mở PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenDetail}
              disabled={!mergedDocument?.detailUrl}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Trang gốc
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Link2 className="mr-2 h-4 w-4" />
              Sao chép liên kết
            </Button>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">
              Đóng
            </Button>
          </DrawerClose>
          {isFetching && (
            <p className="text-center text-xs text-slate-400">Đang cập nhật dữ liệu mới nhất…</p>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export type { DocumentListItem };
