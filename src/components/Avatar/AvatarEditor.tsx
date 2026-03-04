import React, { useState } from 'react';
import { AvatarConfig } from '../../types';
import { AvatarStyle, getRandomSeed, getAvatarUrl } from '../../utils/avatarUtils';
import { RefreshCw, Check, X } from 'lucide-react';

interface AvatarEditorProps {
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onCancel: () => void;
}

const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: 'bottts', label: 'Robot' },
  { value: 'fun-emoji', label: 'Emoji' },
  { value: 'icons', label: 'Biểu tượng' },
  { value: 'adventurer', label: 'Phiêu lưu' },
  { value: 'avataaars', label: 'Hoạt hình' },
  { value: 'lorelei', label: 'Nghệ thuật' },
  { value: 'initials', label: 'Chữ cái' },
];

const BACKGROUND_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'fdcdc5', 'd4e09b', '90d5b6'
];

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ initialConfig, onSave, onCancel }) => {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [previewUrl, setPreviewUrl] = useState(getAvatarUrl({
    seed: initialConfig.seed,
    style: initialConfig.style as AvatarStyle,
    backgroundColor: initialConfig.backgroundColor,
    size: 128
  }));

  const updateConfig = (newConfig: Partial<AvatarConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    setPreviewUrl(getAvatarUrl({
      seed: updated.seed,
      style: updated.style as AvatarStyle,
      backgroundColor: updated.backgroundColor,
      size: 128
    }));
  };

  const handleRandomize = () => {
    updateConfig({ seed: getRandomSeed() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Tùy chỉnh Avatar</h2>
          
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <img 
                src={previewUrl} 
                alt="Avatar Preview" 
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-50"
              />
              <button
                onClick={handleRandomize}
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                title="Ngẫu nhiên hóa"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phong cách</label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => updateConfig({ style: style.value })}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      config.style === style.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Màu nền</label>
              <div className="flex flex-wrap gap-3">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateConfig({ backgroundColor: color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      config.backgroundColor === color ? 'border-indigo-600 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: `#${color}` }}
                    title={`#${color}`}
                  />
                ))}
                <button
                  onClick={() => updateConfig({ backgroundColor: undefined })}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white text-gray-400 ${
                    !config.backgroundColor ? 'border-indigo-600 text-indigo-600' : 'border-gray-200'
                  }`}
                  title="Không màu nền"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => onSave(config)}
            className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Check size={18} />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};
