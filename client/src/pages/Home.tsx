import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  GaugeCircle,
  History,
  Moon,
  Sun,
  UploadCloud,
} from "lucide-react";
import HsCodeSearch from "@/components/HsCodeSearch";
import RecentDocumentsSidebar from "@/components/RecentDocumentsSidebar";
import { ScraperForm } from "@/components/ScraperForm";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

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

const statusDictionary: Record<string, { label: string; tone: string }> = {
  ready: { label: "Sẵn sàng", tone: "bg-emerald-50 text-emerald-700" },
  running: { label: "Đang chạy", tone: "bg-blue-50 text-blue-700" },
  failed: { label: "Lỗi", tone: "bg-red-50 text-red-700" },
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();
  const { data: scraperStatus, isLoading: statusLoading } =
    trpc.scraper.getStatus.useQuery();

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
  ];

  const resolvedStatus = scraperStatus?.status ?? "ready";
  const statusMeta = statusDictionary[resolvedStatus] ?? statusDictionary.ready;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Cổng dữ liệu hải quan
              </p>
              <h1 className="text-lg font-bold text-slate-900">
                Phân tích phân loại & OCR tài liệu
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {switchable && toggleTheme && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Chuyển chế độ sáng/tối"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setLocation("/dashboard")}>
              Đăng nhập
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold leading-tight text-slate-900">
                Tra cứu văn bản phân loại nhanh và chính xác
              </h2>
              <p className="max-w-2xl text-sm text-slate-600">
                Hệ thống tự động thu thập công văn phân tích phân loại từ Tổng cục Hải
                quan, kết hợp OCR tiếng Việt và phân tích mã HS để giúp bạn ra quyết định
                nhanh hơn.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setLocation("/hs-code-lookup")} className="gap-2">
                <GaugeCircle className="h-4 w-4" />
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
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <RecentDocumentsSidebar variant="panel" limit={8} />
            <ScraperForm />
          </section>

          <aside className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Tác vụ nhanh</CardTitle>
                <CardDescription>Điều hướng tới các trang quản trị chính</CardDescription>
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

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Trạng thái scraper</CardTitle>
                <CardDescription>
                  Giám sát lượt thu thập và số tài liệu đã xử lý gần đây
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}
                  >
                    {statusLoading ? "Đang tải..." : statusMeta.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {statusLoading
                      ? "Đang cập nhật tình trạng"
                      : scraperStatus?.message || "Scraper sẵn sàng"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Công văn đã ghi nhận</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {statusLoading ? "–" : scraperStatus?.documentsCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Lần chạy gần nhất</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {statusLoading
                        ? "Đang tải..."
                        : formatDateTime(scraperStatus?.lastScrapedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <HsCodeSearch />
          </aside>
        </div>
      </main>
    </div>
  );
}
