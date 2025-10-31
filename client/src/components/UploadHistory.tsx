import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, FileText, CheckCircle, AlertCircle, Clock, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
}

export default function UploadHistory() {
  const [selectedFile, setSelectedFile] = useState<UploadedFileData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "status" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Mock data - trong thực tế sẽ lấy từ API
  const uploadHistory: UploadedFileData[] = [
    {
      id: 1,
      originalName: "customs_data_2025_10_30.xlsx",
      fileType: "excel",
      fileSize: 2048000,
      status: "completed",
      extractedCount: 150,
      createdAt: new Date("2025-10-30T10:30:00"),
      updatedAt: new Date("2025-10-30T10:35:00"),
      aiAnalysis: {
        productNames: ["Điện thoại", "Máy tính", "Tablet"],
        hsCodes: ["8471", "8517", "8528"],
        suggestions: [
          {
            productName: "Điện thoại",
            suggestions: [
              { hsCode: "8517", confidence: 0.95, description: "Điện thoại di động" },
              { hsCode: "8471", confidence: 0.7, description: "Máy tính điện tử" },
            ],
          },
        ],
        confidence: 92,
      },
    },
    {
      id: 2,
      originalName: "invoice_20251029.pdf",
      fileType: "pdf",
      fileSize: 512000,
      status: "completed",
      extractedCount: 45,
      createdAt: new Date("2025-10-29T14:20:00"),
      updatedAt: new Date("2025-10-29T14:25:00"),
      aiAnalysis: {
        productNames: ["Quần áo", "Giày dép"],
        hsCodes: ["6204", "6405"],
        suggestions: [
          {
            productName: "Quần áo",
            suggestions: [
              { hsCode: "6204", confidence: 0.88, description: "Quần áo nữ" },
            ],
          },
        ],
        confidence: 88,
      },
    },
    {
      id: 3,
      originalName: "products_list.csv",
      fileType: "csv",
      fileSize: 256000,
      status: "processing",
      extractedCount: 0,
      createdAt: new Date("2025-10-30T15:45:00"),
      updatedAt: new Date("2025-10-30T15:50:00"),
    },
    {
      id: 4,
      originalName: "document_error.json",
      fileType: "json",
      fileSize: 128000,
      status: "failed",
      extractedCount: 0,
      notes: "Định dạng JSON không hợp lệ",
      createdAt: new Date("2025-10-28T09:15:00"),
      updatedAt: new Date("2025-10-28T09:16:00"),
    },
  ];

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
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("vi-VN");
  };

  const sortedHistory = [...uploadHistory].sort((a, b) => {
    let compareValue = 0;

    if (sortBy === "date") {
      compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "status") {
      compareValue = a.status.localeCompare(b.status);
    } else if (sortBy === "size") {
      compareValue = a.fileSize - b.fileSize;
    }

    return sortOrder === "asc" ? compareValue : -compareValue;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={20} />
            Lịch Sử Tệp Tải Lên
          </CardTitle>
          <CardDescription>
            Xem lại các tệp đã tải lên và kết quả phân tích AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sort Controls */}
          <div className="flex gap-2 items-center">
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
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {/* Upload History Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Tên Tệp</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kích Thước</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead>Dữ Liệu Trích Xuất</TableHead>
                  <TableHead>Ngày Tải Lên</TableHead>
                  <TableHead>Hành Động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.map((file) => (
                  <TableRow key={file.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFileIcon(file.fileType)}</span>
                        <span className="truncate max-w-xs">{file.originalName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="uppercase text-sm">
                      {file.fileType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatFileSize(file.fileSize)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(file.status)}
                        {getStatusBadge(file.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {file.status === "completed" ? (
                        <div className="space-y-1">
                          <p className="font-semibold">{file.extractedCount} bản ghi</p>
                          {file.aiAnalysis && (
                            <p className="text-xs text-gray-600">
                              {file.aiAnalysis.hsCodes.length} HS code
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(file.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(file);
                          setShowDetails(true);
                        }}
                      >
                        Chi Tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {sortedHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText size={40} className="mx-auto mb-2 opacity-50" />
              <p>Chưa có tệp nào được tải lên</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              Chi Tiết Tệp
            </DialogTitle>
            <DialogDescription>
              {selectedFile?.originalName}
            </DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Loại Tệp</p>
                  <p className="text-lg font-semibold">
                    {getFileIcon(selectedFile.fileType)} {selectedFile.fileType.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Kích Thước</p>
                  <p className="text-lg font-semibold">
                    {formatFileSize(selectedFile.fileSize)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Trạng Thái</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedFile.status)}
                    {getStatusBadge(selectedFile.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ngày Tải Lên</p>
                  <p className="text-lg font-semibold">
                    {formatDate(selectedFile.createdAt)}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {selectedFile.status === "failed" && selectedFile.notes && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Lỗi:</p>
                  <p className="text-sm text-red-700">{selectedFile.notes}</p>
                </div>
              )}

              {/* AI Analysis Results */}
              {selectedFile.status === "completed" && selectedFile.aiAnalysis && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Kết Quả Phân Tích AI</h3>

                  {/* Confidence Score */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Độ Tin Cậy Tổng Thể</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${selectedFile.aiAnalysis.confidence}%` }}
                          />
                        </div>
                        <span className="font-semibold text-blue-600">
                          {selectedFile.aiAnalysis.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* HS Codes */}
                  {selectedFile.aiAnalysis.hsCodes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Mã HS Code ({selectedFile.aiAnalysis.hsCodes.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFile.aiAnalysis.hsCodes.map((code, idx) => (
                          <Badge key={idx} variant="secondary">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Names */}
                  {selectedFile.aiAnalysis.productNames.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Tên Hàng ({selectedFile.aiAnalysis.productNames.length})</h4>
                      <div className="space-y-1">
                        {selectedFile.aiAnalysis.productNames.map((name, idx) => (
                          <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {selectedFile.aiAnalysis.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Gợi Ý HS Code</h4>
                      <div className="space-y-3">
                        {selectedFile.aiAnalysis.suggestions.map((item, idx) => (
                          <div key={idx} className="border rounded-lg p-3 bg-blue-50">
                            <p className="font-medium text-sm mb-2">{item.productName}</p>
                            <div className="space-y-2">
                              {item.suggestions.map((suggestion, sidx) => (
                                <div key={sidx} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div>
                                    <p className="font-semibold text-blue-600">{suggestion.hsCode}</p>
                                    <p className="text-xs text-gray-600">{suggestion.description}</p>
                                  </div>
                                  <Badge className={
                                    suggestion.confidence >= 0.8
                                      ? "bg-green-100 text-green-800"
                                      : suggestion.confidence >= 0.6
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-orange-100 text-orange-800"
                                  }>
                                    {Math.round(suggestion.confidence * 100)}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <Button
                onClick={() => setShowDetails(false)}
                className="w-full"
              >
                Đóng
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
