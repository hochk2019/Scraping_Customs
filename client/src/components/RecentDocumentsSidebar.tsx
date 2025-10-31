import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecentDocumentsSidebar() {
  // Fetch recent documents
  const { data: documentsData } = trpc.documents.list.useQuery({ limit: 5 });
  const documents = documentsData?.documents || [];

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

  return (
    <div className="w-full lg:w-80">
      <Card className="sticky top-20">
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
