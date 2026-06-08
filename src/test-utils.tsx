/* eslint-disable react-refresh/only-export-components */
import { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { LocaleProvider } from './contexts/LocaleContext';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      {children}
    </LocaleProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
