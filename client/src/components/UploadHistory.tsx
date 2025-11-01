import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, FileText, CheckCircle, AlertCircle, Clock, Download, Loader2, RefreshCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface UploadedFileData {
  id: number;
  originalName: string;
  fileType: string;
  fileSize: number;
  status: string;
  extractedCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  aiAnalysis?: {
    productNames: string[];
    hsCodes: string[];
    suggestions: Array<{
      productName: string;
      suggestions: Array<{
        hsCode: string;
        confidence: number;
        description: string;
      }>;
    }>;
    confidence: number;
  };
  extractedData?: {
    hsCodes?: string[];
    productNames?: string[];
    summary?: Record<string, unknown>;
  };
}

export default function UploadHistory() {
  const [selectedFile, setSelectedFile] = useState<UploadedFileData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "status" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const limit = 10;

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = trpc.files.list.useQuery({ limit, offset: page * limit });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const uploadHistory: UploadedFileData[] = useMemo(() => {
    const records = data?.files ?? [];
    return records.map((file: any) => ({
      ...file,
      createdAt: file.createdAt ? new Date(file.createdAt) : new Date(),
      updatedAt: file.updatedAt ? new Date(file.updatedAt) : new Date(),
    }));
  }, [data]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-500" size={16} />;
      case "processing":
        return <Clock className="text-blue-500 animate-spin" size={16} />;
      case "failed":
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Đang xử lý</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Lỗi</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Chờ xử lý</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "excel":
        return "📊";
      case "pdf":
        return "📄";
      case "word":
        return "📝";
      case "json":
        return "{ }";
      case "csv":
        return "📋";
      default:
        return "📁";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("vi-VN");
  };

  const sortedHistory = useMemo(() => {
    const list = [...uploadHistory];
    list.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "date") {
        compareValue = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortBy === "status") {
        compareValue = a.status.localeCompare(b.status);
      } else if (sortBy === "size") {
        compareValue = (a.fileSize ?? 0) - (b.fileSize ?? 0);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });
    return list;
  }, [uploadHistory, sortBy, sortOrder]);

  const handleRefresh = async () => {
    await refetch();
    toast.success("Đã làm mới lịch sử tải lên");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History size={20} />
              Lịch Sử Tệp Tải Lên
            </CardTitle>
            <CardDescription>
              Xem lại các tệp đã tải lên và kết quả phân tích AI
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sắp xếp theo:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="date">Ngày tải lên</option>
                <option value="status">Trạng thái</option>
                <option value="size">Kích thước</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-2 py-1 border rounded text-sm hover:bg-gray-100"
                aria-label="Đảo thứ tự sắp xếp"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Tệp</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Trích xuất</TableHead>
                  <TableHead>Thời gian tải</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  sortedHistory.map((file) => (
                    <TableRow key={file.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getFileIcon(file.fileType)}</span>
                          <div>
                            <p className="font-medium">{file.originalName}</p>
                            <p className="text-xs text-gray-500">ID: {file.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{file.fileType}</TableCell>
                      <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          {getStatusBadge(file.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {file.status === "completed" ? (
                          <div className="text-sm leading-tight">
                            <p className="font-semibold">{file.extractedCount} bản ghi</p>
                            {file.aiAnalysis && (
                              <p className="text-xs text-gray-600">
                                {file.aiAnalysis.hsCodes.length} mã HS, {file.aiAnalysis.confidence}% tin cậy
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Đang xử lý…</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(file.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(file);
                            setShowDetails(true);
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && sortedHistory.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
              Chưa có lịch sử tải lên nào. Hãy tải file mới để bắt đầu phân tích.
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {sortedHistory.length} / {total} tệp
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              >
                Trước
              </Button>
              <span className="text-sm">
                Trang {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết tệp tải lên</DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ về quá trình xử lý và phân tích AI
            </DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-gray-500">Thông tin tệp</h3>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2">
                      <FileText size={16} />
                      <span>{selectedFile.originalName}</span>
                    </p>
                    <p>Loại: {selectedFile.fileType.toUpperCase()}</p>
                    <p>Kích thước: {formatFileSize(selectedFile.fileSize)}</p>
                    <p>Trạng thái: {getStatusBadge(selectedFile.status)}</p>
                    <p>Ngày tải lên: {formatDate(selectedFile.createdAt)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-gray-500">Tóm tắt xử lý</h3>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm">
                    <p>Số lượng dữ liệu trích xuất: {selectedFile.extractedCount}</p>
                    {selectedFile.aiAnalysis ? (
                      <p>Độ tin cậy AI: {selectedFile.aiAnalysis.confidence}%</p>
                    ) : (
                      <p>Chưa có kết quả AI</p>
                    )}
                    {selectedFile.notes && <p className="text-xs text-gray-500">Ghi chú: {selectedFile.notes}</p>}
                  </div>
                </div>
              </div>

              {selectedFile.aiAnalysis && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-gray-500">
                      Gợi ý mã HS từ AI
                    </h3>
                    <Badge className="bg-purple-100 text-purple-700">
                      {selectedFile.aiAnalysis.confidence}% tin cậy
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {selectedFile.aiAnalysis.suggestions.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold">{item.productName}</h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {item.suggestions.map((suggestion, sIdx) => (
                            <li key={sIdx} className="flex items-center justify-between">
                              <span>{suggestion.hsCode}</span>
                              <span className="text-xs text-gray-600">
                                {(suggestion.confidence * 100).toFixed(0)}% · {suggestion.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={() => {
                    toast.info("Tải xuống bản báo cáo đang được chuẩn bị");
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Tải báo cáo
                </Button>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
