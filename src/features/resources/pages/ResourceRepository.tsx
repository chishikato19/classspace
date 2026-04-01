import React, { useState, useEffect } from 'react';
import { driveService, DriveFile } from '../services/driveService';
import { Folder, FileText, Presentation, File, X, Maximize2, Loader2, LogIn, Search, ChevronRight, Image as ImageIcon, PenTool, AlertTriangle } from 'lucide-react';
import PdfViewer from '../components/PdfViewer';

export default function ResourceRepository() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [actionPromptFile, setActionPromptFile] = useState<DriveFile | null>(null);
  const [viewerMode, setViewerMode] = useState<'preview' | 'present' | 'draw' | 'ms-present' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, name: string}[]>([{ id: 'root', name: 'Drive của tôi' }]);
  
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  useEffect(() => {
    if (driveService.getAccessToken()) {
      setIsConnected(true);
      loadFiles('root');
    }
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await driveService.authenticate();
      setIsConnected(true);
      await loadFiles('root');
    } catch (err: any) {
      console.error('Failed to connect to Google Drive:', err);
      setError('Không thể kết nối với Google Drive. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async (folderId: string, pageToken?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await driveService.fetchFiles(folderId, pageToken);
      if (pageToken) {
        setFiles(prev => [...prev, ...response.files]);
      } else {
        setFiles(response.files);
      }
      setNextPageToken(response.nextPageToken);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      
      let errorMsg = err.message || 'Lỗi khi tải danh sách tài liệu. Có thể phiên kết nối đã hết hạn.';
      let errorElement: React.ReactNode = errorMsg;
      
      if (errorMsg.includes('has not been used in project') || errorMsg.includes('disabled')) {
        // Extract the URL from the error message if possible
        const urlMatch = errorMsg.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/drive\.googleapis\.com\/overview\?project=\d+/);
        const url = urlMatch ? urlMatch[0] : 'https://console.cloud.google.com/apis/library/drive.googleapis.com';
        
        errorElement = (
          <div className="flex flex-col gap-3 w-full">
            <p className="font-bold text-lg">⚠️ Google Drive API chưa được kích hoạt</p>
            <p>Để sử dụng tính năng này, bạn bắt buộc phải bật API trên Google Cloud Console cho dự án của mình.</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-center hover:bg-red-700 transition-colors w-fit mt-2 mb-2 shadow-sm"
            >
              Bấm vào đây để Bật Google Drive API
            </a>
            <p className="text-sm opacity-90">
              <em>Lưu ý quan trọng: Sau khi bấm "Enable" (Bật) trên trang của Google, <strong>hệ thống sẽ mất khoảng 3-5 phút để cập nhật</strong>. Vui lòng chờ một lát rồi mới bấm "Kết nối lại" ở bên dưới.</em>
            </p>
          </div>
        );
      } else if (errorMsg.includes('Insufficient Permission') || errorMsg.includes('insufficient authentication scopes') || errorMsg.includes('lacks permissions')) {
        errorElement = 'Ứng dụng chưa được cấp quyền truy cập Google Drive. Vui lòng bấm "Kết nối lại" và đảm bảo bạn đã ĐÁNH DẤU TÍCH chọn quyền truy cập Google Drive ở màn hình đăng nhập của Google.';
      }
      
      setError(errorElement as any); // Store the React node in the error state
      setIsConnected(false); // Force reconnect
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folder: {id: string, name: string}, index?: number) => {
    if (index !== undefined) {
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    } else {
      setBreadcrumbs(prev => [...prev, folder]);
    }
    setFiles([]);
    setNextPageToken(undefined);
    loadFiles(folder.id);
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder({ id: file.id, name: file.name });
    } else {
      setActionPromptFile(file);
    }
  };

  const openFile = (file: DriveFile, mode: 'preview' | 'present' | 'draw') => {
    setSelectedFile(file);
    setViewerMode(mode);
    setActionPromptFile(null);
  };

  const closeViewer = async () => {
    setSelectedFile(null);
    setViewerMode(null);
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPresentation = (mimeType: string) => {
    return mimeType.includes('presentation') || mimeType.includes('powerpoint');
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-8 h-8 text-indigo-500 fill-indigo-100" />;
    }
    if (isPresentation(mimeType)) {
      return <Presentation className="w-8 h-8 text-orange-500" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (mimeType.includes('document') || mimeType.includes('word')) {
      return <FileText className="w-8 h-8 text-blue-500" />;
    }
    if (isImage(mimeType)) {
      return <ImageIcon className="w-8 h-8 text-green-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const getEmbedUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  const getPdfExportUrl = (fileId: string, mimeType: string) => {
    if (mimeType === 'application/pdf' || isImage(mimeType)) {
      return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }
    // Export Word documents to PDF
    return `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
  };

  const isPdfOrWordOrImage = (mimeType: string) => {
    if (isPresentation(mimeType)) return false;
    return mimeType === 'application/pdf' || 
           mimeType.includes('document') || 
           mimeType.includes('word') ||
           isImage(mimeType);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Folder className="w-6 h-6 text-indigo-600" />
            Kho tài nguyên
          </h1>
          <p className="text-gray-500 mt-1">
            Kết nối Google Drive để mở và trình chiếu tài liệu (PowerPoint, Word, PDF) trực tiếp trên lớp.
          </p>
        </div>
      </div>

      {!isConnected ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Folder className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Kết nối Google Drive</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Cho phép ứng dụng truy cập vào Google Drive của bạn để hiển thị và trình chiếu các file tài liệu.
          </p>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Kết nối ngay
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 overflow-x-auto pb-2">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <button
                  onClick={() => navigateToFolder(crumb, index)}
                  className="hover:text-indigo-600 hover:underline whitespace-nowrap font-medium"
                >
                  {crumb.name}
                </button>
                {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tài liệu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              {files.length} tài liệu
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={handleConnect} className="font-medium underline">Kết nối lại</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="group border border-gray-200 rounded-xl p-4 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  {getFileIcon(file.mimeType)}
                </div>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2" title={file.name}>
                  {file.name}
                </h3>
              </div>
            ))}
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          )}

          {!isLoading && files.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              Thư mục này trống hoặc không có tài liệu (Word, PDF, PowerPoint) nào.
            </div>
          )}

          {!isLoading && files.length > 0 && filteredFiles.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              Không tìm thấy tài liệu nào phù hợp với từ khóa "{searchQuery}".
            </div>
          )}

          {nextPageToken && !isLoading && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => loadFiles(currentFolderId, nextPageToken)}
                className="px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Tải thêm
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Prompt Modal */}
      {actionPromptFile && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 truncate">Mở tài liệu: {actionPromptFile.name}</h3>
            <div className="space-y-3">
              {isPresentation(actionPromptFile.mimeType) ? (
                <>
                  <button onClick={() => openFile(actionPromptFile, 'preview')} className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left">
                    <div className="bg-blue-100 p-2 rounded-lg"><FileText className="w-6 h-6 text-blue-600" /></div>
                    <div>
                      <div className="font-medium text-gray-900">Chỉ xem</div>
                      <div className="text-sm text-gray-500">Xem lướt qua toàn bộ các trang</div>
                    </div>
                  </button>
                  {isPresentation(actionPromptFile.mimeType) && (
                    <button onClick={() => openFile(actionPromptFile, 'present')} className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left">
                      <div className="bg-orange-100 p-2 rounded-lg"><Presentation className="w-6 h-6 text-orange-600" /></div>
                      <div>
                        <div className="font-medium text-gray-900">Trình chiếu</div>
                        <div className="text-sm text-gray-500">Chiếu từng slide toàn màn hình</div>
                      </div>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => openFile(actionPromptFile, 'preview')} className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left">
                    <div className="bg-gray-100 p-2 rounded-lg"><File className="w-6 h-6 text-gray-600" /></div>
                    <div>
                      <div className="font-medium text-gray-900">Chỉ xem</div>
                      <div className="text-sm text-gray-500">Mở nhanh để đọc nội dung</div>
                    </div>
                  </button>
                  <button onClick={() => openFile(actionPromptFile, 'draw')} className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left">
                    <div className="bg-indigo-100 p-2 rounded-lg"><PenTool className="w-6 h-6 text-indigo-600" /></div>
                    <div>
                      <div className="font-medium text-gray-900">Vẽ / Ghi chú</div>
                      <div className="text-sm text-gray-500">Mở bảng tương tác để vẽ lên tài liệu</div>
                    </div>
                  </button>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setActionPromptFile(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {selectedFile && viewerMode && (
        viewerMode === 'draw' && isPdfOrWordOrImage(selectedFile.mimeType) && driveService.getAccessToken() ? (
          <PdfViewer
            fileUrl={getPdfExportUrl(selectedFile.id, selectedFile.mimeType)}
            fileName={selectedFile.name}
            mimeType={selectedFile.mimeType}
            onClose={() => { setSelectedFile(null); setViewerMode(null); }}
            accessToken={driveService.getAccessToken()!}
          />
        ) : (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
            <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
              <h3 className="font-medium truncate max-w-2xl">{selectedFile.name}</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const el = document.getElementById('file-viewer-container');
                    if (el) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        el.requestFullscreen();
                      }
                    }
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Toàn màn hình"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={closeViewer}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Đóng"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div id="file-viewer-container" className="flex-1 w-full bg-gray-100 relative">
              <iframe
                src={
                  viewerMode === 'present' && isPresentation(selectedFile.mimeType)
                    ? `https://drive.google.com/file/d/${selectedFile.id}/preview?rm=minimal` 
                    : getEmbedUrl(selectedFile.id)
                }
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                title={selectedFile.name}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}
