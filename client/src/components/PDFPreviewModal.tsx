import React, { useState } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFPreviewModalProps {
  isOpen: boolean;
  documentNumber: string;
  title: string;
  fileUrl: string;
  onClose: () => void;
}

export default function PDFPreviewModal({
  isOpen,
  documentNumber,
  title,
  fileUrl,
  onClose,
}: PDFPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{documentNumber}</h2>
            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
          {isLoading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải PDF...</p>
            </div>
          )}
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            title={documentNumber}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Đóng
          </Button>
          <Button
            asChild
            className="gap-2"
          >
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4" />
              Mở trong tab mới
            </a>
          </Button>
          <Button
            asChild
            className="gap-2"
          >
            <a
              href={fileUrl}
              download
            >
              <Download className="w-4 h-4" />
              Tải xuống
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
