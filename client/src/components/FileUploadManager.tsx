import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import UploadProgressBar from "./UploadProgressBar";

interface ExtractedData {
  fileName: string;
  fileType: string;
  uploadedAt: Date;
  hsCodes: string[];
  productNames: string[];
  summary: Record<string, any>;
}

interface AISuggestion {
  productName: string;
  suggestions: Array<{
    hsCode: string;
    confidence: number;
    description: string;
  }>;
}

interface AIAnalysis {
  productNames: string[];
  hsCodes: string[];
  suggestions: AISuggestion[];
  confidence: number;
}

export default function FileUploadManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmedData, setConfirmedData] = useState<any>(null);

  const uploadMutation = trpc.files.upload.useMutation({
    onSuccess: (data: any) => {
      setIsUploading(false);
      if (data.extractedData) {
        setExtractedData(data.extractedData);
        if (data.aiAnalysis) {
          setAiAnalysis(data.aiAnalysis);
        }
        setShowPreview(true);
        toast.success("File uploaded and processed successfully!");
      }
      setSelectedFile(null);
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error("Error uploading file: " + error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/json", "text/csv"];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|pdf|docx?|json|csv)$/i)) {
        toast.error("Invalid file type. Please upload Excel, PDF, Word, JSON, or CSV file.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Content = (e.target?.result as string)?.split(",")[1] || "";
        const fileType = getFileType(selectedFile.name);

        uploadMutation.mutate({
          fileName: selectedFile.name,
          fileType: fileType as any,
          fileContent: base64Content,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      setIsUploading(false);
      toast.error("Error reading file");
    }
  };

  const handleConfirmData = () => {
    if (extractedData && aiAnalysis) {
      setConfirmedData({
        extractedData,
        aiAnalysis,
        confirmedAt: new Date(),
      });
      toast.success("Data confirmed and saved!");
      setShowPreview(false);
    }
  };

  const getFileType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["xls", "xlsx"].includes(ext)) return "excel";
    if (ext === "pdf") return "pdf";
    if (["doc", "docx"].includes(ext)) return "word";
    if (ext === "json") return "json";
    if (ext === "csv") return "csv";
    return "excel";
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "excel":
        return "📊";
      case "pdf":
        return "📄";
      case "word":
        return "📝";
      case "json":
        return "{ }";
      case "csv":
        return "📋";
      default:
        return "📁";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  return (
    <div className="space-y-6">
      {/* Upload Progress */}
      <UploadProgressBar
        fileName={selectedFile?.name}
        isUploading={isUploading}
        totalProgress={uploadProgress}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            Tải Lên File
          </CardTitle>
          <CardDescription>
            Tải lên file Excel, PDF, Word, JSON hoặc CSV để trích xuất dữ liệu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File input */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf,.docx,.doc,.json,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="space-y-2">
              <FileText size={40} className="mx-auto text-gray-400" />
              <p className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "Chọn file hoặc kéo thả vào đây"}
              </p>
              <p className="text-xs text-gray-500">
                Hỗ trợ: Excel, PDF, Word, JSON, CSV (Tối đa 10MB)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Chọn File
              </Button>
            </div>
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                Đang tải lên...
              </>
            ) : (
              <>
                <Upload className="mr-2" size={16} />
                Tải Lên
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmed Data Display */}
      {confirmedData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle size={20} />
              Dữ Liệu Đã Xác Nhận
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">
              {confirmedData.extractedData.fileName} - Xác nhận lúc {new Date(confirmedData.confirmedAt).toLocaleString("vi-VN")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              Dữ Liệu Được Trích Xuất
            </DialogTitle>
            <DialogDescription>
              {extractedData?.fileName}
            </DialogDescription>
          </DialogHeader>

          {extractedData && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Loại File</p>
                  <p className="text-lg font-semibold">
                    {getFileIcon(extractedData.fileType)} {extractedData.fileType.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Thời Gian Tải Lên</p>
                  <p className="text-lg font-semibold">
                    {new Date(extractedData.uploadedAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* HS Codes */}
              {extractedData.hsCodes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Mã HS Code ({extractedData.hsCodes.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.hsCodes.map((code, idx) => (
                      <Badge key={idx} variant="secondary">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Names */}
              {extractedData.productNames.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    Tên Hàng ({extractedData.productNames.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {extractedData.productNames.map((name, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              {aiAnalysis && aiAnalysis.suggestions.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-600">
                      Gợi Ý HS Code (AI Analysis)
                    </h3>
                    <Badge className={getConfidenceColor(aiAnalysis.confidence / 100)}>
                      {aiAnalysis.confidence}% tin cậy
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {aiAnalysis.suggestions.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-blue-50">
                        <p className="font-medium text-sm mb-2">{item.productName}</p>
                        <div className="space-y-2">
                          {item.suggestions.map((suggestion, sidx) => (
                            <div key={sidx} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <p className="font-semibold text-blue-600">{suggestion.hsCode}</p>
                                <p className="text-xs text-gray-600">{suggestion.description}</p>
                              </div>
                              <Badge className={getConfidenceColor(suggestion.confidence)}>
                                {Math.round(suggestion.confidence * 100)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {Object.keys(extractedData.summary).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Thống Kê</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(extractedData.summary).map(([key, value]) => (
                      <div key={key} className="p-3 bg-blue-50 rounded">
                        <p className="text-xs text-gray-600 capitalize">{key}</p>
                        <p className="text-lg font-semibold">
                          {typeof value === "number" ? value.toLocaleString() : JSON.stringify(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmData}
                  className="gap-2"
                >
                  <CheckCircle size={16} />
                  Xác Nhận Dữ Liệu
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
