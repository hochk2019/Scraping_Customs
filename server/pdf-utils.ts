import * as pdfParseModule from "pdf-parse";

export type PdfParseResult = { text?: string } | { [key: string]: unknown };

export type PdfParseFunction = (data: Buffer) => Promise<PdfParseResult>;

const pdfParse: PdfParseFunction =
  typeof (pdfParseModule as { default?: unknown }).default === "function"
    ? ((pdfParseModule as { default: PdfParseFunction }).default)
    : async (buffer: Buffer) => {
        const ParserCtor = (pdfParseModule as {
          PDFParse?: new (options: { data: Buffer }) => {
            getText: () => Promise<PdfParseResult>;
            destroy: () => Promise<void>;
          };
        }).PDFParse;

        if (!ParserCtor) {
          throw new Error("pdf-parse module không cung cấp PDFParse");
        }

        const parser = new ParserCtor({ data: buffer });
        try {
          return await parser.getText();
        } finally {
          try {
            await parser.destroy();
          } catch (destroyError) {
            console.warn("[PDF] Lỗi giải phóng tài nguyên:", destroyError);
          }
        }
      };

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  const candidate = (data as { text?: unknown }).text;
  const rawText = typeof candidate === "string" ? candidate : "";

  return rawText.normalize("NFC");
}
