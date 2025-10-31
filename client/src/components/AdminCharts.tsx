import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

export default function AdminCharts() {
  // Fetch activity by date
  const { data: activityByDate } = trpc.admin.getUserActivityByDate.useQuery();

  // Fetch distribution by role
  const { data: distributionByRole } = trpc.admin.getUserDistributionByRole.useQuery();

  // Fetch top users by feedback
  const { data: topUsersByFeedback } = trpc.admin.getTopUsersByFeedback.useQuery();

  // Fetch feedback by type
  const { data: feedbackByType } = trpc.admin.getFeedbackStatisticsByType.useQuery();

  // Fetch feedback by status
  const { data: feedbackByStatus } = trpc.admin.getFeedbackStatisticsByStatus.useQuery();

  // Format data for charts
  const activityData = (activityByDate || []).map((item: any) => ({
    date: item.date || "N/A",
    users: item.count || 0,
  }));

  const roleData = (distributionByRole || []).map((item: any) => ({
    name: item.role === "admin" ? "Admin" : "User",
    value: item.count || 0,
  }));

  const topUsersData = (topUsersByFeedback || []).map((item: any) => ({
    name: item.userName || `User ${item.userId}`,
    feedback: item.feedbackCount || 0,
  }));

  const feedbackTypeData = (feedbackByType || []).map((item: any) => ({
    name: item.type || "Unknown",
    value: item.count || 0,
  }));

  const feedbackStatusData = (feedbackByStatus || []).map((item: any) => ({
    name: item.status || "Unknown",
    value: item.count || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Activity by Date */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt Động Người Dùng (7 Ngày)</CardTitle>
          <CardDescription>Số lượng người dùng đăng nhập theo ngày</CardDescription>
        </CardHeader>
        <CardContent>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  name="Người Dùng"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
          )}
        </CardContent>
      </Card>

      {/* Distribution by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Phân Bố Vai Trò</CardTitle>
          <CardDescription>Tỷ lệ Admin và User</CardDescription>
        </CardHeader>
        <CardContent>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
          )}
        </CardContent>
      </Card>

      {/* Top Users by Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Người Dùng Phản Hồi</CardTitle>
          <CardDescription>Người dùng có phản hồi nhiều nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {topUsersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="feedback" fill="#10b981" name="Phản Hồi" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
          )}
        </CardContent>
      </Card>

      {/* Feedback by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Phản Hồi Theo Loại</CardTitle>
          <CardDescription>Phân bố các loại phản hồi</CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={feedbackTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {feedbackTypeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
          )}
        </CardContent>
      </Card>

      {/* Feedback by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Phản Hồi Theo Trạng Thái</CardTitle>
          <CardDescription>Phân bố trạng thái phản hồi</CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feedbackStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#f59e0b" name="Số Lượng" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
