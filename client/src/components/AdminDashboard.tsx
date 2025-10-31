import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserCheck, AlertCircle, TrendingUp } from "lucide-react";
import AdminCharts from "./AdminCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrapingHistoryAdmin } from "./ScrapingHistoryAdmin";
import { ScrapingHistoryStats } from "./ScrapingHistoryStats";
import { ScrapingCharts } from "./ScrapingCharts";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Fetch all users
  const { data: usersData, isLoading: usersLoading } = trpc.admin.getAllUsers.useQuery({
    limit: itemsPerPage,
    offset: currentPage * itemsPerPage,
  });

  // Fetch user statistics
  const { data: statsData } = trpc.admin.getUserStatistics.useQuery();

  // Search users
  const { data: searchResults } = trpc.admin.searchUsers.useQuery(
    { query: searchQuery, limit: 50 },
    { enabled: searchQuery.length > 0 }
  );

  // Update user role mutation
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation();

  // Delete user mutation
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();

  const handleUpdateRole = async (userId: number, newRole: "user" | "admin") => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
      alert("Cập nhật vai trò thành công");
    } catch (error) {
      alert("Lỗi cập nhật vai trò");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (confirm("Bạn chắc chắn muốn xóa người dùng này?")) {
      try {
        await deleteUserMutation.mutateAsync({ userId });
        alert("Xóa người dùng thành công");
      } catch (error) {
        alert("Lỗi xóa người dùng");
      }
    }
  };

  const displayUsers = (searchQuery.length > 0 ? searchResults : usersData?.users) || [];
  const totalUsers = usersData?.total || 0;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="users">Quản Lý Người Dùng</TabsTrigger>
        <TabsTrigger value="scraping-charts">Biểu Đồ Scraping</TabsTrigger>
        <TabsTrigger value="scraping-stats">Thống Kê Scraping</TabsTrigger>
        <TabsTrigger value="scraping-history">Lịch Sử Scraping</TabsTrigger>
      </TabsList>

      {/* Users Tab */}
      <TabsContent value="users" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Quản Lý Người Dùng</h1>
        <p className="text-gray-500 mt-2">Quản lý tất cả người dùng trong hệ thống</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Người Dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Tất cả người dùng đã đăng ký</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.adminUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Quản trị viên hệ thống</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người Dùng Thường</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.regularUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Người dùng bình thường</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người Dùng Mới</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.newUsersThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">Tháng này</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Tìm Kiếm Người Dùng</CardTitle>
          <CardDescription>Tìm kiếm theo tên, email hoặc ID</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Nhập tên, email hoặc ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Charts */}
      <AdminCharts />

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Người Dùng</CardTitle>
          <CardDescription>
            Hiển thị {displayUsers.length} người dùng
            {!searchQuery && ` (Trang ${currentPage + 1} / ${totalPages})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : !displayUsers || displayUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không tìm thấy người dùng</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Vai Trò</TableHead>
                      <TableHead>Đăng Nhập Lần Cuối</TableHead>
                      <TableHead>Tạo Lúc</TableHead>
                      <TableHead className="text-right">Hành Động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                        <TableCell>{user.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastSignedIn
                            ? new Date(user.lastSignedIn).toLocaleDateString("vi-VN")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Select
                            defaultValue={user.role}
                            onValueChange={(value) =>
                              handleUpdateRole(user.id, value as "user" | "admin")
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Xóa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {!searchQuery && totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    Trang Trước
                  </Button>
                  <span className="text-sm text-gray-600">
                    Trang {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Trang Sau
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      {/* Scraping Charts Tab */}
      <TabsContent value="scraping-charts" className="space-y-6">
        <ScrapingCharts isVisible={true} />
      </TabsContent>

      {/* Scraping Stats Tab */}
      <TabsContent value="scraping-stats" className="space-y-6">
        <ScrapingHistoryStats />
      </TabsContent>

      {/* Scraping History Tab */}
      <TabsContent value="scraping-history" className="space-y-6">
        <ScrapingHistoryAdmin />
      </TabsContent>
    </Tabs>
  );
}
