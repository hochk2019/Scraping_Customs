import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Package,
  Zap,
  BarChart3,
} from "lucide-react";

interface OcrStatistic {
  documentNumber: string;
  documentTitle: string;
  totalLinks: number;
  successfulLinks: number;
  failedLinks: number;
  totalHsCodes: number;
  uniqueHsCodes: number;
  totalProductNames: number;
  uniqueProductNames: number;
  totalTextLength: number;
  totalWordCount: number;
  successRate: number;
}

export default function OcrDashboard() {
  const [stats, setStats] = useState<OcrStatistic[]>([
    {
      documentNumber: "29001/TB-CHQ",
      documentTitle: "Thông báo về HS code",
      totalLinks: 150,
      successfulLinks: 145,
      failedLinks: 5,
      totalHsCodes: 320,
      uniqueHsCodes: 85,
      totalProductNames: 250,
      uniqueProductNames: 120,
      totalTextLength: 1250000,
      totalWordCount: 180000,
      successRate: 97,
    },
    {
      documentNumber: "28500/TB-CHQ",
      documentTitle: "Công văn hướng dẫn",
      totalLinks: 120,
      successfulLinks: 115,
      failedLinks: 5,
      totalHsCodes: 280,
      uniqueHsCodes: 72,
      totalProductNames: 200,
      uniqueProductNames: 95,
      totalTextLength: 980000,
      totalWordCount: 150000,
      successRate: 96,
    },
    {
      documentNumber: "28000/TB-CHQ",
      documentTitle: "Thông tư quy định",
      totalLinks: 180,
      successfulLinks: 170,
      failedLinks: 10,
      totalHsCodes: 400,
      uniqueHsCodes: 110,
      totalProductNames: 320,
      uniqueProductNames: 150,
      totalTextLength: 1500000,
      totalWordCount: 220000,
      successRate: 94,
    },
  ]);

  // Tính toán tổng hợp
  const summary = {
    totalLinks: stats.reduce((sum, s) => sum + s.totalLinks, 0),
    successfulLinks: stats.reduce((sum, s) => sum + s.successfulLinks, 0),
    failedLinks: stats.reduce((sum, s) => sum + s.failedLinks, 0),
    totalHsCodes: stats.reduce((sum, s) => sum + s.totalHsCodes, 0),
    uniqueHsCodes: stats.reduce((sum, s) => sum + s.uniqueHsCodes, 0),
    totalProductNames: stats.reduce((sum, s) => sum + s.totalProductNames, 0),
    uniqueProductNames: stats.reduce((sum, s) => sum + s.uniqueProductNames, 0),
    averageSuccessRate: Math.round(
      stats.reduce((sum, s) => sum + s.successRate, 0) / stats.length
    ),
  };

  // Dữ liệu cho chart thành công/thất bại
  const successFailureData = [
    {
      name: "Thành công",
      value: summary.successfulLinks,
      fill: "#10b981",
    },
    {
      name: "Thất bại",
      value: summary.failedLinks,
      fill: "#ef4444",
    },
  ];

  // Dữ liệu cho chart HS code
  const hsCodeData = [
    {
      name: "Tổng HS code",
      value: summary.totalHsCodes,
      fill: "#3b82f6",
    },
    {
      name: "HS code duy nhất",
      value: summary.uniqueHsCodes,
      fill: "#8b5cf6",
    },
  ];

  // Dữ liệu cho chart tên hàng
  const productNameData = [
    {
      name: "Tổng tên hàng",
      value: summary.totalProductNames,
      fill: "#f59e0b",
    },
    {
      name: "Tên hàng duy nhất",
      value: summary.uniqueProductNames,
      fill: "#ec4899",
    },
  ];

  // Dữ liệu cho line chart theo tài liệu
  const documentTrendData = stats.map((stat) => ({
    name: stat.documentNumber,
    successRate: stat.successRate,
    totalLinks: stat.totalLinks,
    hsCodes: stat.totalHsCodes,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard OCR</h1>
        <p className="text-gray-600">Theo dõi hiệu suất xử lý OCR và phân tích dữ liệu</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Links */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Liên Kết</CardTitle>
            <FileText className="text-blue-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLinks}</div>
            <p className="text-xs text-gray-600">
              {summary.successfulLinks} thành công, {summary.failedLinks} thất bại
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ Lệ Thành Công</CardTitle>
            <CheckCircle className="text-green-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageSuccessRate}%</div>
            <Progress value={summary.averageSuccessRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* HS Codes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mã HS Code</CardTitle>
            <Zap className="text-yellow-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHsCodes}</div>
            <p className="text-xs text-gray-600">
              {summary.uniqueHsCodes} duy nhất
            </p>
          </CardContent>
        </Card>

        {/* Product Names */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tên Hàng</CardTitle>
            <Package className="text-purple-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProductNames}</div>
            <p className="text-xs text-gray-600">
              {summary.uniqueProductNames} duy nhất
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success/Failure Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tỷ Lệ Thành Công/Thất Bại</CardTitle>
            <CardDescription>Biểu đồ tròn hiển thị tỷ lệ liên kết thành công và thất bại</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={successFailureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {successFailureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* HS Code Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>So Sánh HS Code</CardTitle>
            <CardDescription>Tổng số HS code vs HS code duy nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hsCodeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Name Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>So Sánh Tên Hàng</CardTitle>
            <CardDescription>Tổng số tên hàng vs tên hàng duy nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productNameData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Document Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Xu Hướng Theo Tài Liệu</CardTitle>
            <CardDescription>Tỷ lệ thành công và số HS code theo tài liệu</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={documentTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  name="Tỷ Lệ Thành Công (%)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hsCodes"
                  stroke="#3b82f6"
                  name="Số HS Code"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Thống Kê Chi Tiết Theo Tài Liệu</CardTitle>
          <CardDescription>Hiển thị thống kê chi tiết cho mỗi tài liệu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-2">Số Hiệu</th>
                  <th className="text-left py-2 px-2">Tiêu Đề</th>
                  <th className="text-center py-2 px-2">Liên Kết</th>
                  <th className="text-center py-2 px-2">Thành Công</th>
                  <th className="text-center py-2 px-2">Thất Bại</th>
                  <th className="text-center py-2 px-2">HS Code</th>
                  <th className="text-center py-2 px-2">Tên Hàng</th>
                  <th className="text-center py-2 px-2">Tỷ Lệ</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium">{stat.documentNumber}</td>
                    <td className="py-2 px-2 text-gray-600 truncate max-w-xs">
                      {stat.documentTitle}
                    </td>
                    <td className="py-2 px-2 text-center">{stat.totalLinks}</td>
                    <td className="py-2 px-2 text-center">
                      <Badge className="bg-green-100 text-green-800">
                        {stat.successfulLinks}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Badge className="bg-red-100 text-red-800">
                        {stat.failedLinks}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {stat.totalHsCodes} ({stat.uniqueHsCodes})
                    </td>
                    <td className="py-2 px-2 text-center">
                      {stat.totalProductNames} ({stat.uniqueProductNames})
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={stat.successRate} className="w-16 h-2" />
                        <span className="font-semibold text-green-600">
                          {stat.successRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
