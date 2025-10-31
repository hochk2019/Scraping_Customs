import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadProgressStep {
  name: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  progress: number;
  description?: string;
  error?: string;
}

interface UploadProgressBarProps {
  fileName?: string;
  isUploading?: boolean;
  steps?: UploadProgressStep[];
  totalProgress?: number;
  estimatedTime?: number;
}

export default function UploadProgressBar({
  fileName = "document.pdf",
  isUploading = false,
  steps,
  totalProgress = 0,
  estimatedTime = 30,
}: UploadProgressBarProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(estimatedTime);

  // Default steps if not provided
  const defaultSteps: UploadProgressStep[] = [
    {
      name: "Tải lên tệp",
      status: totalProgress >= 20 ? (totalProgress >= 30 ? "completed" : "in-progress") : "pending",
      progress: Math.min(totalProgress, 30),
      description: "Tải tệp lên server",
    },
    {
      name: "Xác thực tệp",
      status: totalProgress >= 40 ? (totalProgress >= 50 ? "completed" : "in-progress") : "pending",
      progress: Math.max(0, Math.min(totalProgress - 30, 20)),
      description: "Kiểm tra định dạng và kích thước",
    },
    {
      name: "Xử lý tệp",
      status: totalProgress >= 60 ? (totalProgress >= 70 ? "completed" : "in-progress") : "pending",
      progress: Math.max(0, Math.min(totalProgress - 50, 20)),
      description: "Parse và trích xuất dữ liệu",
    },
    {
      name: "Phân tích OCR",
      status: totalProgress >= 80 ? (totalProgress >= 90 ? "completed" : "in-progress") : "pending",
      progress: Math.max(0, Math.min(totalProgress - 70, 20)),
      description: "Trích xuất HS code và tên hàng",
    },
    {
      name: "Phân tích AI",
      status: totalProgress >= 100 ? "completed" : totalProgress >= 90 ? "in-progress" : "pending",
      progress: Math.max(0, Math.min(totalProgress - 90, 10)),
      description: "Gợi ý HS code bằng LLM",
    },
  ];

  const displaySteps = steps || defaultSteps;

  // Update elapsed and remaining time
  useEffect(() => {
    if (!isUploading) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isUploading]);

  // Reset timers when upload starts
  useEffect(() => {
    if (isUploading) {
      setElapsedTime(0);
      setRemainingTime(estimatedTime);
    }
  }, [isUploading, estimatedTime]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-500" size={20} />;
      case "in-progress":
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      case "failed":
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <FileText className="text-gray-400" size={20} />;
    }
  };

  const getStepBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">Đang xử lý</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Lỗi</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Chờ</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {isUploading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="text-blue-600 animate-pulse" size={20} />
                Đang Tải Lên
              </CardTitle>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-medium">Thời gian:</span> {formatTime(elapsedTime)}
                </div>
                <div>
                  <span className="font-medium">Còn lại:</span> {formatTime(remainingTime)}
                </div>
              </div>
            </div>
            <CardDescription className="text-blue-700">{fileName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tiến độ tổng thể</span>
                <span className="text-sm font-semibold text-blue-600">{totalProgress}%</span>
              </div>
              <Progress value={totalProgress} className="h-3" />
            </div>

            {/* Step-by-step Progress */}
            <div className="space-y-3">
              {displaySteps.map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStepIcon(step.status)}
                      <div>
                        <p className="font-medium text-sm">{step.name}</p>
                        {step.description && (
                          <p className="text-xs text-gray-600">{step.description}</p>
                        )}
                      </div>
                    </div>
                    {getStepBadge(step.status)}
                  </div>

                  {/* Step Progress Bar */}
                  {step.status !== "pending" && (
                    <div className="ml-8">
                      <Progress value={step.progress} className="h-2" />
                    </div>
                  )}

                  {/* Error Message */}
                  {step.status === "failed" && step.error && (
                    <div className="ml-8 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                      {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
