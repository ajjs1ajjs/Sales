import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ShowMore } from '../ShowMore';

describe('ShowMore', () => {
  it('renders initial items count', () => {
    const items = Array.from({ length: 20 }, (_, i) => <div key={i}>Item {i + 1}</div>);
    render(<ShowMore items={items} initialCount={5} step={5} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 5')).toBeInTheDocument();
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument();
  });

  it('shows more items on button click', () => {
    const items = Array.from({ length: 10 }, (_, i) => <div key={i}>Item {i + 1}</div>);
    render(<ShowMore items={items} initialCount={3} step={3} />);
    expect(screen.getByText('Показати ще (3)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Показати ще (3)'));
    expect(screen.getByText('Item 4')).toBeInTheDocument();
    expect(screen.getByText('Item 6')).toBeInTheDocument();
    expect(screen.queryByText('Item 7')).not.toBeInTheDocument();
    expect(screen.getByText('Показати ще (3)')).toBeInTheDocument();
  });

  it('hides button when all items are visible', () => {
    const items = Array.from({ length: 5 }, (_, i) => <div key={i}>Item {i + 1}</div>);
    render(<ShowMore items={items} initialCount={10} />);
    expect(screen.queryByText(/Показати ще/)).not.toBeInTheDocument();
  });

  it('returns null for empty items', () => {
    const { container } = render(<ShowMore items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
