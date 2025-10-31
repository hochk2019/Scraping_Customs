import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ScrapingProgressProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export function ScrapingProgress({ isVisible = true, onClose }: ScrapingProgressProps) {
  const [progress, setProgress] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isVisible) return;

    const fetchProgress = async () => {
      try {
        const progressRes = await fetch("/api/trpc/progress.getProgress");
        const statsRes = await fetch("/api/trpc/progress.getStats");
        const errorsRes = await fetch("/api/trpc/progress.getErrors");

        if (progressRes.ok && statsRes.ok && errorsRes.ok) {
          const progressData = await progressRes.json();
          const statsData = await statsRes.json();
          const errorsData = await errorsRes.json();

          setProgress(progressData.result?.data);
          setStats(statsData.result?.data);
          setErrors(errorsData.result?.data || []);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };

    const interval = setInterval(fetchProgress, 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    // Initial fetch
    const fetchProgress = async () => {
      try {
        const progressRes = await fetch("/api/trpc/progress.getProgress");
        const statsRes = await fetch("/api/trpc/progress.getStats");
        const errorsRes = await fetch("/api/trpc/progress.getErrors");

        if (progressRes.ok && statsRes.ok && errorsRes.ok) {
          const progressData = await progressRes.json();
          const statsData = await statsRes.json();
          const errorsData = await errorsRes.json();

          setProgress(progressData.result?.data);
          setStats(statsData.result?.data);
          setErrors(errorsData.result?.data || []);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };
    fetchProgress();
  }, [isVisible]);

  if (!isVisible || !progress) {
    return null;
  }

  const percentage = stats?.percentage || 0;
  const successRate = stats?.successRate || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Scraping Progress</h2>
            <p className="text-blue-100 text-sm mt-1">
              {progress.isRunning ? "Đang chạy..." : "Hoàn thành"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded p-2 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-700">Tiến trình</span>
              <span className="text-lg font-bold text-blue-600">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Tổng mục</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalItems || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Thành công</p>
              <p className="text-2xl font-bold text-green-600">{stats?.successItems || 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Thất bại</p>
              <p className="text-2xl font-bold text-red-600">{stats?.failedItems || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-gray-600 text-sm">Tỷ lệ thành công</p>
              <p className="text-2xl font-bold text-purple-600">{successRate}%</p>
            </div>
          </div>

          {/* Current Item */}
          {progress.currentItem && (
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">Đang xử lý</p>
              <p className="font-semibold text-gray-800 truncate">{progress.currentItem}</p>
              {progress.currentStage && (
                <p className="text-xs text-blue-600 mt-1">
                  Công đoạn: <span className="font-semibold">{progress.currentStage}</span>
                </p>
              )}
            </div>
          )}

          {/* Duration */}
          {stats?.duration !== undefined && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={16} />
              <span>Thời gian: {stats.duration}s</span>
            </div>
          )}

          {/* Errors Section */}
          {errors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-red-600" />
                <h3 className="font-semibold text-gray-800">
                  Lỗi ({errors.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 rounded-lg p-3 border border-red-200 cursor-pointer hover:bg-red-100 transition"
                    onClick={() => {
                      const newExpanded = new Set(expandedErrors);
                      if (newExpanded.has(idx)) {
                        newExpanded.delete(idx);
                      } else {
                        newExpanded.add(idx);
                      }
                      setExpandedErrors(newExpanded);
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {error.item}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Công đoạn: <span className="font-semibold">{error.stage}</span>
                        </p>
                        {error.retryCount > 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            Thử lại: {error.retryCount} lần
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {expandedErrors.has(idx) && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <p className="text-xs text-red-700 font-mono break-words">
                          {error.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {!progress.isRunning && stats?.failedItems === 0 && (
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Scraping thành công!</p>
                <p className="text-sm text-green-700">
                  Đã thu thập {stats?.successItems} mục thành công
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
