import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Link2, Loader2, Save, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LinkProcessingResult {
  documentNumber: string;
  documentTitle: string;
  linkUrl: string;
  status: "success" | "failed";
  extractedData?: {
    hsCodes: string[];
    productNames: string[];
    textLength: number;
    wordCount: number;
  };
  aiAnalysis?: {
    hsCodes: string[];
    productNames: string[];
    suggestions: Array<{
      productName: string;
      suggestions: Array<{
        hsCode: string;
        confidence: number;
        description: string;
      }>;
    }>;
    confidence: number;
  };
  rawText?: string;
  error?: string;
  processedAt: Date;
}

interface LinkProcessingPanelProps {
  onDocumentSaved?: () => void;
}

export function LinkProcessingPanel({ onDocumentSaved }: LinkProcessingPanelProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<LinkProcessingResult | null>(null);

  const processLinkMutation = trpc.links.processLink.useMutation({
    onSuccess: (data) => {
      setResult(data as LinkProcessingResult);
      if (data.status === "success") {
        toast.success("Đã phân tích liên kết thành công");
      } else {
        toast.error(data.error || "Không thể xử lý liên kết");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Không thể xử lý liên kết");
    },
  });

  const createDocumentMutation = trpc.documents.create.useMutation({
    onError: (error) => {
      toast.error(error.message || "Không thể lưu tài liệu mới");
    },
  });

  const processDocumentMutation = trpc.scraperPipeline.processDocument.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu và cập nhật OCR cho tài liệu mới");
      if (onDocumentSaved) {
        onDocumentSaved();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Không thể cập nhật OCR cho tài liệu mới");
    },
  });

  const isBusy = processLinkMutation.isLoading || createDocumentMutation.isLoading || processDocumentMutation.isLoading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!linkUrl || !documentNumber || !documentTitle) {
      toast.error("Vui lòng nhập đầy đủ số hiệu, tiêu đề và liên kết PDF");
      return;
    }

    setResult(null);
    await processLinkMutation.mutateAsync({
      linkUrl,
      documentNumber,
      documentTitle,
    });
  };

  const handleSaveDocument = async () => {
    if (!result || result.status !== "success") {
      toast.error("Chưa có kết quả OCR để lưu");
      return;
    }

    const createPayload = {
      documentNumber,
      title: documentTitle,
      documentType: "Tài liệu OCR",
      issuingAgency: "OCR thủ công",
      issueDate: undefined,
      signer: undefined,
      fileUrl: linkUrl,
      fileName: `${documentNumber}.pdf`,
      summary: notes || result.aiAnalysis?.productNames?.join(", ") || result.documentTitle,
      detailUrl: linkUrl,
      notes: notes || undefined,
      tags: result.aiAnalysis?.productNames?.slice(0, 5).join(", "),
    };

    const created = await createDocumentMutation.mutateAsync(createPayload);
    const savedDocumentId = created?.document?.id;

    if (!savedDocumentId) {
      toast.error("Không nhận được ID tài liệu sau khi lưu");
      return;
    }

    await processDocumentMutation.mutateAsync({
      documentId: String(savedDocumentId),
      fileName: `${documentNumber}.pdf`,
      fileUrl: linkUrl,
      rawText: result.rawText,
    });

    setLinkUrl("");
    setDocumentNumber("");
    setDocumentTitle("");
    setNotes("");
    setResult(null);
  };

  const hasSuccessResult = result?.status === "success";

  const aiSummary = useMemo(() => {
    if (!result?.aiAnalysis) return null;
    const codes = result.aiAnalysis.hsCodes?.slice(0, 5) ?? [];
    const products = result.aiAnalysis.productNames?.slice(0, 5) ?? [];
    return { codes, products };
  }, [result]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Xử lý liên kết PDF rời
        </CardTitle>
        <CardDescription>
          Tải liên kết PDF từ trang Hải quan, nhận diện thông tin và lưu thành tài liệu nội bộ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Số hiệu văn bản *</label>
              <Input
                placeholder="VD: 29001/TB-CHQ"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tiêu đề *</label>
              <Input
                placeholder="Tiêu đề văn bản"
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Liên kết PDF từ Hải quan *</label>
            <Input
              placeholder="https://files.customs.gov.vn/...pdf"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ghi chú</label>
            <Textarea
              placeholder="Ghi chú nội bộ, phân loại, từ khóa..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={processLinkMutation.isLoading}>
            {processLinkMutation.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Phân tích liên kết
          </Button>
        </form>

        {result && (
          <div className="space-y-4 rounded-lg border border-dashed border-slate-200 p-4">
            {result.status === "failed" && (
              <div className="flex items-start gap-3 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-medium">Không thể xử lý liên kết</p>
                  <p>{result.error || "Hãy kiểm tra lại địa chỉ PDF và thử lại"}</p>
                </div>
              </div>
            )}

            {hasSuccessResult && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                    {result.extractedData?.hsCodes.length ?? 0} mã HS
                  </Badge>
                  <Badge variant="secondary" className="bg-sky-50 text-sky-700">
                    {result.extractedData?.productNames.length ?? 0} tên hàng
                  </Badge>
                  {result.aiAnalysis && (
                    <Badge className="bg-purple-100 text-purple-700">
                      {result.aiAnalysis.confidence}% tin cậy
                    </Badge>
                  )}
                </div>

                {aiSummary && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <h4 className="text-sm font-semibold">Mã HS gợi ý</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiSummary.codes.length > 0 ? (
                          aiSummary.codes.map((code) => (
                            <Badge key={code} variant="outline" className="border-blue-200 text-blue-700">
                              {code}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">Chưa có mã HS nổi bật</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <h4 className="text-sm font-semibold">Tên hàng nhận diện</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiSummary.products.length > 0 ? (
                          aiSummary.products.map((name) => (
                            <Badge key={name} variant="outline" className="border-emerald-200 text-emerald-700">
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">Chưa có tên hàng nổi bật</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="secondary"
                  disabled={isBusy || !hasSuccessResult}
                  onClick={handleSaveDocument}
                  className="w-full md:w-auto"
                >
                  {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Lưu thành tài liệu trong hệ thống
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
