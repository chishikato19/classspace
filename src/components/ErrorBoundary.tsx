import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-red-900/50 border border-red-500 p-6 rounded-xl max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Đã xảy ra lỗi ứng dụng</h1>
            <p className="mb-4 text-gray-300">
              Nếu bạn đang dùng <strong>Cốc Cốc</strong> hoặc trình duyệt chặn quảng cáo, vui lòng <strong>tắt Khiên bảo vệ (Adblock)</strong> hoặc cho phép cookie của bên thứ ba để ứng dụng hoạt động.
            </p>
            <div className="bg-black/50 p-4 rounded text-left overflow-auto text-sm font-mono text-red-300">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
