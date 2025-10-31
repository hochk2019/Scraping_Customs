import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { ScrapingProgress } from "./ScrapingProgress";

interface ScraperFormProps {
  onSuccess?: (data: any) => void;
}

export function ScraperForm({ onSuccess }: ScraperFormProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">(
    ""
  );
  const [showProgress, setShowProgress] = useState(false);

  const scrapeByDateRangeMutation = trpc.advancedScraper.scrapeByDateRange.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setShowProgress(true);

    try {
      // Validate dates
      if (!fromDate || !toDate) {
        setMessage("Vui lòng nhập khoảng thời gian");
        setMessageType("error");
        setIsLoading(false);
        return;
      }

      // Convert date format from yyyy-mm-dd to dd/mm/yyyy
      const fromDateFormatted = fromDate.split("-").reverse().join("/");
      const toDateFormatted = toDate.split("-").reverse().join("/");

      console.log(
        `[Form] Bắt đầu scraping từ ${fromDateFormatted} đến ${toDateFormatted}`
      );

      const result = await scrapeByDateRangeMutation.mutateAsync({
        fromDate: fromDateFormatted,
        toDate: toDateFormatted,
        maxPages,
        delay: 1000,
      });

      if (result.success) {
        setMessage(
          `✓ ${result.message} (${result.count} tài liệu)`
        );
        setMessageType("success");
        onSuccess?.(result.data);
      } else {
        setMessage(`✗ ${result.message}`);
        setMessageType("error");
      }
    } catch (error) {
      console.error("[Form] Lỗi:", error);
      setMessage(
        `Lỗi: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>🔍 Scraper Trang Hải Quan</CardTitle>
          <CardDescription>
            Nhập khoảng thời gian để thu thập dữ liệu phân tích phân loại từ trang
            Hải quan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Từ ngày */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Từ ngày</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Đến ngày */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Đến ngày</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>

          {/* Số trang tối đa */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Số trang tối đa</label>
            <Input
              type="number"
              min="1"
              max="50"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Nút submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang scraping...
              </>
            ) : (
              "Bắt đầu Scraping"
            )}
          </Button>

          {/* Thông báo */}
          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                messageType === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="text-sm">{message}</span>
            </div>
          )}

          {/* Thông tin hướng dẫn */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            <p className="font-medium mb-2">ℹ️ Hướng dẫn sử dụng:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Nhập khoảng thời gian để thu thập dữ liệu</li>
              <li>Scraper sẽ duyệt tất cả các trang kết quả</li>
              <li>Trích xuất chi tiết từ mỗi tài liệu</li>
              <li>Tải PDF và xử lý OCR</li>
              <li>Lưu tất cả dữ liệu vào database</li>
            </ul>
          </div>
          </form>
        </CardContent>
      </Card>

      {/* Scraping Progress Modal */}
      <ScrapingProgress
        isVisible={showProgress}
        onClose={() => setShowProgress(false)}
      />
    </>
  );
}
