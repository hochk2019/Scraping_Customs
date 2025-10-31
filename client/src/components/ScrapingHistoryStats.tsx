import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export function ScrapingHistoryStats() {
  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = trpc.scrapingHistory.statistics.useQuery();

  // Fetch trend data
  const { data: trend, isLoading: trendLoading } = trpc.scrapingHistory.trend.useQuery();

  if (statsLoading || trendLoading) {
    return <div className="text-center py-8">Đang tải thống kê...</div>;
  }

  // Prepare trend data for chart
  const trendData = trend?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString("vi-VN"),
    total: item.count,
    successful: item.successful,
  })) || [];

  // Prepare type distribution data
  const typeData = stats?.typeDistribution?.map((item: any) => ({
    name: item.type === "manual" ? "Thủ công" : "Tự động",
    value: item.count,
  })) || [];

  const COLORS = ["#8b5cf6", "#f97316"];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scrapes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tổng Lần Scraping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats?.totalScrapes || 0}</div>
              <Activity className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tỷ Lệ Thành Công
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {(stats?.successRate || 0).toFixed(1)}%
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Total Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tổng Tài Liệu Tìm Thấy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {stats?.totalDocumentsFound || 0}
              </div>
              <FileText className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Failed Count */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Lần Thất Bại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats?.failedScrapes || 0}</div>
              <AlertCircle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Xu Hướng Scraping (7 Ngày)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    name="Tổng lần scraping"
                  />
                  <Line
                    type="monotone"
                    dataKey="successful"
                    stroke="#10b981"
                    name="Lần thành công"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân Bố Loại Scraping</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData && typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân Bố Trạng Thái</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: "Trạng thái",
                    "Thành công": stats?.successfulScrapes || 0,
                    "Thất bại": stats?.failedScrapes || 0,
                    "Đang chạy": (stats?.totalScrapes || 0) - (stats?.successfulScrapes || 0) - (stats?.failedScrapes || 0),
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Thành công" fill="#10b981" />
                <Bar dataKey="Thất bại" fill="#ef4444" />
                <Bar dataKey="Đang chạy" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Documents Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Thống Kê Tài Liệu</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: "Tài liệu",
                    "Tìm thấy": stats?.totalDocumentsFound || 0,
                    "Tải thành công": stats?.totalDocumentsDownloaded || 0,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Tìm thấy" fill="#f59e0b" />
                <Bar dataKey="Tải thành công" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Thống Kê Chi Tiết</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Tổng Lần Scraping</p>
              <p className="text-2xl font-bold mt-2">{stats?.totalScrapes || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lần Thành Công</p>
              <p className="text-2xl font-bold mt-2 text-green-600">
                {stats?.successfulScrapes || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lần Thất Bại</p>
              <p className="text-2xl font-bold mt-2 text-red-600">
                {stats?.failedScrapes || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tỷ Lệ Thành Công</p>
              <p className="text-2xl font-bold mt-2">
                {(stats?.successRate || 0).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng Tài Liệu Tìm Thấy</p>
              <p className="text-2xl font-bold mt-2">{stats?.totalDocumentsFound || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng Tài Liệu Tải Thành Công</p>
              <p className="text-2xl font-bold mt-2">
                {stats?.totalDocumentsDownloaded || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
