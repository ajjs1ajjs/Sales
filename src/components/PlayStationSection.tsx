import { useMemo } from 'react';
import { Flame, Gift, Star, TrendingUp } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { FilterType, PlayStationGame, PriceObservation, SortType } from '../types';
import { sortPlayStationGames } from '../utils';
import { GameCard } from './GameCard';
import { ShowMore } from './ShowMore';
import { CollapsibleSection } from './CollapsibleSection';
import { PriceHistory } from './PriceTracking';

interface Props {
  games: PlayStationGame[];
  activeFilter: FilterType;
  searchQuery: string;
  sortType: SortType;
  priceHistory?: Record<string, PriceObservation[]>;
}

export function PlayStationSection({
  games,
  activeFilter,
  searchQuery,
  sortType,
  priceHistory = {},
}: Props) {
  const { t } = useLocale();
  const [collapsedEssential, setCollapsedEssential] = useLocalStorage('collapse-ps-essential', false);
  const [collapsedExtra, setCollapsedExtra] = useLocalStorage('collapse-ps-extra', false);
  const [collapsedDeals, setCollapsedDeals] = useLocalStorage('collapse-ps-deals', false);
  const [collapsedPopular, setCollapsedPopular] = useLocalStorage('collapse-ps-popular', false);

  const sorted = useMemo(() => sortPlayStationGames(games, sortType), [games, sortType]);

  const essential = sorted.filter((g) => g.psPlusTier === 'essential');
  const extra = sorted.filter((g) => g.psPlusTier === 'extra');
  const deals = sorted.filter((g) => g.isDeal);
  const popular = sorted.filter((g) => g.isPopular && (activeFilter === 'ps_popular' || !g.isDeal));

  const showAllPs = activeFilter === 'all' || activeFilter === 'ps_all';
  const canCollapse = showAllPs;
  const initialCount = activeFilter === 'all' && !searchQuery ? 6 : 12;
  const resetKey = `${activeFilter}|${searchQuery}|${sortType}`;

  const priceExtra = (deal: PlayStationGame) => {
    const observations = priceHistory[deal.id];
    const currency = deal.currency || 'UAH';
    return observations && observations.length > 0
      ? <PriceHistory title={deal.title} currency={currency} observations={observations} />
      : undefined;
  };

  const isLowestPrice = (deal: PlayStationGame): boolean => {
    if (typeof deal.discountPrice !== 'number') return false;
    const currency = deal.currency || 'UAH';
    const observations = (priceHistory[deal.id] ?? []).filter((o) => o.currency === currency);
    if (observations.length < 2) return false;
    return deal.discountPrice <= Math.min(...observations.map((o) => o.price));
  };

  return (
    <>
      {(showAllPs || activeFilter === 'ps_essential') && (essential.length > 0 || activeFilter === 'ps_essential') && (
        <CollapsibleSection
          id="ps-essential-title"
          title={t.playstation.essentialTitle}
          icon={<Gift size={22} className="icon-playstation" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedEssential}
          onToggle={() => setCollapsedEssential((c) => !c)}
        >
          {essential.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.playstation.emptyEssential}</h3>
              <p>{t.playstation.emptyEssentialDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                initialCount={initialCount}
                resetKey={resetKey}
                items={essential.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="playstation"
                    badge={t.playstation.badgeMonthly}
                    badgeVariant="free"
                    searchQuery={searchQuery}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {(showAllPs || activeFilter === 'ps_extra') && (extra.length > 0 || activeFilter === 'ps_extra') && (
        <CollapsibleSection
          id="ps-extra-title"
          title={t.playstation.extraTitle}
          icon={<Star size={22} className="icon-playstation" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedExtra}
          onToggle={() => setCollapsedExtra((c) => !c)}
        >
          {extra.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.playstation.emptyExtra}</h3>
              <p>{t.playstation.emptyExtraDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                initialCount={initialCount}
                resetKey={resetKey}
                items={extra.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="playstation"
                    badge={t.playstation.badgeExtra}
                    badgeVariant="ps"
                    searchQuery={searchQuery}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {(showAllPs || activeFilter === 'ps_deals') && (deals.length > 0 || activeFilter === 'ps_deals') && (
        <CollapsibleSection
          id="ps-deals-title"
          title={t.playstation.dealsTitle}
          icon={<Flame size={22} className="icon-playstation" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedDeals}
          onToggle={() => setCollapsedDeals((c) => !c)}
        >
          {deals.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.playstation.emptyDeals}</h3>
              <p>{t.playstation.emptyDealsDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                initialCount={initialCount}
                resetKey={resetKey}
                items={deals.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="playstation"
                    badge={deal.discountPercent ? `-${deal.discountPercent}%` : undefined}
                    showTagDescription
                    isLowestPrice={isLowestPrice(deal)}
                    searchQuery={searchQuery}
                    extra={priceExtra(deal)}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {(showAllPs || activeFilter === 'ps_popular') && (popular.length > 0 || activeFilter === 'ps_popular') && (
        <CollapsibleSection
          id="ps-popular-title"
          title={t.playstation.popularTitle}
          icon={<TrendingUp size={22} className="icon-playstation" aria-hidden="true" />}
          canCollapse={canCollapse}
          collapsed={collapsedPopular}
          onToggle={() => setCollapsedPopular((c) => !c)}
        >
          {popular.length === 0 ? (
            <div className="empty-state section-gap-bottom">
              <h3>{t.playstation.emptyPopular}</h3>
              <p>{t.playstation.emptyPopularDesc}</p>
            </div>
          ) : (
            <div className="deals-grid section-gap-bottom">
              <ShowMore
                initialCount={initialCount}
                resetKey={resetKey}
                items={popular.map((deal) => (
                  <GameCard
                    key={deal.id}
                    game={deal}
                    platform="playstation"
                    badge={deal.discountPercent ? `-${deal.discountPercent}%` : t.playstation.badgeTop}
                    badgeVariant={deal.discountPercent ? 'discount' : 'ps'}
                    showTrendingDescription
                    isLowestPrice={isLowestPrice(deal)}
                    searchQuery={searchQuery}
                    extra={priceExtra(deal)}
                  />
                ))}
              />
            </div>
          )}
        </CollapsibleSection>
      )}
    </>
  );
}
