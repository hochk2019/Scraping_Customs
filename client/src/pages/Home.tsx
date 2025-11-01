import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, CalendarClock, FileText, History, UploadCloud, BookOpenCheck } from "lucide-react";
import HsCodeSearch from "@/components/HsCodeSearch";
import RecentDocumentsSidebar from "@/components/RecentDocumentsSidebar";
import MainLayout from "@/layouts/MainLayout";
import ScraperStatusCard from "@/components/ScraperStatusCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  const [, setLocation] = useLocation();

  const quickActions = [
    {
      label: "Tạo lịch thu thập",
      description: "Thiết lập cron tự động cho scraper",
      icon: CalendarClock,
      action: () => setLocation("/schedules"),
    },
    {
      label: "Tải lên tài liệu",
      description: "Đồng bộ file PDF và Excel vào hệ thống",
      icon: UploadCloud,
      action: () => setLocation("/documents-upload"),
    },
    {
      label: "Xem lịch sử OCR",
      description: "Theo dõi trạng thái xử lý gần đây",
      icon: History,
      action: () => setLocation("/dashboard"),
    },
    {
      label: "Gửi phản hồi",
      description: "Thu thập ý kiến nội bộ để ưu tiên tính năng",
      icon: FileText,
      action: () => setLocation("/feedback-admin"),
    },
    {
      label: "Hướng dẫn sử dụng",
      description: "Tổng hợp quy trình, mẹo và tài nguyên hỗ trợ",
      icon: BookOpenCheck,
      action: () => setLocation("/huong-dan"),
    },
  ];

  return (
    <MainLayout
      title="Công văn phân tích phân loại mới nhất"
      description="Theo dõi, lọc và truy cập nhanh các công văn từ Tổng cục Hải quan. Hệ thống đã chuẩn hóa Unicode để hiển thị tiếng Việt chính xác."
      actions={
        <>
          <Button onClick={() => setLocation("/")} className="gap-2">
            <FileText className="h-4 w-4" />
            Tra cứu HS Code
          </Button>
          <Button
            variant="secondary"
            onClick={() => setLocation("/documents-upload")}
            className="gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            Đồng bộ tài liệu
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="space-y-6">
          <RecentDocumentsSidebar variant="table" pageSize={8} limit={80} />
        </section>

        <aside className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Tác vụ nhanh</CardTitle>
              <CardDescription>Điều hướng tới các trang quản trị và hỗ trợ chính</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="flex w-full items-start gap-3 border-slate-200 py-3 text-left"
                  onClick={action.action}
                >
                  <action.icon className="h-5 w-5 text-blue-600" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {action.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
              ))}
            </CardContent>
          </Card>

          <ScraperStatusCard />

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Hỗ trợ sử dụng</CardTitle>
              <CardDescription>
                Những câu hỏi thường gặp và hướng dẫn nhanh để bạn bắt đầu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="intro">
                  <AccordionTrigger className="text-sm font-medium text-slate-900">
                    Quy trình thu thập dữ liệu
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-slate-600">
                    Hệ thống tự động duyệt danh sách công văn, truy cập trang chi tiết để lấy liên kết PDF và lưu vào cơ sở dữ liệu. Kết quả được OCR và chuẩn hóa Unicode trước khi hiển thị.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="ocr">
                  <AccordionTrigger className="text-sm font-medium text-slate-900">
                    Xử lý OCR tiếng Việt
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-slate-600">
                    Mọi tệp PDF được đồng bộ sẽ đi qua pipeline OCR hỗ trợ tiếng Việt. Bạn có thể kiểm tra lịch sử tại mục "Xem lịch sử OCR" để theo dõi tiến độ.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="filters">
                  <AccordionTrigger className="text-sm font-medium text-slate-900">
                    Mẹo lọc công văn hiệu quả
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-slate-600">
                    Sử dụng bộ lọc theo cơ quan và loại văn bản ở bảng bên trái. Kết hợp ô tìm kiếm với khoảng thời gian để thu hẹp kết quả chính xác nhất.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <HsCodeSearch />
        </aside>
      </div>
    </MainLayout>
  );
}
