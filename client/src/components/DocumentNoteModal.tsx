import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentNoteModalProps {
  isOpen: boolean;
  documentNumber: string;
  initialNotes: string;
  initialTags: string[];
  onClose: () => void;
  onSave: (notes: string, tags: string[]) => Promise<void>;
}

export default function DocumentNoteModal({
  isOpen,
  documentNumber,
  initialNotes,
  initialTags,
  onClose,
  onSave,
}: DocumentNoteModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
    setTags(initialTags);
  }, [initialNotes, initialTags]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(notes, tags);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Ghi chú & Tag</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">{documentNumber}</p>

        {/* Notes Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thêm ghi chú cho tài liệu này..."
            className="w-full px-3 py-2 border rounded text-sm h-24 resize-none"
          />
        </div>

        {/* Tags Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Tag</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Nhập tag (Enter để thêm)..."
              className="flex-1 px-3 py-2 border rounded text-sm"
            />
            <Button
              onClick={handleAddTag}
              size="sm"
              variant="outline"
            >
              Thêm
            </Button>
          </div>

          {/* Display Tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </div>
  );
}
