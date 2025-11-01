import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Building2, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RecentDocumentsSidebarProps {
  variant?: "sidebar" | "panel" | "table";
  className?: string;
  limit?: number;
  pageSize?: number;
}

export default function RecentDocumentsSidebar({
  variant = "sidebar",
  className,
  limit = 5,
  pageSize = 10,
}: RecentDocumentsSidebarProps = {}) {
  // Fetch recent documents
  const queryLimit = variant === "table" ? Math.max(limit, 60) : limit;
  const { data: documentsData } = trpc.documents.list.useQuery({ limit: queryLimit });
  const documents = documentsData?.documents || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("tat-ca");
  const [typeFilter, setTypeFilter] = useState("tat-ca");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);

  const getStatusBadge = (status: string) => {
    if (status === "downloaded") {
      return <Badge className="bg-green-100 text-green-800 text-xs">Đã tải</Badge>;
    } else if (status === "failed") {
      return <Badge className="bg-red-100 text-red-800 text-xs">Lỗi</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Chờ xử lý</Badge>;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const normalizeText = (text: string | null | undefined) =>
    (text ?? "")
      .toString()
      .normalize("NFC")
      .toLowerCase();

  const filterOptions = useMemo(() => {
    const agencies = new Set<string>();
    const types = new Set<string>();
    documents.forEach((doc: any) => {
      if (doc.issuingAgency) {
        agencies.add(doc.issuingAgency);
      }
      if (doc.documentType) {
        types.add(doc.documentType);
      }
    });
    return {
      agencies: Array.from(agencies).sort(),
      types: Array.from(types).sort(),
    };
  }, [documents]);

  const documentIdsKey = useMemo(
    () =>
      documents
        .map((doc: any) => doc.id ?? doc.documentNumber ?? "")
        .join("|"),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    return documents.filter((doc: any) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(doc.documentNumber).includes(normalizedSearch) ||
        normalizeText(doc.title).includes(normalizedSearch) ||
        normalizeText(doc.summary).includes(normalizedSearch);

      const matchesAgency =
        agencyFilter === "tat-ca" || normalizeText(doc.issuingAgency) === normalizeText(agencyFilter);

      const matchesType =
        typeFilter === "tat-ca" || normalizeText(doc.documentType) === normalizeText(typeFilter);

      const issueDate = doc.issueDate ? new Date(doc.issueDate) : null;
      const matchesStart = startDate ? (issueDate ? issueDate >= new Date(startDate) : false) : true;
      const matchesEnd = endDate ? (issueDate ? issueDate <= new Date(endDate) : false) : true;

      return matchesSearch && matchesAgency && matchesType && matchesStart && matchesEnd;
    });
  }, [agencyFilter, documents, endDate, searchTerm, startDate, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [documentIdsKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearchTerm("");
    setAgencyFilter("tat-ca");
    setTypeFilter("tat-ca");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(Math.min(Math.max(newPage, 1), totalPages));
  };

  if (variant === "table") {
    return (
      <Card className={cn("border shadow-sm", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Bảng công văn mới
          </CardTitle>
          <CardDescription>
            Lọc nhanh theo cơ quan, loại văn bản và thời gian ban hành
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              Bộ lọc hiển thị
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="search-document">Từ khóa</Label>
                <Input
                  id="search-document"
                  placeholder="Số công văn hoặc trích yếu"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-agency">Cơ quan ban hành</Label>
                <Select
                  value={agencyFilter}
                  onValueChange={(value) => {
                    setAgencyFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="filter-agency">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tat-ca">Tất cả</SelectItem>
                    {filterOptions.agencies.map((agency) => (
                      <SelectItem key={agency} value={agency}>
                        {agency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-type">Loại văn bản</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="filter-type">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tat-ca">Tất cả</SelectItem>
                    {filterOptions.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="start-date">Từ ngày</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-date">Đến ngày</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">
                Đang hiển thị {paginatedDocuments.length} / {filteredDocuments.length} công văn phù hợp
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Đặt lại bộ lọc
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Số hiệu</TableHead>
                  <TableHead>Trích yếu</TableHead>
                  <TableHead className="w-[180px]">Cơ quan</TableHead>
                  <TableHead className="w-[110px]">Ngày ban hành</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[140px] text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.length > 0 ? (
                  paginatedDocuments.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs font-semibold text-blue-700">
                        {doc.documentNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-900 line-clamp-2">
                          {doc.title || "Không có trích yếu"}
                        </p>
                        {doc.summary ? (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{doc.summary}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {doc.issuingAgency || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {doc.issueDate ? formatDate(doc.issueDate) : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right text-xs">
                        <div className="flex justify-end gap-2">
                          {doc.fileUrl && (
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                PDF
                              </a>
                            </Button>
                          )}
                          {doc.detailUrl && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                              <a href={doc.detailUrl} target="_blank" rel="noopener noreferrer">
                                Chi tiết
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      Không tìm thấy công văn phù hợp bộ lọc
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={cn(currentPage === 1 ? "pointer-events-none opacity-50" : "")}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        handlePageChange(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={cn(currentPage === totalPages ? "pointer-events-none opacity-50" : "")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "w-full",
        variant === "sidebar" ? "lg:w-80" : "",
        className
      )}
    >
      <Card
        className={cn(
          "h-full",
          variant === "sidebar" ? "sticky top-20" : "border shadow-sm"
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Tài Liệu Mới
          </CardTitle>
          <CardDescription>Công văn cập nhật gần đây</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents && documents.length > 0 ? (
            <>
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Document Number & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-blue-600 flex-1">
                      {doc.documentNumber}
                    </span>
                    {getStatusBadge(doc.status)}
                  </div>

                  {/* Title */}
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                    {doc.title}
                  </p>

                  {/* Agency & Date */}
                  <div className="space-y-1 mb-3">
                    {doc.issuingAgency && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Building2 className="h-3 w-3" />
                        <span className="line-clamp-1">{doc.issuingAgency}</span>
                      </div>
                    )}
                    {doc.issueDate && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(doc.issueDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {doc.summary && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {doc.summary}
                    </p>
                  )}

                  {/* Links */}
                  <div className="flex gap-2">
                    {doc.fileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        asChild
                      >
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Tệp PDF
                        </a>
                      </Button>
                    )}
                    {doc.detailUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        asChild
                      >
                        <a href={doc.detailUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Chi tiết
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* View All Button */}
              <Button
                variant="outline"
                className="w-full mt-4"
                asChild
              >
                <a href="/documents-upload">Xem Tất Cả</a>
              </Button>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có tài liệu nào</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
