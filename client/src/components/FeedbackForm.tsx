import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface FeedbackFormProps {
  uploadedFileId?: number;
  onSuccess?: () => void;
}

export default function FeedbackForm({ uploadedFileId, onSuccess }: FeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState<"bug_report" | "improvement_suggestion" | "data_correction">("bug_report");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFeedbackMutation = trpc.feedback.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setRating(5);
      setFeedbackType("bug_report");
      setIsSubmitting(false);
      alert("Cảm ơn bạn đã gửi phản hồi!");
      onSuccess?.();
    },
    onError: (error) => {
      setIsSubmitting(false);
      alert("Lỗi: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      alert("Vui lòng điền đầy đủ tiêu đề và mô tả");
      return;
    }

    setIsSubmitting(true);
    createFeedbackMutation.mutate({
      feedbackType,
      title,
      description,
      uploadedFileId,
      rating,
    });
  };

  const getFeedbackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bug_report: "Báo cáo lỗi",
      improvement_suggestion: "Đề xuất cải tiến",
      data_correction: "Chỉnh sửa dữ liệu",
    };
    return labels[type] || type;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gửi Phản Hồi</CardTitle>
        <CardDescription>
          Giúp chúng tôi cải thiện bằng cách báo cáo lỗi hoặc đề xuất cải tiến
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loại phản hồi */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Loại Phản Hồi</Label>
            <Select value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Chọn loại phản hồi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug_report">Báo cáo lỗi</SelectItem>
                <SelectItem value="improvement_suggestion">Đề xuất cải tiến</SelectItem>
                <SelectItem value="data_correction">Chỉnh sửa dữ liệu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tiêu đề */}
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu Đề</Label>
            <Input
              id="title"
              placeholder="Nhập tiêu đề phản hồi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Mô tả chi tiết */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô Tả Chi Tiết</Label>
            <Textarea
              id="description"
              placeholder="Nhập mô tả chi tiết về phản hồi của bạn"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={isSubmitting}
            />
          </div>

          {/* Đánh giá */}
          <div className="space-y-2">
            <Label>Đánh Giá (Sao)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                  disabled={isSubmitting}
                >
                  <Star
                    size={24}
                    className={`${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Nút gửi */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang gửi..." : "Gửi Phản Hồi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
