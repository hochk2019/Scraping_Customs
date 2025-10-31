import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, MessageSquare, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Feedback {
  id: number;
  feedbackType: string;
  title: string;
  description: string;
  rating?: number;
  status: string;
  adminResponse?: string;
  createdAt: Date;
}

export default function FeedbackAdmin() {
  const { user } = useAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="text-red-500" />
                Truy Cập Bị Từ Chối
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Bạn không có quyền truy cập trang này. Chỉ quản trị viên mới có thể xem.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { data: feedbackData, isLoading } = trpc.feedback.list.useQuery({
    limit: 50,
    offset: 0,
  });

  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      setSelectedFeedback(null);
      setAdminResponse("");
      setNewStatus("");
      setIsUpdating(false);
      alert("Cập nhật thành công!");
    },
    onError: (error) => {
      setIsUpdating(false);
      alert("Lỗi: " + error.message);
    },
  });

  const handleUpdateStatus = async () => {
    if (!selectedFeedback || !newStatus) {
      alert("Vui lòng chọn trạng thái");
      return;
    }

    setIsUpdating(true);
    updateStatusMutation.mutate({
      feedbackId: selectedFeedback.id,
      status: newStatus as any,
      adminResponse: adminResponse || undefined,
    });
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case "bug_report":
        return "🐛";
      case "improvement_suggestion":
        return "💡";
      case "data_correction":
        return "✏️";
      default:
        return "📝";
    }
  };

  const getFeedbackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bug_report: "Báo cáo lỗi",
      improvement_suggestion: "Đề xuất cải tiến",
      data_correction: "Chỉnh sửa dữ liệu",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Mở",
      in_progress: "Đang xử lý",
      resolved: "Đã giải quyết",
      closed: "Đã đóng",
    };
    return labels[status] || status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Phản Hồi</h1>
          <p className="text-gray-600 mt-2">
            Xem và quản lý tất cả các phản hồi từ người dùng
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p>Đang tải...</p>
            </CardContent>
          </Card>
        ) : feedbackData?.feedbacks && feedbackData.feedbacks.length > 0 ? (
          <div className="space-y-4">
            {feedbackData.feedbacks.map((feedback: any) => (
              <Card key={feedback.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {getFeedbackTypeIcon(feedback.feedbackType)}
                        </span>
                        <h3 className="text-lg font-semibold">{feedback.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-3">{feedback.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span>{getFeedbackTypeLabel(feedback.feedbackType)}</span>
                        {feedback.rating && (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < feedback.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        )}
                        <span>
                          {new Date(feedback.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      {feedback.adminResponse && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-3">
                          <p className="text-sm font-semibold text-blue-900">Phan Hoi Tu Admin:</p>
                          <p className="text-sm text-blue-800 mt-1">{feedback.adminResponse}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(feedback.status)}>
                        {getStatusLabel(feedback.status)}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFeedback(feedback);
                          setNewStatus(feedback.status);
                          setAdminResponse(feedback.adminResponse || "");
                        }}
                      >
                        <MessageSquare size={16} className="mr-2" />
                        Phản Hồi
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">Không có phản hồi nào</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal cập nhật phản hồi */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cập Nhật Phản Hồi</DialogTitle>
            <DialogDescription>
              {selectedFeedback?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Trạng thái */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng Thái</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Mở</SelectItem>
                  <SelectItem value="in_progress">Đang xử lý</SelectItem>
                  <SelectItem value="resolved">Đã giải quyết</SelectItem>
                  <SelectItem value="closed">Đã đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phản hồi từ admin */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phản Hồi Từ Admin</label>
              <Textarea
                placeholder="Nhập phản hồi của bạn cho người dùng"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={5}
                disabled={isUpdating}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">Phản hồi này sẽ được gửi cho người dùng</p>
            </div>

            {/* Nút cập nhật */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedFeedback(null)}
                disabled={isUpdating}
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? "Đang cập nhật..." : "Cập Nhật"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
