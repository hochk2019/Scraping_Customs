import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MainLayout from "@/layouts/MainLayout";
import RecentDocumentsSidebar from "@/components/RecentDocumentsSidebar";
import { ScraperForm } from "@/components/ScraperForm";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { GaugeCircle, CalendarClock, CheckCircle2 } from "lucide-react";

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "Chưa có dữ liệu";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Chưa có dữ liệu";
    }
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return "Chưa có dữ liệu";
  }
};

export default function Overview() {
  const { data: scraperStatus, isLoading } = trpc.scraper.getStatus.useQuery();

  const summaryItems = [
    {
      title: "Tổng công văn đã ghi nhận",
      value: scraperStatus?.documentsCount ?? 0,
      icon: <GaugeCircle className="h-5 w-5 text-blue-600" aria-hidden="true" />,
      description: "Dữ liệu được cập nhật tự động từ cổng hải quan",
    },
    {
      title: "Lần chạy gần nhất",
      value: formatDateTime(scraperStatus?.lastScrapedAt),
      icon: <CalendarClock className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
      description: scraperStatus?.status === "running" ? "Scraper đang hoạt động" : "Có thể kích hoạt thu thập thủ công",
    },
    {
      title: "Thông điệp hệ thống",
      value: scraperStatus?.message || "Scraper sẵn sàng",
      icon: <CheckCircle2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />,
      description: "Theo dõi trạng thái để xử lý kịp thời các lỗi",
    },
  ];

  return (
    <MainLayout
      title="Bảng điều khiển"
      description="Tổng quan các số liệu thu thập và công cụ vận hành scraper. Từ đây bạn có thể điều chỉnh lịch chạy và xem các công văn mới nhất."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {summaryItems.map((item) => (
          <Card key={item.title} className="border border-slate-200 bg-white/90 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{item.title}</CardTitle>
              {item.icon}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{item.value}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <RecentDocumentsSidebar variant="table" pageSize={6} limit={60} />
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Kích hoạt thu thập</CardTitle>
              <CardDescription>
                Thiết lập tham số thu thập và chạy scraper thủ công ngay tại đây
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScraperForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
