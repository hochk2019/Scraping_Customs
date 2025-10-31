import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Clock, Trash2, Eye, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToCSV } from "@/lib/csv-export";

interface ScrapingLog {
  id: number;
  userId: number;
  scrapeType: "manual" | "scheduled";
  startTime: string | Date;
  endTime: string | Date | null;
  documentsFound: number;
  documentsDownloaded: number;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
  createdAt: string | Date;
}

export function ScrapingHistoryAdmin() {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"running" | "completed" | "failed" | "">(
    ""
  );
  const [typeFilter, setTypeFilter] = useState<"manual" | "scheduled" | "">(
    ""
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch scraping logs
  const { data: logsData, isLoading } = trpc.scrapingHistory.list.useQuery({
    limit,
    offset,
    status: statusFilter as any,
    scrapeType: typeFilter as any,
  });

  // Delete mutation
  const deleteMutation = trpc.scrapingHistory.delete.useMutation();

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lịch sử scraping này?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error("Failed to delete:", error);
        alert("Xóa thất bại");
      }
    }
  };

  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set<number>((logsData?.logs || []).map((log: ScrapingLog) => log.id));
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  const handleExportCSV = () => {
    if (selectedIds.size === 0) {
      alert("Vui long chon it nhat mot muc de xuat");
      return;
    }

    const selectedLogs = (logsData?.logs || []).filter((log: ScrapingLog) =>
      selectedIds.has(log.id)
    );

    const headers = ["ID", "Loai", "Trang thai", "Thoi gian bat dau", "Thoi gian ket thuc", "Tai lieu tim", "Tai lieu tai", "Loi"];

    const rows = selectedLogs.map((log: ScrapingLog) => [
      log.id,
      log.scrapeType === "manual" ? "Thu cong" : "Tu dong",
      log.status === "completed" ? "Thanh cong" : log.status === "failed" ? "That bai" : "Dang chay",
      new Date(log.startTime).toLocaleString("vi-VN"),
      log.endTime ? new Date(log.endTime).toLocaleString("vi-VN") : "N/A",
      log.documentsFound,
      log.documentsDownloaded,
      log.errorMessage || "N/A",
    ]);

    exportToCSV({
      filename: `scraping_history_${new Date().getTime()}.csv`,
      headers,
      rows: rows as any,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Thành công</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Thất bại</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800">Đang chạy</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "manual":
        return <Badge className="bg-purple-100 text-purple-800">Thủ công</Badge>;
      case "scheduled":
        return <Badge className="bg-orange-100 text-orange-800">Tự động</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("vi-VN");
  };

  const calculateDuration = (startTime: string | Date, endTime: string | Date | null) => {
    if (!endTime) return "Đang chạy";
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Lịch Sử Scraping</h2>
        <p className="text-gray-600 mt-2">Quản lý và theo dõi tất cả các lần scraping</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ Lọc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả</SelectItem>
                  <SelectItem value="running">Dang chạy</SelectItem>
                  <SelectItem value="completed">Thành công</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Loại</label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả</SelectItem>
                  <SelectItem value="manual">Thủ công</SelectItem>
                  <SelectItem value="scheduled">Tự động</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items per page */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Số mục mỗi trang</label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleExportCSV}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Xuat CSV ({selectedIds.size} muc)
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                Bo chon tat ca
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Danh Sách Scraping ({logsData?.total || 0} tổng cộng)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : logsData?.logs && logsData.logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian bắt đầu</TableHead>
                    <TableHead>Thời gian chạy</TableHead>
                    <TableHead>Tài liệu tìm thấy</TableHead>
                    <TableHead>Tài liệu tải</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.logs.map((log: ScrapingLog) => (
                    <TableRow key={log.id} className={selectedIds.has(log.id) ? "bg-blue-50" : ""}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedIds.has(log.id)}
                          onCheckedChange={() => handleSelectRow(log.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">#{log.id}</TableCell>
                      <TableCell>{getTypeBadge(log.scrapeType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(log.startTime)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {calculateDuration(log.startTime, log.endTime)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.documentsFound}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.documentsDownloaded}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => console.log("View detail:", log.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(log.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Không có dữ liệu</p>
            </div>
          )}

          {/* Pagination */}
          {logsData && logsData.total > limit && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Hiển thị {offset + 1} - {Math.min(offset + limit, logsData.total)} của{" "}
                {logsData.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= logsData.total}
                >
                  Tiếp
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
