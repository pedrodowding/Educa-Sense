import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50 text-red-900">
          <h1 className="text-2xl font-bold mb-4">Algo deu errado 😢</h1>
          <p className="mb-4">Ocorreu um erro inesperado na aplicação.</p>
          <div className="bg-white p-4 rounded shadow overflow-auto max-w-full w-full">
            <p className="font-mono text-sm text-red-600 font-bold mb-2">
              {this.state.error && this.state.error.toString()}
            </p>
            <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg font-bold shadow hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
