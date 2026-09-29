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
      <h2 id={id} className={`section-title${canCollapse ? ' section-title--toggle' : ''}`}>
        {icon}
        {title}
        {canCollapse && <ChevronDown size={20} className={`section-chevron${collapsed ? ' collapsed' : ''}`} aria-hidden="true" />}
        {canCollapse && (
          <button
            type="button"
            className="section-toggle-overlay"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={title}
          />
        )}
      </h2>
      {(!canCollapse || !collapsed) && children}
    </section>
  );
}
