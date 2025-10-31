import React, { useState } from "react";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";

interface AnalysisLink {
  documentId: string;
  documentNumber: string;
  title: string;
  issuingAgency: string;
  issueDate: string;
  summary: string;
  confidence: number;
  extractedHsCodes: string[];
  extractedProductNames: string[];
}

interface HsCodeAnalysisLinkProps {
  hsCode: string;
  analysisLinks?: AnalysisLink[];
  loading?: boolean;
}

/**
 * Component hiển thị liên kết phân tích cho HS code
 * Cho phép người dùng xem các tài liệu phân tích liên quan
 */
export const HsCodeAnalysisLink: React.FC<HsCodeAnalysisLinkProps> = ({
  hsCode,
  analysisLinks = [],
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!analysisLinks || analysisLinks.length === 0) {
    return (
      <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
        <AlertCircle size={14} />
        <span>Chưa có tài liệu phân tích liên quan</span>
      </div>
    );
  }

  return (
    <div className="mt-3 border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">
            Liên kết phân tích ({analysisLinks.length})
          </span>
        </div>
        <span className="text-xs text-blue-600">
          {expanded ? "▼" : "▶"}
        </span>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {analysisLinks.map((link, index) => (
            <div
              key={`${link.documentId}-${index}`}
              className="bg-white p-2 rounded border border-blue-200 hover:border-blue-400 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-blue-600 mt-0.5">
                      {link.documentNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {link.title}
                      </p>
                      <p className="text-xs text-gray-600">
                        {link.issuingAgency} • {link.issueDate}
                      </p>
                    </div>
                  </div>

                  {/* Hiển thị độ tin cậy */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-xs">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${link.confidence * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {(link.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Hiển thị HS codes được trích xuất */}
                  {link.extractedHsCodes.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-gray-700">
                        HS codes:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {link.extractedHsCodes.slice(0, 3).map((code) => (
                          <span
                            key={code}
                            className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs"
                          >
                            {code}
                          </span>
                        ))}
                        {link.extractedHsCodes.length > 3 && (
                          <span className="inline-block text-xs text-gray-600">
                            +{link.extractedHsCodes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hiển thị tên hàng được trích xuất */}
                  {link.extractedProductNames.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-gray-700">
                        Products:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {link.extractedProductNames.slice(0, 3).map((name) => (
                          <span
                            key={name}
                            className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs"
                          >
                            {name}
                          </span>
                        ))}
                        {link.extractedProductNames.length > 3 && (
                          <span className="inline-block text-xs text-gray-600">
                            +{link.extractedProductNames.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nút xem chi tiết */}
                <a
                  href={`/documents/${link.documentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-blue-600 hover:text-blue-800 mt-0.5"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HsCodeAnalysisLink;
