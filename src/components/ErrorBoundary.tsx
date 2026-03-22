import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let isQuotaError = false;
      let errorData: any = null;

      try {
        errorData = JSON.parse(this.state.error?.message || '{}');
        isQuotaError = errorData.error?.includes('Quota exceeded');
      } catch (e) {
        // Not a JSON error
      }

      if (isQuotaError) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Giới hạn truy cập đã hết</h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Hệ thống đang sử dụng gói Firebase miễn phí và đã đạt giới hạn truy cập (Quota) trong ngày hôm nay. 
                Dữ liệu sẽ tự động được khôi phục vào ngày mai.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  Thử tải lại trang
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Quay về trang chủ
                </button>
              </div>
              <p className="mt-8 text-xs text-gray-400">
                Chi tiết lỗi: Quota exceeded ({errorData?.path || 'unknown path'})
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Đã có lỗi xảy ra</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Rất tiếc, ứng dụng đã gặp một lỗi không mong muốn. Vui lòng thử tải lại trang.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Tải lại trang
            </button>
            <p className="mt-8 text-xs text-gray-400 text-left overflow-hidden text-ellipsis whitespace-nowrap">
              {this.state.error?.toString()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
