import DashboardLayout from "@/components/DashboardLayout";
import HsCodeSearch from "@/components/HsCodeSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HsCodeLookup() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Tra Cứu HS Code</h1>
          <p className="text-gray-600 mt-2">
            Tìm kiếm mã HS code, biểu thuế, và thông tin hàng hóa
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">HS Code là gì?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                HS Code (Harmonized System Code) là mã phân loại hàng hóa quốc tế được sử dụng trong thương mại và hải quan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cách Tra Cứu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Bạn có thể tìm kiếm theo mã HS code (ví dụ: 6204.62.20) hoặc theo tên hàng hóa.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Thông Tin Cung Cấp</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Kết quả bao gồm tên hàng, mô tả, biểu thuế nhập/xuất và thông tin chi tiết khác.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Component */}
        <HsCodeSearch />
      </div>
    </DashboardLayout>
  );
}
