import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="empty-state error-state" role="alert">
          <AlertCircle size={40} className="error-icon" />
          <h3>Сталася помилка</h3>
          <p>{this.state.error?.message || 'Невідома помилка'}</p>
          <p className="error-hint">
            Спробуйте перезавантажити сторінку або зайдіть пізніше.
          </p>
          <button
            className="filter-btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px' }}
          >
            Перезавантажити
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
