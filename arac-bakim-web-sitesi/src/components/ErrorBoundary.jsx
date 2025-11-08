import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bir Hata Oluştu</h2>
            <p className="text-gray-600 mb-4">
              Sayfa yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="bg-[#26a9e0] hover:bg-[#1e8fc4] text-white font-medium px-6 py-2 rounded-md transition-colors"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

