import { Gamepad2 } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

interface Props {
  searchQuery: string;
}

export function SearchEmptyState({ searchQuery }: Props) {
  const { t } = useLocale();
  return (
    <div className="empty-state section-gap-top">
      <Gamepad2 size={48} className="icon-muted" aria-hidden="true" />
      {/* Use a function replacer so searchQuery is inserted literally — a
          string replacement would interpret `$` patterns ($$, $&, $') */}
      <h3>{t.app.notFoundTitle.replace('{query}', () => searchQuery)}</h3>
      <p>{t.app.notFoundDesc}</p>
    </div>
  );
}
