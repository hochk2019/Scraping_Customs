import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MainLayout from "@/layouts/MainLayout";
import { CalendarCheck2, Database, Settings2 } from "lucide-react";

const roadmapItems = [
  {
    title: "Theo dõi tiến trình OCR thời gian thực",
    description:
      "Hiển thị biểu đồ và trạng thái từng tài liệu đang OCR, bổ sung thông báo khi gặp lỗi hoặc cần xử lý thủ công.",
    icon: <Settings2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />,
  },
  {
    title: "Quản lý lịch thu thập nâng cao",
    description:
      "Tạo nhiều lịch chạy khác nhau, hỗ trợ tạm dừng và kích hoạt lại nhanh chóng với giao diện kéo thả.",
    icon: <CalendarCheck2 className="h-5 w-5 text-blue-600" aria-hidden="true" />,
  },
  {
    title: "Đồng bộ dữ liệu tham chiếu",
    description:
      "Tự động đồng bộ danh mục HS code, nhóm hàng hóa và cơ quan ban hành để dùng chung cho bộ lọc.",
    icon: <Database className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
  },
];

export default function Features() {
  return (
    <MainLayout
      title="Tính năng đang và sắp phát triển"
      description="Lộ trình cải tiến giúp hệ thống trực quan, dễ vận hành và hỗ trợ nghiệp vụ tốt hơn. Đóng góp của bạn sẽ giúp ưu tiên các hạng mục quan trọng."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {roadmapItems.map((item) => (
          <Card key={item.title} className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {item.icon}
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed text-slate-600">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}
