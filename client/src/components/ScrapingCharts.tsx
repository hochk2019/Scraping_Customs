import React, { useEffect, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ScrapingChartsProps {
  isVisible?: boolean;
}

export function ScrapingCharts({ isVisible = true }: ScrapingChartsProps) {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [docStats, setDocStats] = useState<any>(null);
  const [overallStats, setOverallStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const fetchChartData = async () => {
      try {
        setLoading(true);
        const [trendRes, typeRes, statusRes, docRes, overallRes] = await Promise.all([
          fetch("/api/trpc/scrapingCharts.getTrend"),
          fetch("/api/trpc/scrapingCharts.getTypeDistribution"),
          fetch("/api/trpc/scrapingCharts.getStatusDistribution"),
          fetch("/api/trpc/scrapingCharts.getDocumentStats"),
          fetch("/api/trpc/scrapingCharts.getOverallStats"),
        ]);

        if (trendRes.ok) {
          const data = await trendRes.json();
          setTrendData(data.result?.data || []);
        }
        if (typeRes.ok) {
          const data = await typeRes.json();
          setTypeData(data.result?.data || []);
        }
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatusData(data.result?.data || []);
        }
        if (docRes.ok) {
          const data = await docRes.json();
          setDocStats(data.result?.data);
        }
        if (overallRes.ok) {
          const data = await overallRes.json();
          setOverallStats(data.result?.data);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [isVisible]);

  if (!isVisible || loading) {
    return null;
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tổng Lần Scraping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Thành Công</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overallStats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tỷ Lệ Thành Công</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{overallStats.successRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tổng Tài Liệu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalDocuments}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Xu Hướng 7 Ngày</CardTitle>
            <CardDescription>Số lần scraping theo ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Tổng" />
                <Line type="monotone" dataKey="success" stroke="#10b981" name="Thành Công" />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Thất Bại" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân Bố Loại Scraping</CardTitle>
            <CardDescription>Thủ Công vs Tự Động</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân Bố Trạng Thái</CardTitle>
            <CardDescription>Thành Công, Thất Bại, Đang Chạy</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Số Lần">
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Document Stats */}
        {docStats && (
          <Card>
            <CardHeader>
              <CardTitle>Thống Kê Tài Liệu</CardTitle>
              <CardDescription>Tìm Thấy vs Tải Thành Công</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: "Tìm Thấy", value: docStats.found },
                    { name: "Tải Thành Công", value: docStats.downloaded },
                    { name: "Chờ Xử Lý", value: docStats.pending },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" name="Số Tài Liệu">
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
