import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import ScrapeProgressModal from "@/components/ScrapeProgressModal";
import PDFPreviewModal from "@/components/PDFPreviewModal";
import FileUploadManager from "@/components/FileUploadManager";
import UploadHistory from "@/components/UploadHistory";
import OcrDashboard from "@/components/OcrDashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download, RefreshCw, Settings } from "lucide-react";

export default function Dashboard() {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(
    new Set()
  );
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'date' | 'number' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; documentNumber: string; title: string; fileUrl: string }>({ isOpen: false, documentNumber: '', title: '', fileUrl: '' });
  const [scraperMessage, setScraperMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scrapeStartTime, setScrapeStartTime] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [documentsFound, setDocumentsFound] = useState(0);
  const [documentsProcessed, setDocumentsProcessed] = useState(0);
  const [isScraperCompleted, setIsScraperCompleted] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<Array<{ documentNumber: string; title: string; issueDate: string }>>([]);

  // Lấy danh sách tài liệu
  const { data: documentsData, isLoading, refetch } = trpc.documents.list.useQuery({
    limit: 20,
    offset: 0,
  });

  // Chạy scraper
  const scrapeManual = trpc.scraper.runManual.useMutation({
    onSuccess: (data) => {
      setIsScraperCompleted(true);
      setScraperMessage({
        type: 'success',
        text: `Thu thập thành công! Tập hợp ${data.count} tài liệu mới`
      });
      setTimeout(() => {
        setIsScraperRunning(false);
        setIsScraperCompleted(false);
        setCurrentPage(0);
        setTotalPages(0);
        setDocumentsFound(0);
        setDocumentsProcessed(0);
        setScrapeStartTime(null);
        setRecentDocuments([]);
        setScraperMessage(null);
        refetch();
      }, 3000);
    },
    onError: (error) => {
      setIsScraperRunning(false);
      setCurrentPage(0);
      setTotalPages(0);
      setDocumentsFound(0);
      setDocumentsProcessed(0);
      setScrapeStartTime(null);
      setScraperMessage({
        type: 'error',
        text: `Lỗi: ${error.message}`
      });
      setTimeout(() => setScraperMessage(null), 5000);
    },
  });

  // Thêm/xóa khỏi export selection
  const addToExport = trpc.export.addSelection.useMutation();
  const removeFromExport = trpc.export.removeSelection.useMutation();

  const handleSelectDocument = (docId: number) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
      removeFromExport.mutate({ documentId: docId });
    } else {
      newSelected.add(docId);
      addToExport.mutate({ documentId: docId });
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === documentsData?.documents.length) {
      setSelectedDocuments(new Set());
    } else {
      const allIds = new Set(
        documentsData?.documents.map((doc: any) => doc.id) || []
      );
      setSelectedDocuments(allIds as any);
    }
  };

  const handleRunScraper = () => {
    setIsScraperRunning(true);
    setIsScraperCompleted(false);
    setScraperMessage(null);
    setScrapeStartTime(new Date());
    setCurrentPage(1);
    setTotalPages(10);
    setDocumentsFound(0);
    setDocumentsProcessed(0);
    setRecentDocuments([]);
    scrapeManual.mutate({ 
      maxPages: 10,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  const handleCancelScraper = () => {
    setIsScraperRunning(false);
    setIsScraperCompleted(false);
    setCurrentPage(0);
    setTotalPages(0);
    setDocumentsFound(0);
    setDocumentsProcessed(0);
    setScrapeStartTime(null);
    setRecentDocuments([]);
    setScraperMessage({
      type: 'error',
      text: 'Thu thap da bi huy'
    });
    setTimeout(() => setScraperMessage(null), 3000);
  };

  const filteredDocuments = (documentsData?.documents || []).filter((doc: any) => {
    const matchKeyword = !filterKeyword || 
      doc.documentNumber.toLowerCase().includes(filterKeyword.toLowerCase()) ||
      doc.title.toLowerCase().includes(filterKeyword.toLowerCase());
    
    const docDate = new Date(doc.issueDate);
    const startDateObj = filterStartDate ? new Date(filterStartDate) : null;
    const endDateObj = filterEndDate ? new Date(filterEndDate) : null;
    
    const matchDateRange = 
      (!startDateObj || docDate >= startDateObj) &&
      (!endDateObj || docDate <= endDateObj);
    
    return matchKeyword && matchDateRange;
  });

  const sortedDocuments = [...filteredDocuments].sort((a: any, b: any) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.issueDate).getTime();
      const dateB = new Date(b.issueDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'number') {
      return sortOrder === 'asc'
        ? a.documentNumber.localeCompare(b.documentNumber)
        : b.documentNumber.localeCompare(a.documentNumber);
    }
    return 0;
  });

  const totalFilteredPages = Math.ceil(sortedDocuments.length / itemsPerPage);
  const paginatedDocuments = sortedDocuments.slice(
    (currentPageNum - 1) * itemsPerPage,
    currentPageNum * itemsPerPage
  );

  const handleExportExcel = () => {
    if (selectedDocuments.size === 0) {
      setScraperMessage({ type: 'error', text: 'Vui long chon tai lieu' });
      return;
    }
    console.log('Export Excel:', selectedDocuments);
  };

  const handleExportJson = () => {
    if (selectedDocuments.size === 0) {
      setScraperMessage({ type: 'error', text: 'Vui long chon tai lieu' });
      return;
    }
    console.log('Export JSON:', selectedDocuments);
  };

  const handleExportCsv = () => {
    if (selectedDocuments.size === 0) {
      setScraperMessage({ type: 'error', text: 'Vui long chon tai lieu' });
      return;
    }
    console.log('Export CSV:', selectedDocuments);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "downloaded":
        return <Badge variant="default">Đã tải</Badge>;
      case "pending":
        return <Badge variant="secondary">Chờ xử lý</Badge>;
      case "failed":
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <ScrapeProgressModal
        isOpen={isScraperRunning || isScraperCompleted}
        currentPage={currentPage}
        totalPages={totalPages}
        documentsFound={documentsFound}
        documentsProcessed={documentsProcessed}
        startTime={scrapeStartTime}
        isCompleted={isScraperCompleted}
        recentDocuments={recentDocuments}
        onCancel={handleCancelScraper}
      />
      <div className="space-y-6">
        {/* Notification */}
        {scraperMessage && (
          <div className={`p-4 rounded-lg ${scraperMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {scraperMessage.text}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Quản lý tài liệu Hải quan</h1>
            <p className="text-gray-500 mt-2">
              Tổng số tài liệu: {documentsData?.total || 0}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded"
              placeholder="Từ ngày"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded"
              placeholder="Đến ngày"
            />
            <Button
              onClick={handleRunScraper}
              disabled={isScraperRunning}
              className="gap-2"
            >
              {isScraperRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isScraperRunning ? "Đang thu thập..." : "Chạy thu thập"}
            </Button>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Cấu hình
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tổng tài liệu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documentsData?.total || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Đã tải</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documentsData?.documents.filter((d: any) => d.status === "downloaded")
                  .length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documentsData?.documents.filter((d: any) => d.status === "pending")
                  .length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Actions */}
        {selectedDocuments.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedDocuments.size} tài liệu được chọn
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant="default" className="gap-2" onClick={handleExportExcel}>
                <Download className="w-4 h-4" />
                Xuất Excel
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportJson}>
                <Download className="w-4 h-4" />
                Xuất JSON
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportCsv}>
                <Download className="w-4 h-4" />
                Xuất CSV
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lọc kết quả</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Tìm kiếm theo số hiệu hoặc tiêu đề..."
                value={filterKeyword}
                onChange={(e) => {
                  setFilterKeyword(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="px-3 py-2 border rounded"
              />
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="px-3 py-2 border rounded"
                placeholder="Từ ngày"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="px-3 py-2 border rounded"
                placeholder="Đến ngày"
              />
              <Button
                onClick={() => {
                  setFilterKeyword("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setCurrentPageNum(1);
                }}
                variant="outline"
              >
                Xóa lọc
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Tìm thấy {filteredDocuments.length} tài liệu
              </p>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'date' | 'number' | 'none');
                    setCurrentPageNum(1);
                  }}
                  className="px-3 py-2 border rounded text-sm"
                >
                  <option value="none">Sắp xếp theo...</option>
                  <option value="date">Ngày ban hành</option>
                  <option value="number">Số hiệu</option>
                </select>
                {sortBy !== 'none' && (
                  <Button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    variant="outline"
                    size="sm"
                  >
                    {sortOrder === 'asc' ? '↑ Tăng' : '↓ Giảm'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách tài liệu</CardTitle>
            <CardDescription>
              Các tài liệu được thu thập từ trang Hải quan Việt Nam (Trang {currentPageNum}/{totalFilteredPages})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            paginatedDocuments.length > 0 &&
                            paginatedDocuments.every((doc: any) => selectedDocuments.has(doc.id))
                          }
                          onChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Số hiệu</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead>Cơ quan ban hành</TableHead>
                      <TableHead>Ngày ban hành</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocuments.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDocuments.has(doc.id)}
                            onChange={() => handleSelectDocument(doc.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {doc.documentNumber}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {doc.title}
                        </TableCell>
                        <TableCell>{doc.issuingAgency}</TableCell>
                        <TableCell>{doc.issueDate}</TableCell>
                        <TableCell>{getStatusBadge(doc.status || "")}</TableCell>
                        <TableCell className="text-right flex gap-1 justify-end">
                          {doc.fileUrl && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewModal({
                                  isOpen: true,
                                  documentNumber: doc.documentNumber,
                                  title: doc.title,
                                  fileUrl: doc.fileUrl
                                })}
                              >
                                Xem
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                              >
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Tai
                                </a>
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                {totalFilteredPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Hiển thị {(currentPageNum - 1) * itemsPerPage + 1} - {Math.min(currentPageNum * itemsPerPage, filteredDocuments.length)} trong {filteredDocuments.length} tài liệu
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
                      disabled={currentPageNum === 1}
                      variant="outline"
                      size="sm"
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalFilteredPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          onClick={() => setCurrentPageNum(page)}
                          variant={currentPageNum === page ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() => setCurrentPageNum(Math.min(totalFilteredPages, currentPageNum + 1))}
                      disabled={currentPageNum === totalFilteredPages}
                      variant="outline"
                      size="sm"
                    >
                      Tiếp
                    </Button>
                  </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* File Upload Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Tải Lên File</CardTitle>
          <CardDescription>
            Tải lên file để trích xuất dữ liệu (Excel, PDF, Word, JSON, CSV)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadManager />
        </CardContent>
      </Card>

      {/* Upload History */}
      <UploadHistory />

      {/* OCR Dashboard */}
      <div className="mt-8">
        <OcrDashboard />
      </div>
      
      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={previewModal.isOpen}
        documentNumber={previewModal.documentNumber}
        title={previewModal.title}
        fileUrl={previewModal.fileUrl}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
      />
    </DashboardLayout>
  );
}
