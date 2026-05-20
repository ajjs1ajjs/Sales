import { useEffect, useState } from 'react';
import { 
  Gift, 
  Flame, 
  Search, 
  Send, 
  ExternalLink, 
  Clock, 
  Tag, 
  RefreshCw, 
  AlertCircle,
  Gamepad2,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface EpicGame {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  currency: string;
  url: string;
  startDate: string;
  endDate: string;
  isFreeNow: boolean;
  isUpcomingFree: boolean;
}

interface SteamGame {
  id: string;
  title: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  currency: string;
  url: string;
  isSpecial: boolean;
  isPopular: boolean;
  isNewRelease: boolean;
}

interface DealsData {
  lastUpdated: string;
  epic: EpicGame[];
  steam: SteamGame[];
}

type FilterType = 'all' | 'epic' | 'steam_specials' | 'steam_popular' | 'steam_new';

function App() {
  const [data, setData] = useState<DealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}data/deals.json?t=${Date.now()}`);
        
        if (!res.ok) {
          throw new Error(`Не вдалося завантажити дані (статус: ${res.status})`);
        }
        
        const jsonData = await res.json();
        setData(jsonData);
        setError(null);
      } catch (err: any) {
        console.error("Помилка завантаження даних:", err);
        setError(err.message || 'Сталася помилка при завантаженні знижок.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "невідомо";
    try {
      const d = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv'
      };
      return d.toLocaleDateString('uk-UA', options);
    } catch {
      return dateStr;
    }
  };

  const formatLastUpdated = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Kyiv'
      };
      return d.toLocaleDateString('uk-UA', options);
    } catch {
      return dateStr;
    }
  };

  // Filter Epic and Steam games
  const filteredEpic = data?.epic.filter(game => {
    return game.title.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const filteredSteam = data?.steam.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'steam_specials') return game.isSpecial;
    if (activeFilter === 'steam_popular') return game.isPopular;
    if (activeFilter === 'steam_new') return game.isNewRelease;
    return true; // for 'all' or 'epic' filters
  }) || [];

  // Categorize Epic Games
  const currentFreeEpic = filteredEpic.filter(g => g.isFreeNow);
  const upcomingFreeEpic = filteredEpic.filter(g => g.isUpcomingFree);

  // Steam Subcategories for rendering in "all" view
  const steamSpecials = filteredSteam.filter(g => g.isSpecial);
  const steamPopular = filteredSteam.filter(g => g.isPopular);
  const steamNew = filteredSteam.filter(g => g.isNewRelease);

  return (
    <>
      <header>
        <h1>Game Sales Aggregator</h1>
        <p>Ваш персональний радар знижок та новинок. Безкоштовні ігри від Epic Games Store, знижки, хіти та нові релізи Steam.</p>
        
        {data?.lastUpdated && (
          <div className="last-updated">
            <Clock size={14} />
            <span>Останнє оновлення: <b>{formatLastUpdated(data.lastUpdated)}</b></span>
          </div>
        )}
      </header>

      {/* Telegram Banner */}
      <section className="telegram-banner">
        <div className="tg-info">
          <h3><Send size={22} className="text-telegram" /> Приєднуйтесь до нашого Telegram-каналу!</h3>
          <p>Отримуйте миттєві сповіщення про безкоштовні ігри, знижки від 75%, нові релізи та хіти продажів щогодини.</p>
        </div>
        <a 
          href="https://t.me/your_telegram_channel" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="tg-button"
        >
          <Send size={18} /> Підписатися
        </a>
      </section>

      {/* Controls: Search and Filters */}
      <section className="controls-container">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Пошук гри за назвою..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            id="search-games"
          />
        </div>
        
        <div className="filter-group">
          <button 
            onClick={() => setActiveFilter('all')} 
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            id="filter-all"
          >
            Всі категорії
          </button>
          <button 
            onClick={() => setActiveFilter('epic')} 
            className={`filter-btn ${activeFilter === 'epic' ? 'active' : ''}`}
            id="filter-epic"
          >
            Epic Games
          </button>
          <button 
            onClick={() => setActiveFilter('steam_specials')} 
            className={`filter-btn ${activeFilter === 'steam_specials' ? 'active' : ''}`}
            id="filter-steam-specials"
          >
            Steam Знижки
          </button>
          <button 
            onClick={() => setActiveFilter('steam_popular')} 
            className={`filter-btn ${activeFilter === 'steam_popular' ? 'active' : ''}`}
            id="filter-steam-popular"
          >
            Steam Тренди
          </button>
          <button 
            onClick={() => setActiveFilter('steam_new')} 
            className={`filter-btn ${activeFilter === 'steam_new' ? 'active' : ''}`}
            id="filter-steam-new"
          >
            Steam Новинки
          </button>
        </div>
      </section>

      {/* Main Content */}
      <main>
        {loading && (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <RefreshCw size={40} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
            <h3>Завантаження даних з серверів...</h3>
            <p>Будь ласка, зачекайте.</p>
          </div>
        )}

        {error && (
          <div className="empty-state" style={{ borderColor: 'rgba(225, 29, 72, 0.3)' }}>
            <AlertCircle size={40} style={{ color: 'var(--accent-free)', marginBottom: '12px' }} />
            <h3>Не вдалося завантажити дані</h3>
            <p>{error}</p>
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Переконайтеся, що робочий процес GitHub Actions успішно виконався та згенерував файл даних.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 1. Epic Games Section */}
            {(activeFilter === 'all' || activeFilter === 'epic') && (
              <>
                <h2 className="section-title">
                  <Gift size={22} style={{ color: 'var(--accent-epic)' }} />
                  Роздачі Epic Games Store
                </h2>

                {currentFreeEpic.length === 0 && upcomingFreeEpic.length === 0 && (
                  <div className="empty-state" style={{ marginBottom: '40px' }}>
                    <h3>Нічого не знайдено</h3>
                    <p>Наразі немає активних роздач або акцій, що відповідають вашому запиту.</p>
                  </div>
                )}

                {/* Active Free Games */}
                {currentFreeEpic.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                      Безкоштовно зараз
                    </h3>
                    <div className="deals-grid">
                      {currentFreeEpic.map(game => (
                        <div className="game-card" key={game.id}>
                          <div className="card-image-wrapper">
                            <span className="platform-badge epic">Epic Games</span>
                            <span className="deal-badge free">FREE</span>
                            <img src={game.imageUrl} alt={game.title} className="card-image" loading="lazy" />
                          </div>
                          <div className="card-content">
                            <h4 className="card-title" title={game.title}>{game.title}</h4>
                            <p className="card-desc">{game.description}</p>
                            <div className="card-footer">
                              <div className="price-container">
                                <span className="price-original">{game.originalPrice > 0 ? `${game.originalPrice} ${game.currency}` : ''}</span>
                                <span className="price-current free-text">БЕЗКОШТОВНО</span>
                              </div>
                              <a href={game.url} target="_blank" rel="noopener noreferrer" className="store-link">
                                Забрати <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Free Games */}
                {upcomingFreeEpic.length > 0 && (
                  <div style={{ marginBottom: '48px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-epic)', display: 'inline-block' }}></span>
                      Незабаром у роздачі
                    </h3>
                    <div className="deals-grid">
                      {upcomingFreeEpic.map(game => (
                        <div className="game-card" key={game.id} style={{ opacity: 0.85 }}>
                          <div className="card-image-wrapper">
                            <span className="platform-badge epic">Epic Games</span>
                            <img src={game.imageUrl} alt={game.title} className="card-image" loading="lazy" />
                          </div>
                          <div className="card-content">
                            <h4 className="card-title" title={game.title}>{game.title}</h4>
                            <p className="card-desc">{game.description}</p>
                            <div className="card-footer">
                              <div className="price-container">
                                <span className="upcoming-status">З {formatDate(game.startDate)}</span>
                              </div>
                              <a href={game.url} target="_blank" rel="noopener noreferrer" className="store-link">
                                До магазину <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. Steam Specials Section */}
            {(activeFilter === 'all' || activeFilter === 'steam_specials') && (
              <>
                <h2 className="section-title">
                  <Flame size={22} style={{ color: 'var(--accent-steam)' }} />
                  Гарячі знижки Steam
                </h2>

                {steamSpecials.length === 0 ? (
                  <div className="empty-state" style={{ marginBottom: '40px' }}>
                    <h3>Нічого не знайдено</h3>
                    <p>Наразі немає активних знижок у Steam, що відповідають вашому пошуку.</p>
                  </div>
                ) : (
                  <div className="deals-grid" style={{ marginBottom: '48px' }}>
                    {steamSpecials.map(deal => (
                      <div className="game-card" key={deal.id}>
                        <div className="card-image-wrapper">
                          <span className="platform-badge steam">Steam</span>
                          <span className="deal-badge">-{deal.discountPercent}%</span>
                          <img src={deal.imageUrl} alt={deal.title} className="card-image" loading="lazy" />
                        </div>
                        <div className="card-content">
                          <h4 className="card-title" title={deal.title}>{deal.title}</h4>
                          <p className="card-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <Tag size={14} /> Найкращі акційні пропозиції у Steam.
                          </p>
                          <div className="card-footer">
                            <div className="price-container">
                              <span className="price-original">{deal.originalPrice} {deal.currency}</span>
                              <span className="price-current">{deal.discountPrice} {deal.currency}</span>
                            </div>
                            <a href={deal.url} target="_blank" rel="noopener noreferrer" className="store-link">
                              Придбати <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 3. Steam Popular (Top Sellers) Section */}
            {(activeFilter === 'all' || activeFilter === 'steam_popular') && (
              <>
                <h2 className="section-title">
                  <TrendingUp size={22} style={{ color: 'var(--accent-epic)' }} />
                  Трендові ігри Steam (Top Sellers)
                </h2>

                {steamPopular.length === 0 ? (
                  <div className="empty-state" style={{ marginBottom: '40px' }}>
                    <h3>Нічого не знайдено</h3>
                    <p>Не вдалося знайти популярних ігор, що відповідають запиту.</p>
                  </div>
                ) : (
                  <div className="deals-grid" style={{ marginBottom: '48px' }}>
                    {steamPopular.map(deal => (
                      <div className="game-card" key={deal.id}>
                        <div className="card-image-wrapper">
                          <span className="platform-badge steam">Steam</span>
                          {deal.discountPercent > 0 && (
                            <span className="deal-badge">-{deal.discountPercent}%</span>
                          )}
                          <img src={deal.imageUrl} alt={deal.title} className="card-image" loading="lazy" />
                        </div>
                        <div className="card-content">
                          <h4 className="card-title" title={deal.title}>{deal.title}</h4>
                          <p className="card-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <TrendingUp size={14} /> Хіт продажів прямо зараз.
                          </p>
                          <div className="card-footer">
                            <div className="price-container">
                              {deal.discountPercent > 0 ? (
                                <>
                                  <span className="price-original">{deal.originalPrice} {deal.currency}</span>
                                  <span className="price-current">{deal.discountPrice} {deal.currency}</span>
                                </>
                              ) : (
                                <span className="price-current">{deal.discountPrice} {deal.currency}</span>
                              )}
                            </div>
                            <a href={deal.url} target="_blank" rel="noopener noreferrer" className="store-link">
                              Дивитися <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 4. Steam New Releases Section */}
            {(activeFilter === 'all' || activeFilter === 'steam_new') && (
              <>
                <h2 className="section-title">
                  <Sparkles size={22} style={{ color: 'var(--accent-steam)' }} />
                  Нові популярні релізи Steam
                </h2>

                {steamNew.length === 0 ? (
                  <div className="empty-state">
                    <h3>Нічого не знайдено</h3>
                    <p>Не вдалося знайти нових релізів, що відповідають запиту.</p>
                  </div>
                ) : (
                  <div className="deals-grid">
                    {steamNew.map(deal => (
                      <div className="game-card" key={deal.id}>
                        <div className="card-image-wrapper">
                          <span className="platform-badge steam">Steam</span>
                          {deal.discountPercent > 0 && (
                            <span className="deal-badge">-{deal.discountPercent}%</span>
                          )}
                          <img src={deal.imageUrl} alt={deal.title} className="card-image" loading="lazy" />
                        </div>
                        <div className="card-content">
                          <h4 className="card-title" title={deal.title}>{deal.title}</h4>
                          <p className="card-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <Sparkles size={14} /> Свіжа популярна новинка в Steam.
                          </p>
                          <div className="card-footer">
                            <div className="price-container">
                              {deal.discountPercent > 0 ? (
                                <>
                                  <span className="price-original">{deal.originalPrice} {deal.currency}</span>
                                  <span className="price-current">{deal.discountPrice} {deal.currency}</span>
                                </>
                              ) : deal.discountPrice === 0 ? (
                                <span className="price-current free-text">БЕЗКОШТОВНО</span>
                              ) : (
                                <span className="price-current">{deal.discountPrice} {deal.currency}</span>
                              )}
                            </div>
                            <a href={deal.url} target="_blank" rel="noopener noreferrer" className="store-link">
                              Дивитися <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* No matches for overall search */}
            {activeFilter === 'all' && filteredEpic.length === 0 && filteredSteam.length === 0 && (
              <div className="empty-state" style={{ marginTop: '40px' }}>
                <Gamepad2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h3>За запитом "{searchQuery}" ігор не знайдено</h3>
                <p>Спробуйте змінити пошуковий запит або скинути фільтри.</p>
              </div>
            )}
          </>
        )}
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} Game Sales Aggregator. Усі права захищено.</p>
        <p>
          Розроблено для геймерів з ❤️. Дані надано неофіційними API Steam та Epic Games Store.
        </p>
        <p style={{ marginTop: '8px' }}>
          Код проекту доступний на <a href="https://github.com/ajjs1ajjs/Sales" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
      </footer>
    </>
  );
}

export default App;
