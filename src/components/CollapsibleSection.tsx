import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  icon: ReactNode;
  canCollapse: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  id, title, icon, canCollapse, collapsed, onToggle, children, className,
}: Props) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2
        id={id}
        className={`section-title${canCollapse ? ' section-title--toggle' : ''}`}
        onClick={canCollapse ? onToggle : undefined}
        role={canCollapse ? 'button' : undefined}
        tabIndex={canCollapse ? 0 : undefined}
        onKeyDown={canCollapse ? (e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); } : undefined}
        aria-expanded={canCollapse ? !collapsed : undefined}
      >
        {icon}
        {title}
        {canCollapse && <ChevronDown size={20} className={`section-chevron${collapsed ? ' collapsed' : ''}`} aria-hidden="true" />}
      </h2>
      {(!canCollapse || !collapsed) && children}
    </section>
  );
}
