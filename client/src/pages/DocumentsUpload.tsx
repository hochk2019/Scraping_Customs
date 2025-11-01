import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DocumentsUpload() {
  const [formData, setFormData] = useState({
    documentNumber: "",
    title: "",
    documentType: "",
    issuingAgency: "",
    issueDate: "",
    signer: "",
    fileUrl: "",
    fileName: "",
    summary: "",
    detailUrl: "",
    notes: "",
    tags: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch documents
  const { data: documentsData, refetch } = trpc.documents.list.useQuery({ limit: 20 });
  const createDocument = trpc.documents.create.useMutation();
  const documents = documentsData?.documents || [];
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        documentNumber: formData.documentNumber,
        title: formData.title,
        documentType: formData.documentType || undefined,
        issuingAgency: formData.issuingAgency || undefined,
        issueDate: formData.issueDate || undefined,
        signer: formData.signer || undefined,
        fileUrl: formData.fileUrl || undefined,
        fileName: formData.fileName || undefined,
        summary: formData.summary || undefined,
        detailUrl: formData.detailUrl || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags || undefined,
      };

      await createDocument.mutateAsync(payload);
      toast.success("Đã lưu tài liệu công văn mới");

      setFormData({
        documentNumber: "",
        title: "",
        documentType: "",
        issuingAgency: "",
        issueDate: "",
        signer: "",
        fileUrl: "",
        fileName: "",
        summary: "",
        detailUrl: "",
        notes: "",
        tags: "",
      });

      await refetch();
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("Không thể lưu tài liệu, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "downloaded") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (status === "failed") {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <FileText className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "downloaded") {
      return <Badge className="bg-green-100 text-green-800">Đã tải</Badge>;
    } else if (status === "failed") {
      return <Badge className="bg-red-100 text-red-800">Lỗi</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Chờ xử lý</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Đăng Tài Liệu Công Văn</h1>
          <p className="text-gray-600 mt-2">
            Cập nhật các công văn mới từ Cục Hải quan và kết quả phân tích phân loại. Sau khi lưu,
            tài liệu sẽ xuất hiện ở trang "Công văn mới" và thanh bên tổng hợp để người dùng tra cứu nhanh.
          </p>
        </div>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Thêm Tài Liệu Mới
            </CardTitle>
            <CardDescription>Điền thông tin chi tiết về tài liệu công văn</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Document Number & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Số Hiệu Văn Bản *</label>
                  <Input
                    name="documentNumber"
                    placeholder="ví dụ: 29001/TB-CHQ"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Loại Văn Bản</label>
                  <Input
                    name="documentType"
                    placeholder="ví dụ: Thông báo, Công văn"
                    value={formData.documentType}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Row 2: Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Tiêu Đề *</label>
                <Input
                  name="title"
                  placeholder="Tiêu đề/Trích yêu nội dung"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Row 3: Agency & Issue Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cơ Quan Ban Hành</label>
                  <Input
                    name="issuingAgency"
                    placeholder="ví dụ: Cục Hải quan"
                    value={formData.issuingAgency}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ngày Ban Hành</label>
                  <Input
                    name="issueDate"
                    placeholder="ví dụ: 2025-01-15"
                    value={formData.issueDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Row 4: Signer & File Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Người Ký</label>
                  <Input
                    name="signer"
                    placeholder="Tên người ký"
                    value={formData.signer}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tên Tệp</label>
                  <Input
                    name="fileName"
                    placeholder="ví dụ: document.pdf"
                    value={formData.fileName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Row 5: URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Liên Kết Tệp PDF</label>
                  <Input
                    name="fileUrl"
                    placeholder="https://..."
                    value={formData.fileUrl}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Liên Kết Chi Tiết</label>
                  <Input
                    name="detailUrl"
                    placeholder="https://..."
                    value={formData.detailUrl}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Row 6: Summary */}
              <div>
                <label className="block text-sm font-medium mb-2">Tóm Tắt Nội Dung</label>
                <Textarea
                  name="summary"
                  placeholder="Mô tả tóm tắt nội dung tài liệu"
                  value={formData.summary}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              {/* Row 7: Notes & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ghi Chú</label>
                  <Input
                    name="notes"
                    placeholder="Ghi chú thêm"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Thẻ (Tags)</label>
                  <Input
                    name="tags"
                    placeholder="ví dụ: phân loại,hàng hóa"
                    value={formData.tags}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? "Đang lưu..." : "Lưu Tài Liệu"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({
                      documentNumber: "",
                      title: "",
                      documentType: "",
                      issuingAgency: "",
                      issueDate: "",
                      signer: "",
                      fileUrl: "",
                      fileName: "",
                      summary: "",
                      detailUrl: "",
                      notes: "",
                      tags: "",
                    })
                  }
                >
                  Xóa Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Tài Liệu Đã Đăng</CardTitle>
            <CardDescription>Danh sách các tài liệu công văn được cập nhật gần đây</CardDescription>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số Hiệu</TableHead>
                      <TableHead>Tiêu Đề</TableHead>
                      <TableHead>Cơ Quan</TableHead>
                      <TableHead>Ngày Ban Hành</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>Ngày Tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono font-semibold text-blue-600">
                          {doc.documentNumber}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{doc.title}</TableCell>
                        <TableCell>{doc.issuingAgency || "N/A"}</TableCell>
                        <TableCell>{doc.issueDate || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status)}
                            {getStatusBadge(doc.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có tài liệu nào được đăng</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
