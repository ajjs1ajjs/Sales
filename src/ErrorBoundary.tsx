import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorBoundaryLabels {
  title: string;
  message: string;
  hint: string;
  reload: string;
}

interface Props {
  children: ReactNode;
  labels?: ErrorBoundaryLabels;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const DEFAULT_LABELS: ErrorBoundaryLabels = {
  title: 'Сталася помилка',
  message: 'Невідома помилка',
  hint: 'Спробуйте перезавантажити сторінку або зайдіть пізніше.',
  reload: 'Перезавантажити',
};

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
      const l = this.props.labels || DEFAULT_LABELS;
      return (
        <main className="empty-state error-state" role="alert">
          <AlertCircle size={40} className="error-icon" />
          <h3>{l.title}</h3>
          <p>{this.state.error?.message || l.message}</p>
          <p className="error-hint">{l.hint}</p>
          <button
            className="filter-btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px' }}
          >
            {l.reload}
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
