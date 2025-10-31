import React, { useEffect, useState } from 'react';
import { Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrapeProgressModalProps {
  isOpen: boolean;
  currentPage: number;
  totalPages: number;
  documentsFound: number;
  documentsProcessed: number;
  startTime: Date | null;
  isCompleted?: boolean;
  recentDocuments?: Array<{ documentNumber: string; title: string; issueDate: string }>;
  onCancel?: () => void;
}

export default function ScrapeProgressModal({
  isOpen,
  currentPage,
  totalPages,
  documentsFound,
  documentsProcessed,
  startTime,
  isCompleted = false,
  recentDocuments = [],
  onCancel,
}: ScrapeProgressModalProps) {
  const [shouldAutoClose, setShouldAutoClose] = useState(false);

  // Tự động ẩn modal sau 3 giây khi hoàn tất
  useEffect(() => {
    if (isCompleted) {
      setShouldAutoClose(true);
      const timer = setTimeout(() => {
        setShouldAutoClose(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  if (!isOpen && !shouldAutoClose) return null;

  const elapsedSeconds = startTime
    ? Math.floor((Date.now() - startTime.getTime()) / 1000)
    : 0;
  
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;

  // Ước tính thời gian còn lại
  const averageTimePerPage = elapsedSeconds / (currentPage || 1);
  const remainingPages = totalPages - currentPage;
  const estimatedRemainingSeconds = Math.floor(averageTimePerPage * remainingPages);
  const estimatedRemainingMinutes = Math.floor(estimatedRemainingSeconds / 60);
  const estimatedRemainingSecs = estimatedRemainingSeconds % 60;

  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            )}
            <h2 className="text-xl font-bold">
              {isCompleted ? 'Thu thập hoàn tất!' : 'Đang thu thập dữ liệu'}
            </h2>
          </div>
          {!isCompleted && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Hủy"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {!isCompleted && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Tiến độ trang</span>
              <span className="text-sm font-bold text-blue-600">
                {currentPage}/{totalPages} ({Math.round(progressPercentage)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Tài liệu tìm thấy</div>
            <div className="text-2xl font-bold text-blue-600">{documentsFound}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Đã xử lý</div>
            <div className="text-2xl font-bold text-green-600">{documentsProcessed}</div>
          </div>
        </div>

        {/* Time Info */}
        {!isCompleted && (
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Thời gian đã trôi qua:</span>
              <span className="font-mono font-bold">
                {elapsedMinutes}m {elapsedSecs}s
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Thời gian còn lại (ước tính):</span>
              <span className="font-mono font-bold text-orange-600">
                {estimatedRemainingMinutes}m {estimatedRemainingSecs}s
              </span>
            </div>
          </div>
        )}

        {/* Recent Documents Preview */}
        {recentDocuments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Kết quả gần đây</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentDocuments.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="bg-gray-50 rounded p-3 text-xs">
                  <div className="font-semibold text-gray-800 truncate">{doc.documentNumber}</div>
                  <div className="text-gray-600 line-clamp-2">{doc.title}</div>
                  <div className="text-gray-500 text-xs mt-1">{doc.issueDate}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading Animation or Success Message */}
        {!isCompleted && (
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        {isCompleted && (
          <div className="mb-6 text-center">
            <p className="text-green-600 font-semibold">
              Đã thu thập {documentsFound} tài liệu thành công!
            </p>
          </div>
        )}

        {/* Cancel Button */}
        {!isCompleted && (
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Hủy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
