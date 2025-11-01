import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

const statusDictionary: Record<string, { label: string; tone: string }> = {
  ready: { label: "Sẵn sàng", tone: "bg-emerald-50 text-emerald-700" },
  running: { label: "Đang chạy", tone: "bg-blue-50 text-blue-700" },
  failed: { label: "Lỗi", tone: "bg-red-50 text-red-700" },
};

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

interface ScraperStatusCardProps {
  className?: string;
}

export default function ScraperStatusCard({ className }: ScraperStatusCardProps) {
  const { data: scraperStatus, isLoading } = trpc.scraper.getStatus.useQuery();
  const resolvedStatus = scraperStatus?.status ?? "ready";
  const statusMeta = statusDictionary[resolvedStatus] ?? statusDictionary.ready;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Trạng thái scraper</CardTitle>
        <CardDescription>
          Giám sát lượt thu thập và số tài liệu đã xử lý gần đây
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}
              >
                {isLoading ? "Đang tải..." : statusMeta.label}
              </span>
              <span className="text-xs text-slate-500">
                {scraperStatus?.message || "Scraper sẵn sàng"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Công văn đã ghi nhận</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {scraperStatus?.documentsCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Lần chạy gần nhất</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDateTime(scraperStatus?.lastScrapedAt)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
