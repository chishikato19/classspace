import React, { useState } from 'react';
import { X, Plus, Youtube } from 'lucide-react';

interface AddVideoModalProps {
  onClose: () => void;
  onAdd: (title: string, url: string) => Promise<void>;
}

export default function AddVideoModal({ onClose, onAdd }: AddVideoModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;

    setLoading(true);
    setError('');
    try {
      await onAdd(title, url);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể thêm video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Youtube className="w-5 h-5" />
            Thêm Video YouTube
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-indigo-700 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên video</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ví dụ: Nhạc không lời tập trung"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link YouTube</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="mt-1 text-xs text-gray-500 italic">Hỗ trợ link watch?v= hoặc youtu.be/</p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Đang thêm...' : (
                <>
                  <Plus className="w-4 h-4" />
                  Thêm ngay
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
