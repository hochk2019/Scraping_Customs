import {
  extractHsCodesFromText,
  extractProductNamesFromText,
  processOcr,
} from "../ocr-processor";
import { loadProductKeywordGroups } from "../product-keyword-service";
import {
  clearExtractedData,
  deleteOcrResultsByDocumentId,
  getDocumentById,
  recordOcrJobCompletion,
  recordOcrJobStart,
  recordQueueJobFailure,
  recordQueueJobStart,
  recordQueueJobSuccess,
  saveExtractedData,
  saveOcrResult,
  saveOcrStatistics,
  updateDocumentOcrResult,
  updateProcessedStatus,
} from "../db";
import {
  markJobActive,
  markJobCompleted,
  markJobFailed,
} from "../telemetry/queue-metrics";

export interface ProcessOcrDocumentInput {
  documentId: number;
  fileName: string;
  fileUrl: string;
  rawText?: string;
  jobId?: string;
}

export interface ProcessOcrDocumentResult {
  success: boolean;
  documentId: number;
  fileName: string;
  hsCodes: string[];
  productNames: string[];
  confidence: number;
  processedAt: Date;
  textLength: number;
  wordCount: number;
  jobId: string;
  error?: string;
}

export async function processOcrDocument(
  input: ProcessOcrDocumentInput,
): Promise<ProcessOcrDocumentResult> {
  const { documentId, fileName, fileUrl, rawText, jobId } = input;
  const resolvedJobId = jobId ?? `inline-${documentId}-${Date.now()}`;
  const startedAt = Date.now();

  await Promise.all([
    recordQueueJobStart({
      jobId: resolvedJobId,
      documentId,
      type: "ocr",
      payload: JSON.stringify({ documentId, fileName, fileUrl }),
    }),
    recordOcrJobStart({
      jobId: resolvedJobId,
      documentId,
      engine: "builtin",
    }),
  ]);

  markJobActive("ocr");

  try {
    let textToProcess = rawText?.trim() ?? "";
    let hsCodes: string[] = [];
    let productNames: string[] = [];
    let confidence = 0;
    let normalizedText = textToProcess;

    if (!textToProcess) {
      const ocrResult = await processOcr(
        String(documentId),
        fileName,
        fileUrl,
      );
      normalizedText = ocrResult.rawText.normalize("NFC");
      textToProcess = normalizedText.trim();
      hsCodes = ocrResult.extractedHsCodes;
      productNames = ocrResult.extractedProductNames;
      confidence = ocrResult.confidence;
    } else {
      const keywordGroups = await loadProductKeywordGroups();
      normalizedText = textToProcess.normalize("NFC");
      hsCodes = extractHsCodesFromText(normalizedText);
      productNames = extractProductNamesFromText(normalizedText, keywordGroups);
      const totalIndicators = hsCodes.length + productNames.length;
      const wordCount = normalizedText ? normalizedText.split(/\s+/).length : 0;
      confidence =
        totalIndicators === 0
          ? 0
          : Math.min(1, totalIndicators / Math.max(wordCount, 10));
    }

    const trimmed = normalizedText.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const textLength = trimmed.length;
    const confidenceScore = Math.round(confidence * 100);

    await clearExtractedData(documentId);
    await deleteOcrResultsByDocumentId(documentId);

    await Promise.all([
      ...hsCodes.map((code) =>
        saveExtractedData(documentId, "hs_code", code, confidenceScore),
      ),
      ...productNames.map((name) =>
        saveExtractedData(documentId, "product_name", name, confidenceScore),
      ),
    ]);

    const dbDocument = await getDocumentById(documentId);
    const documentNumber = dbDocument?.documentNumber ?? String(documentId);
    const documentTitle = dbDocument?.title ?? fileName;

    await saveOcrResult({
      documentId,
      documentNumber,
      documentTitle,
      linkUrl: fileUrl,
      status: "success",
      extractedText: normalizedText,
      hsCodes: JSON.stringify(hsCodes),
      productNames: JSON.stringify(productNames),
      textLength,
      wordCount,
      processingTime: Date.now() - startedAt,
    });

    await saveOcrStatistics({
      documentId,
      totalLinks: 1,
      successfulLinks: 1,
      failedLinks: 0,
      totalHsCodes: hsCodes.length,
      uniqueHsCodes: new Set(hsCodes).size,
      totalProductNames: productNames.length,
      uniqueProductNames: new Set(productNames).size,
      totalTextLength: textLength,
      totalWordCount: wordCount,
      successRate: 100,
    });

    await updateDocumentOcrResult(String(documentId), {
      extractedHsCodes: hsCodes,
      extractedProductNames: productNames,
      confidence,
      rawText: normalizedText,
    });
    await updateProcessedStatus(documentId, "processed");

    const durationMs = Date.now() - startedAt;

    await Promise.all([
      recordQueueJobSuccess({ jobId: resolvedJobId, durationMs }),
      recordOcrJobCompletion({
        jobId: resolvedJobId,
        status: "completed",
        durationMs,
        confidence,
      }),
    ]);

    markJobCompleted("ocr", durationMs);

    return {
      success: true,
      documentId,
      fileName,
      hsCodes,
      productNames,
      confidence,
      processedAt: new Date(),
      textLength,
      wordCount,
      jobId: resolvedJobId,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await Promise.all([
      recordQueueJobFailure({ jobId: resolvedJobId, errorMessage }),
      recordOcrJobCompletion({
        jobId: resolvedJobId,
        status: "failed",
        durationMs,
        errorMessage,
      }),
    ]);

    markJobFailed("ocr");

    return {
      success: false,
      documentId,
      fileName,
      hsCodes: [],
      productNames: [],
      confidence: 0,
      processedAt: new Date(),
      textLength: 0,
      wordCount: 0,
      jobId: resolvedJobId,
      error: errorMessage,
    };
  }
}
