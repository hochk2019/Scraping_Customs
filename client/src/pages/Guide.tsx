import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MainLayout from "@/layouts/MainLayout";
import { ListChecks, Workflow, Lightbulb } from "lucide-react";

export default function Guide() {
  return (
    <MainLayout
      title="Hướng dẫn sử dụng"
      description="Các bước cài đặt, vận hành và kiểm tra chất lượng hệ thống thu thập công văn. Mọi nội dung đều được trình bày bằng tiếng Việt và chuẩn hóa Unicode."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Workflow className="h-5 w-5 text-blue-600" />
              Quy trình thu thập
            </CardTitle>
            <CardDescription>
              Tự động duyệt trang danh sách, mở chi tiết và tải PDF gốc
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>1. Thu thập danh sách công văn theo từng trang.</p>
            <p>2. Truy cập trang chi tiết để lấy đầy đủ metadata và liên kết PDF.</p>
            <p>3. Lưu thông tin vào cơ sở dữ liệu và chuyển tới pipeline OCR.</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              Kiểm thử đề xuất
            </CardTitle>
            <CardDescription>
              Bảo đảm mọi tính năng hoạt động ổn định trước khi triển khai
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>• Chạy <code>pnpm test</code> sau mỗi thay đổi để phát hiện lỗi sớm.</p>
            <p>• Tạo thêm kịch bản Playwright hoặc Storybook snapshot cho giao diện.</p>
            <p>• Theo dõi log scraper để kịp thời xử lý các lỗi tải PDF.</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Mẹo vận hành
            </CardTitle>
            <CardDescription>
              Các khuyến nghị giúp làm việc hiệu quả và hạn chế lỗi Unicode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>• Ưu tiên định dạng ngày theo chuẩn <strong>dd/mm/yyyy</strong>.</p>
            <p>• Luôn chuẩn hóa chuỗi bằng <code>normalize("NFC")</code> trước khi lưu.</p>
            <p>• Sử dụng bộ lọc ở trang "Công văn mới" để kiểm tra nhanh dữ liệu.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
