import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallPWA } from '../InstallPWA';
import { LocaleProvider } from '../../contexts/LocaleContext';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(),
}));

import { useRegisterSW } from 'virtual:pwa-register/react';

const mocked = vi.mocked(useRegisterSW);

function renderBanner() {
  return render(
    <LocaleProvider>
      <InstallPWA />
    </LocaleProvider>,
  );
}

describe('H2 regression: SW update banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing without install prompt or update', () => {
    mocked.mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    });
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('shows update button and triggers reload on click', () => {
    const updateServiceWorker = vi.fn();
    mocked.mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });
    renderBanner();
    const btn = screen.getByRole('button', { name: /Оновити|Update/ });
    fireEvent.click(btn);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
