import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Search, TrendingUp } from "lucide-react";
import HsCodeSearch from "@/components/HsCodeSearch";
import RecentDocumentsSidebar from "@/components/RecentDocumentsSidebar";
import { ScraperForm } from "@/components/ScraperForm";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hải Quan Việt Nam</h1>
              <p className="text-xs text-gray-600">Thu thập & Phân tích dữ liệu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/dashboard")}
            >
              Quản lý tài liệu
            </Button>
            <Button
              onClick={() => setLocation("/hs-code-lookup")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Tra cứu HS Code
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Tra Cứu HS Code Nhanh Chóng & Chính Xác
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tìm kiếm mã HS code, biểu thuế, và thông tin hàng hóa từ cơ sở dữ liệu Hải quan Việt Nam
          </p>
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            {/* Search Section */}
            <HsCodeSearch />
          </div>
          <div>
            {/* Recent Documents Sidebar */}
            <RecentDocumentsSidebar />
          </div>
        </div>

        {/* Scraper Form Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Thu Thập Dữ Liệu Tự Động</h3>
          <ScraperForm />
        </div>

        {/* Features Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Tính Năng Chính</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Tra Cứu HS Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Tìm kiếm theo mã code hoặc tên hàng hóa với kết quả chính xác
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Tải Lên Tài Liệu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Tải lên file Excel, PDF, Word để trích xuất HS code tự động
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Phân Tích AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Gợi ý HS code dựa trên trí tuệ nhân tạo với độ tin cậy cao
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Thống Kê Thời Gian Thực
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Xem biểu đồ thống kê hiệu suất xử lý OCR và phân tích
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>HS Code là gì?</CardTitle>
              <CardDescription>Mã phân loại hàng hóa quốc tế</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                HS Code (Harmonized System Code) là mã phân loại hàng hóa quốc tế được sử dụng trong thương mại và hải quan.
              </p>
              <p className="text-sm text-gray-700">
                Mỗi mã HS code gồm 6 chữ số cơ bản, có thể được mở rộng thành 8 hoặc 10 chữ số tùy theo quốc gia.
              </p>
              <p className="text-sm text-gray-700">
                Ví dụ: 6204.62.20 - Áo sơ mi, áo khoác nữ
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cách Sử Dụng</CardTitle>
              <CardDescription>Hướng dẫn nhanh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm">Tìm kiếm</p>
                  <p className="text-xs text-gray-600">Nhập mã HS code hoặc tên hàng</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm">Xem kết quả</p>
                  <p className="text-xs text-gray-600">Hiển thị thông tin chi tiết</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm">Sử dụng dữ liệu</p>
                  <p className="text-xs text-gray-600">Biểu thuế, mô tả, thông tin khác</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-3">Sẵn Sàng Bắt Đầu?</h3>
          <p className="mb-6 text-blue-100">
            Đăng nhập để truy cập tất cả tính năng quản lý tài liệu, phân tích AI, và thống kê thời gian thực
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setLocation("/dashboard")}
          >
            Truy Cập Dashboard
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Về Ứng Dụng</h4>
              <p className="text-sm text-gray-600">
                Nền tảng tự động thu thập, phân tích, và tra cứu dữ liệu hải quan Việt Nam
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Tính Năng</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Tra cứu HS code</li>
                <li>Tải lên & phân tích</li>
                <li>Dashboard thống kê</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Hỗ Trợ</h4>
              <p className="text-sm text-gray-600">
                Liên hệ Manus AI để được hỗ trợ
              </p>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-gray-600">
            <p>© 2025 Hải Quan Việt Nam. Powered by Manus.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
