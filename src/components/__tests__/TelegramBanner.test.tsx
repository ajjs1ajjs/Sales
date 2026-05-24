import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TelegramBanner } from '../TelegramBanner';

describe('TelegramBanner', () => {
  it('renders heading and description', () => {
    render(<TelegramBanner />);
    expect(screen.getByText('Приєднуйтесь до нашого Telegram-каналу!')).toBeInTheDocument();
    expect(screen.getByText(/Отримуйте миттєві сповіщення/)).toBeInTheDocument();
  });

  it('renders subscribe link with correct URL', () => {
    render(<TelegramBanner />);
    const link = screen.getByRole('link', { name: /підписатися/i });
    expect(link).toHaveAttribute('href', 'https://t.me/salesgamesua');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
