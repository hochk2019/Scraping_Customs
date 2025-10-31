import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from "lucide-react";

export default function HsCodeSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"code" | "name">("name");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch popular HS codes
  const { data: popularHsCodes } = trpc.hsCode.getPopular.useQuery({ limit: 10 });

  // Create mutation clients
  const utils = trpc.useUtils();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      if (searchType === "code") {
        const result = await utils.hsCode.searchByCode.fetch({ code: searchQuery });
        setSearchResults(result ? [result] : []);
      } else {
        const results = await utils.hsCode.searchByName.fetch({
          query: searchQuery,
          limit: 20,
        });
        setSearchResults(results || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tra Cứu HS Code</CardTitle>
          <CardDescription>Tìm kiếm mã HS code hoặc tên hàng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "code" | "name")}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value="name">Tìm theo tên hàng</option>
              <option value="code">Tìm theo mã code</option>
            </select>
            <Input
              placeholder={
                searchType === "code"
                  ? "Nhập mã HS code (ví dụ: 6204.62.20)..."
                  : "Nhập tên hàng..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
              <Search className="h-4 w-4" />
              {isSearching ? "Đang tìm..." : "Tìm"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kết Quả Tìm Kiếm</CardTitle>
            <CardDescription>Tìm thấy {searchResults.length} kết quả</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã HS Code</TableHead>
                    <TableHead>Tên Hàng (Việt)</TableHead>
                    <TableHead>Tên Hàng (Anh)</TableHead>
                    <TableHead>Biểu Thuế Nhập</TableHead>
                    <TableHead>Biểu Thuế Xuất</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold text-blue-600">
                        {item.code}
                      </TableCell>
                      <TableCell>{item.nameVi || "N/A"}</TableCell>
                      <TableCell>{item.nameEn || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.importTariff || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.exportTariff || "N/A"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {searchResults.length > 0 && searchResults[0].description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Mô Tả Chi Tiết</h4>
                <p className="text-sm text-gray-700">{searchResults[0].description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Popular HS Codes */}
      {!searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              HS Code Phổ Biến
            </CardTitle>
            <CardDescription>Các mã HS code được tham chiếu nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {popularHsCodes && popularHsCodes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã HS Code</TableHead>
                      <TableHead>Tên Hàng (Việt)</TableHead>
                      <TableHead>Tên Hàng (Anh)</TableHead>
                      <TableHead>Biểu Thuế Nhập</TableHead>
                      <TableHead>Biểu Thuế Xuất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popularHsCodes.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-bold text-blue-600">
                          {item.code}
                        </TableCell>
                        <TableCell>{item.nameVi || "N/A"}</TableCell>
                        <TableCell>{item.nameEn || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.importTariff || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.exportTariff || "N/A"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <p>Không tìm thấy kết quả cho "{searchQuery}"</p>
              <p className="text-sm mt-2">Hãy thử với từ khóa khác</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
