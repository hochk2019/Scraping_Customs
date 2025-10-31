import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  const { data: user } = trpc.auth.me.useQuery();

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Truy Cập Bị Từ Chối</h1>
            <p className="text-gray-600 mt-2">Bạn không có quyền truy cập trang này</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}
