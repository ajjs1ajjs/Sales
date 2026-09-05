import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { TelegramBanner } from '../TelegramBanner';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider initialLocale="uk">{children}</LocaleProvider>;
}

describe('TelegramBanner', () => {
  beforeEach(() => {
    if (window.localStorage && typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem('telegram-banner-dismissed');
    }
  });

  it('renders heading and description', () => {
    render(<TelegramBanner />, { wrapper: Wrapper });
    expect(screen.getByText('Приєднуйтесь до нашого Telegram-каналу!')).toBeInTheDocument();
    expect(screen.getByText(/Отримуйте миттєві сповіщення/)).toBeInTheDocument();
  });

  it('renders subscribe link with correct URL', () => {
    render(<TelegramBanner />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /підписатися/i });
    expect(link).toHaveAttribute('href', 'https://t.me/salesgamesua');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('dismisses banner when close button is clicked', () => {
    const { container } = render(<TelegramBanner />, { wrapper: Wrapper });
    const closeBtn = screen.getByRole('button', { name: /приховати банер/i });
    expect(closeBtn).toBeInTheDocument();
    
    expect(screen.getByText('Приєднуйтесь до нашого Telegram-каналу!')).toBeInTheDocument();
    
    fireEvent.click(closeBtn);
    
    expect(container.firstChild).toBeNull();
  });
});
