import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollapsibleSection } from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  it('keeps heading semantics and exposes a labelled toggle button', () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleSection id="free" title="Free games" icon={null} canCollapse collapsed={false} onToggle={onToggle}>
        <p>content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Free games');
    const toggle = screen.getByRole('button', { name: 'Free games' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hides children when collapsed', () => {
    render(
      <CollapsibleSection id="free" title="Free games" icon={null} canCollapse collapsed onToggle={() => {}}>
        <p>content</p>
      </CollapsibleSection>,
    );

    expect(screen.queryByText('content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Free games' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders no toggle button when not collapsible', () => {
    render(
      <CollapsibleSection id="free" title="Free games" icon={null} canCollapse={false} collapsed onToggle={() => {}}>
        <p>content</p>
      </CollapsibleSection>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
