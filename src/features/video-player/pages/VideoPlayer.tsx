import React, { useState, useEffect } from 'react';
import { Youtube, Plus, Trash2, Play, LayoutGrid, List as ListIcon, Maximize, Minimize } from 'lucide-react';
import { videoService, VideoData } from '../services/videoService';
import AddVideoModal from '../components/AddVideoModal';

export default function VideoPlayer() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await videoService.getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (title: string, url: string) => {
    await videoService.addVideo(title, url);
    await loadVideos();
  };

  const handleDeleteVideo = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    
    try {
      await videoService.deleteVideo(videoId);
      if (selectedVideo?.id === videoId) setSelectedVideo(null);
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const extractYoutubeId = (url: string) => {
    return videoService.extractYoutubeId(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Youtube className="w-8 h-8 text-red-600" />
            Thư viện Video YouTube
          </h1>
          <p className="text-gray-500">Lưu trữ và trình chiếu các video YouTube trực tiếp.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Dạng danh sách"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm video
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Section */}
        <div className={`lg:col-span-2 space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-4 flex flex-col' : ''}`}>
          {selectedVideo ? (
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${isFullscreen ? 'h-full border-0 rounded-none' : ''}`}>
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(selectedVideo.url)}?autoplay=1`}
                  title={selectedVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-4 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedVideo.title}</h2>
                  <p className="text-sm text-gray-500 truncate max-w-md">{selectedVideo.url}</p>
                </div>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                >
                  {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <Youtube className="w-16 h-16 opacity-20" />
              <p className="font-medium">Chọn một video từ danh sách để bắt đầu trình chiếu</p>
            </div>
          )}
        </div>

        {/* List Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-700">Danh sách video ({videos.length})</h3>
              <span className="text-xs text-gray-400 italic">Nhấn để phát</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {loading ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-500">Đang tải danh sách...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <Youtube className="w-12 h-12 mx-auto opacity-20" />
                  <p className="text-sm">Chưa có video nào trong thư viện.</p>
                </div>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedVideo?.id === video.id 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                        : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative w-24 aspect-video bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      <img 
                        src={`https://img.youtube.com/vi/${extractYoutubeId(video.url)}/mqdefault.jpg`} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <Play className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm truncate ${selectedVideo?.id === video.id ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {video.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">{video.url}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteVideo(e, video.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Xóa video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddVideoModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddVideo} 
        />
      )}
    </div>
  );
}
