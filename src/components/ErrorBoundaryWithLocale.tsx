import { type ReactNode } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { ErrorBoundary, type ErrorBoundaryLabels } from '../ErrorBoundary';

export function ErrorBoundaryWithLocale({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  const labels: ErrorBoundaryLabels = {
    title: t.app.errorStateTitle,
    message: t.app.errorStateMessage,
    hint: t.app.errorStateDesc,
    reload: t.app.reload,
  };

  return <ErrorBoundary labels={labels}>{children}</ErrorBoundary>;
}
