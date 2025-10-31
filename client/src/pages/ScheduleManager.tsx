import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";

export default function ScheduleManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cronExpression: "",
  });

  // Lấy danh sách lập lịch
  const { data: schedules, isLoading, refetch } = trpc.schedules.list.useQuery();

  // Tạo lập lịch
  const createSchedule = trpc.schedules.create.useMutation({
    onSuccess: () => {
      console.log("Lập lịch được tạo thành công");
      setFormData({ name: "", cronExpression: "" });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      console.error("Lỗi:", error.message);
    },
  });

  // Cập nhật lập lịch
  const updateSchedule = trpc.schedules.update.useMutation({
    onSuccess: () => {
      console.log("Lập lịch được cập nhật thành công");
      setFormData({ name: "", cronExpression: "" });
      setEditingId(null);
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      console.error("Lỗi:", error.message);
    },
  });

  // Xóa lập lịch
  const deleteSchedule = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      console.log("Lập lịch được xóa thành công");
      refetch();
    },
    onError: (error) => {
      console.error("Lỗi:", error.message);
    },
  });

  const handleOpenDialog = (schedule?: any) => {
    if (schedule) {
      setEditingId(schedule.id);
      setFormData({
        name: schedule.name,
        cronExpression: schedule.cronExpression,
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", cronExpression: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.cronExpression) {
      console.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (editingId) {
      updateSchedule.mutate({
        id: editingId,
        name: formData.name,
        cronExpression: formData.cronExpression,
      });
    } else {
      createSchedule.mutate({
        name: formData.name,
        cronExpression: formData.cronExpression,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn chắc chắn muốn xóa lập lịch này?")) {
      deleteSchedule.mutate({ id });
    }
  };

  const getCronDescription = (cron: string) => {
    // Mô tả đơn giản cho các cron expression phổ biến
    const descriptions: Record<string, string> = {
      "0 0 * * *": "Hàng ngày lúc 00:00",
      "0 0 * * 0": "Hàng tuần (Chủ nhật) lúc 00:00",
      "0 0 1 * *": "Hàng tháng lúc 00:00",
      "0 */6 * * *": "Mỗi 6 giờ",
      "0 */12 * * *": "Mỗi 12 giờ",
    };
    return descriptions[cron] || cron;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Quản lý lập lịch</h1>
            <p className="text-gray-500 mt-2">
              Cấu hình thu thập dữ liệu tự động
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Tạo lập lịch mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Chỉnh sửa lập lịch" : "Tạo lập lịch mới"}
                </DialogTitle>
                <DialogDescription>
                  Cấu hình thời gian chạy thu thập dữ liệu tự động
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tên lập lịch</Label>
                  <Input
                    id="name"
                    placeholder="Ví dụ: Thu thập hàng ngày"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cron">Biểu thức Cron</Label>
                  <Input
                    id="cron"
                    placeholder="Ví dụ: 0 0 * * * (hàng ngày lúc 00:00)"
                    value={formData.cronExpression}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cronExpression: e.target.value,
                      })
                    }
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {getCronDescription(formData.cronExpression)}
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
                    <p className="font-semibold mb-2">Ví dụ Cron:</p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• <code>0 0 * * *</code> - Hàng ngày lúc 00:00</li>
                      <li>• <code>0 0 * * 0</code> - Hàng tuần (Chủ nhật)</li>
                      <li>• <code>0 0 1 * *</code> - Hàng tháng</li>
                      <li>• <code>0 */6 * * *</code> - Mỗi 6 giờ</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      createSchedule.isPending || updateSchedule.isPending
                    }
                  >
                    {createSchedule.isPending || updateSchedule.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {editingId ? "Cập nhật" : "Tạo"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách lập lịch</CardTitle>
            <CardDescription>
              Quản lý các lập lịch thu thập dữ liệu tự động
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : schedules && schedules.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên lập lịch</TableHead>
                      <TableHead>Biểu thức Cron</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Lần chạy cuối</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule: any) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          {schedule.name}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {schedule.cronExpression}
                          </code>
                        </TableCell>
                        <TableCell>
                          {getCronDescription(schedule.cronExpression)}
                        </TableCell>
                        <TableCell>
                          {schedule.isActive ? (
                            <Badge variant="default">Hoạt động</Badge>
                          ) : (
                            <Badge variant="secondary">Vô hiệu</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {schedule.lastRunAt
                            ? new Date(schedule.lastRunAt).toLocaleString(
                                "vi-VN"
                              )
                            : "Chưa chạy"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(schedule)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(schedule.id)}
                              disabled={deleteSchedule.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Chưa có lập lịch nào</p>
                <Button
                  onClick={() => handleOpenDialog()}
                  variant="outline"
                  className="mt-4"
                >
                  Tạo lập lịch đầu tiên
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Thông tin Cron Expression</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>
              Cron expression là một chuỗi 5 hoặc 6 trường được phân tách bằng
              khoảng trắng.
            </p>
            <p>
              <strong>Format:</strong> <code>phút giờ ngày tháng thứ</code>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Phút: 0-59</li>
              <li>Giờ: 0-23</li>
              <li>Ngày: 1-31</li>
              <li>Tháng: 1-12</li>
              <li>Thứ: 0-6 (0=Chủ nhật)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
