import fs from 'fs';
import path from 'path';
import type { EpicGame, SteamGame, DealsData } from '../src/types';

const DEALS_DIR = path.join(process.cwd(), 'public', 'data');
const DEALS_PATH = path.join(DEALS_DIR, 'deals.json');

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 2000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    let res: Response | undefined;
    try {
      res = await fetch(url, options);
    } catch (err) {
      console.warn(`⚠️ Fetch error for ${url}: ${err instanceof Error ? err.message : String(err)}. Attempt ${i + 1} of ${retries}.`);
    }

    if (res) {
      if (res.ok) return res;
      // 4xx — клієнтська помилка (404/400/403): повторювати безглуздо, перериваємо одразу.
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Failed to fetch ${url}: non-retryable client error ${res.status}.`);
      }
      console.warn(`⚠️ Fetch failed for ${url} with status ${res.status}. Attempt ${i + 1} of ${retries}.`);
    }

    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // exponential backoff
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "невідомо";
  try {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Kyiv'
    };
    return d.toLocaleDateString('uk-UA', options) + " (за київським часом)";
  } catch {
    return dateStr;
  }
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Безкоштовно';
  const formattedPrice = price.toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const currencySymbol = currency === 'UAH' ? 'грн' : currency === 'USD' ? '$' : currency;
  return `${formattedPrice} ${currencySymbol}`;
}

// Minimal typings for the external API responses (res.json() is `unknown`).
interface EpicOffer {
  discountSetting?: { discountPercentage?: number };
  startDate?: string;
  endDate?: string;
}
interface EpicPromoBlock { promotionalOffers?: EpicOffer[] }
interface EpicElement {
  id: string;
  title: string;
  description?: string;
  price?: { totalPrice?: { originalPrice?: number; discountPrice?: number; currencyCode?: string } };
  promotions?: { promotionalOffers?: EpicPromoBlock[]; upcomingPromotionalOffers?: EpicPromoBlock[] };
  keyImages?: { type: string; url: string }[];
  catalogNs?: { mappings?: { pageSlug?: string }[] };
  productSlug?: string;
  customAttributes?: { key: string; value: string }[];
  urlSlug?: string;
}
interface EpicResponse { data?: { Catalog?: { searchStore?: { elements?: EpicElement[] } } } }

interface SteamItem {
  id: number;
  name: string;
  type?: number;
  large_capsule_image?: string;
  header_image?: string;
  capsule_image?: string;
  original_price?: number;
  final_price?: number;
  discount_percent?: number;
  currency?: string;
}
interface SteamResponse {
  specials?: { items?: SteamItem[] };
  top_sellers?: { items?: SteamItem[] };
}

async function fetchEpicGames(): Promise<EpicGame[]> {
  try {
    console.log("Fetching Epic Games promotions...");
    const url = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=uk&country=UA';
    const res = await fetchWithRetry(url);
    const data = await res.json() as EpicResponse;
    const elements = data.data?.Catalog?.searchStore?.elements || [];
    
    const games: EpicGame[] = [];
    
    for (const item of elements) {
      // Epic's catalog regularly returns region-locked/unpublished entries with
      // a null price (or a missing title). Skip them instead of letting one bad
      // element throw and abort the whole hourly fetch + deploy.
      const totalPrice = item?.price?.totalPrice;
      if (!totalPrice || typeof item?.title !== 'string') continue;
      const originalPrice = (Number(totalPrice.originalPrice) || 0) / 100;
      const discountPrice = (Number(totalPrice.discountPrice) || 0) / 100;
      const isDiscounted = discountPrice < originalPrice && discountPrice > 0;
      const discountPercent = originalPrice > 0 ? Math.round((1 - discountPrice / originalPrice) * 100) : 0;
      
      let isFreeNow = false;
      let isUpcomingFree = false;
      let startDate = "";
      let endDate = "";
      
      // Active promotions
      const activeOffers = item.promotions?.promotionalOffers || [];
      for (const block of activeOffers) {
        for (const offer of block.promotionalOffers || []) {
          if (offer.discountSetting?.discountPercentage === 0) {
            isFreeNow = true;
            startDate = offer.startDate ?? "";
            endDate = offer.endDate ?? "";
          } else if ((offer.discountSetting?.discountPercentage ?? 0) > 0) {
            startDate = offer.startDate ?? "";
            endDate = offer.endDate ?? "";
          }
        }
      }
      
      // Upcoming promotions
      const upcomingOffers = item.promotions?.upcomingPromotionalOffers || [];
      for (const block of upcomingOffers) {
        for (const offer of block.promotionalOffers || []) {
          if (offer.discountSetting?.discountPercentage === 0) {
            isUpcomingFree = true;
            startDate = offer.startDate ?? "";
            endDate = offer.endDate ?? "";
          }
        }
      }
      
      if (isFreeNow || isUpcomingFree || isDiscounted) {
        const images: { type: string; url: string }[] = item.keyImages || [];
        const imageTypes = ['DieselStoreFrontWide', 'OfferImageWide', 'Thumbnail', 'OfferImageTall'];
        let imageUrl = "";
        for (const type of imageTypes) {
          const found = images.find((img) => img.type === type);
          if (found) {
            imageUrl = found.url;
            break;
          }
        }
        if (!imageUrl && images.length > 0) {
          imageUrl = images[0].url;
        }

        interface CatalogMapping { pageSlug?: string }
        interface CatalogNs { mappings?: CatalogMapping[] }
        interface CustomAttribute { key: string; value: string }

        const catalogNs: CatalogNs | undefined = item.catalogNs;
        let slug: string | string[] | undefined = catalogNs?.mappings?.[0]?.pageSlug || item.productSlug;
        if (Array.isArray(slug)) {
          slug = slug[0] || "";
        }
        if (typeof slug !== 'string' || !slug || slug === '[]') {
          const customAttributes: CustomAttribute[] | undefined = item.customAttributes;
          const attrSlug = customAttributes?.find((attr) => attr.key === 'com.epicgames.app.productSlug')?.value;
          slug = attrSlug || "";
        }
        if (Array.isArray(slug)) {
          slug = slug[0] || "";
        }
        if (typeof slug !== 'string' || !slug || slug === '[]') {
          slug = item.urlSlug || "";
        }
        const gameUrl = `https://store.epicgames.com/p/${slug}`;
        
        games.push({
          id: item.id,
          title: item.title,
          description: item.description || "Опис відсутній.",
          imageUrl,
          originalPrice,
          discountPrice,
          currency: totalPrice.currencyCode || "USD",
          url: gameUrl,
          startDate,
          endDate,
          isFreeNow,
          isUpcomingFree,
          isDiscounted,
          discountPercent
        });
      }
    }
    
    return games;
  } catch (err) {
    throw new Error(`Error fetching Epic Games: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

async function fetchSteamGames(): Promise<SteamGame[]> {
  try {
    console.log("Fetching Steam categories...");
    const url = 'https://store.steampowered.com/api/featuredcategories/?cc=UA&l=ukrainian';
    const res = await fetchWithRetry(url);
    const data = await res.json() as SteamResponse;

    const specials = data.specials?.items || [];
    const topSellers = data.top_sellers?.items || [];

    const gamesMap = new Map<string, SteamGame>();

    const processItems = (items: SteamItem[], isSpecial: boolean, isPopular: boolean) => {
      for (const item of items) {
        const id = String(item.id);
        const imageUrl = item.large_capsule_image || item.header_image || item.capsule_image || "";

        // Skip bundles, subscriptions, and non-game items
        if (imageUrl.includes('/bundles/') || imageUrl.includes('/subs/')) {
          continue;
        }
        // type 0 = game/app; skip other types (1 = DLC, 2 = demo, etc.)
        if (item.type !== undefined && item.type !== 0) {
          continue;
        }

        const originalPrice = (item.original_price ?? item.final_price ?? 0) / 100;
        const discountPrice = (item.final_price ?? 0) / 100;

        if (gamesMap.has(id)) {
          const existing = gamesMap.get(id)!;
          if (isSpecial) existing.isSpecial = true;
          if (isPopular) existing.isPopular = true;
          if ((item.discount_percent ?? 0) > existing.discountPercent) {
            existing.discountPercent = item.discount_percent ?? 0;
            existing.originalPrice = originalPrice;
            existing.discountPrice = discountPrice;
          }
        } else {
          gamesMap.set(id, {
            id,
            title: item.name,
            imageUrl,
            originalPrice,
            discountPrice,
            discountPercent: item.discount_percent || 0,
            currency: item.currency || "UAH",
            url: `https://store.steampowered.com/app/${id}`,
            isSpecial,
            isPopular
          });
        }
      }
    };
    
    processItems(specials, true, false);
    processItems(topSellers, false, true);
    
    return Array.from(gamesMap.values());
  } catch (err) {
    throw new Error(`Error fetching Steam games: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Контекст атрибута href="..." потребує екранування лапок на додачу до < > &,
// інакше URL із лапкою/дужкою зламає або інжектне розмітку Telegram-повідомлення.
function escapeAttr(url: string): string {
  return escapeHtml(url).replace(/"/g, '&quot;');
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log("⚠️ Telegram credentials not found (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID). Skipping notification.");
    return;
  }
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Failed to send Telegram message:", errorText);
  } else {
    console.log("✅ Telegram message sent successfully.");
  }
}

async function run() {
  console.log("Starting deals fetcher script...");
  
  // Load previous deals for comparison
  // Coerce whatever we read (local file OR remote GitHub Pages) into a valid
  // DealsData shape — a structurally-wrong-but-valid-JSON file (e.g. {}, an
  // array, or a null `epic` from a prior partial write) must not crash the
  // `oldData.epic.length` guards below.
  const coerceOldData = (parsed: unknown): DealsData => {
    const p = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    return {
      lastUpdated: typeof p.lastUpdated === 'string' ? p.lastUpdated : '',
      epic: Array.isArray(p.epic) ? (p.epic as DealsData['epic']) : [],
      steam: Array.isArray(p.steam) ? (p.steam as DealsData['steam']) : [],
      notifiedHistory:
        p.notifiedHistory && typeof p.notifiedHistory === 'object'
          ? (p.notifiedHistory as DealsData['notifiedHistory'])
          : {},
    };
  };

  let oldData: DealsData = { lastUpdated: "", epic: [], steam: [], notifiedHistory: {} };
  if (fs.existsSync(DEALS_PATH)) {
    try {
      oldData = coerceOldData(JSON.parse(fs.readFileSync(DEALS_PATH, 'utf-8')));
      console.log("Loaded previous deals from local path.");
    } catch (err) {
      console.error("⚠️ Failed to parse old local deals.json:", err);
    }
  } else {
    try {
      const githubPagesUrl = `https://ajjs1ajjs.github.io/Sales/data/deals.json`;
      console.log(`Trying to fetch previous deals from GitHub Pages: ${githubPagesUrl}`);
      const res = await fetch(githubPagesUrl);
      if (res.ok) {
        oldData = coerceOldData(await res.json());
        console.log("✅ Loaded previous deals from GitHub Pages.");
      }
    } catch {
      console.log("⚠️ Could not fetch from GitHub Pages, starting fresh.");
    }
  }
  
  // Load and clean notified history
  const notifiedHistory = oldData.notifiedHistory || {};
  const now = new Date();
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  
  for (const [key, value] of Object.entries(notifiedHistory)) {
    const notifiedTime = new Date(value.timestamp).getTime();
    // Видаляємо застарілі ТА пошкоджені (невалідна дата → NaN) записи,
    // інакше биті записи накопичувалися б вічно (NaN < x === false).
    if (Number.isNaN(notifiedTime) || notifiedTime < thirtyDaysAgo) {
      delete notifiedHistory[key];
    }
  }
  
  // Fetch fresh data
  const freshEpic = await fetchEpicGames();
  const freshSteam = await fetchSteamGames();
  
  // Guard against API/scraping failure:
  // If we fetched 0 games but we had games previously, it's highly likely a scrape failure.
  // We should keep the old data and abort rather than overwriting the dataset with empty arrays.
  if (freshEpic.length === 0 && oldData.epic.length > 0) {
    throw new Error('Scraped Epic Games list is empty, but previous data was not. Aborting to prevent data deletion.');
  }
  if (freshSteam.length === 0 && oldData.steam.length > 0) {
    throw new Error('Scraped Steam games list is empty, but previous data was not. Aborting to prevent data deletion.');
  }
  
  // Detect changes
  const newFreeGames: EpicGame[] = [];
  const newEpicDiscounts: EpicGame[] = [];
  const newSteamDeals: SteamGame[] = [];
  const newPopularGames: SteamGame[] = [];
  
  // Epic: Find currently free games and discounts that were not notified
  for (const game of freshEpic) {
    if (game.isFreeNow) {
      const historyKey = `epic_free_${game.id}`;
      const historyEntry = notifiedHistory[historyKey];
      
      let shouldNotify = false;
      if (!historyEntry) {
        shouldNotify = true;
      } else {
        const lastNotified = new Date(historyEntry.timestamp).getTime();
        // Cooldown of 14 days for free games
        if (now.getTime() - lastNotified > 14 * 24 * 60 * 60 * 1000) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newFreeGames.push(game);
        notifiedHistory[historyKey] = {
          title: game.title,
          price: 0,
          percent: 100,
          timestamp: now.toISOString(),
          type: 'free'
        };
      }
    }
    
    if (game.isDiscounted) {
      const historyKey = `epic_discount_${game.id}`;
      const historyEntry = notifiedHistory[historyKey];
      
      let shouldNotify = false;
      if (!historyEntry) {
        shouldNotify = true;
      } else {
        const lastNotified = new Date(historyEntry.timestamp).getTime();
        const priceDropped = game.discountPrice < historyEntry.price;
        const cooldownExpired = now.getTime() - lastNotified > 30 * 24 * 60 * 60 * 1000;
        if (priceDropped || cooldownExpired) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newEpicDiscounts.push(game);
        notifiedHistory[historyKey] = {
          title: game.title,
          price: game.discountPrice,
          percent: game.discountPercent,
          timestamp: now.toISOString(),
          type: 'discount'
        };
      }
    }
  }
  
  // Steam: Find new items
  for (const game of freshSteam) {
    // 1. Hot deals: newly marked as isSpecial and discount >= 5
    if (game.isSpecial && game.discountPercent >= 5) {
      const historyKey = `steam_discount_${game.id}`;
      const historyEntry = notifiedHistory[historyKey];
      
      let shouldNotify = false;
      if (!historyEntry) {
        shouldNotify = true;
      } else {
        const lastNotified = new Date(historyEntry.timestamp).getTime();
        const priceDropped = game.discountPrice < historyEntry.price;
        const cooldownExpired = now.getTime() - lastNotified > 30 * 24 * 60 * 60 * 1000;
        if (priceDropped || cooldownExpired) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newSteamDeals.push(game);
        notifiedHistory[historyKey] = {
          title: game.title,
          price: game.discountPrice,
          percent: game.discountPercent,
          timestamp: now.toISOString(),
          type: 'discount'
        };
      }
    }
    
    // 2. New Popular Games (Top Sellers): newly marked as isPopular
    if (game.isPopular) {
      const historyKey = `steam_popular_${game.id}`;
      const historyEntry = notifiedHistory[historyKey];
      
      let shouldNotify = false;
      if (!historyEntry) {
        shouldNotify = true;
      } else {
        const lastNotified = new Date(historyEntry.timestamp).getTime();
        const cooldownExpired = now.getTime() - lastNotified > 30 * 24 * 60 * 60 * 1000;
        if (cooldownExpired) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newPopularGames.push(game);
        notifiedHistory[historyKey] = {
          title: game.title,
          price: game.discountPrice,
          percent: game.discountPercent,
          timestamp: now.toISOString(),
          type: 'popular'
        };
      }
    }
  }
  
  console.log(`Detected: ${newFreeGames.length} free Epic, ${newEpicDiscounts.length} discounted Epic, ${newSteamDeals.length} hot Steam, ${newPopularGames.length} popular Steam.`);
  
  // Send notifications if there are any updates
  if (newFreeGames.length > 0) {
    for (const game of newFreeGames) {
      const text = `🎁 <b>БЕЗКОШТОВНА ГРА В EPIC GAMES STORE!</b>\n\n` +
                   `🎮 <b>${escapeHtml(game.title)}</b>\n` +
                   `📝 ${escapeHtml(game.description)}\n\n` +
                   `📅 Роздача діє до: <b>${formatDate(game.endDate)}</b>\n\n` +
                   `🔗 <a href="${escapeAttr(game.url)}">Забрати гру в магазині</a>`;
      await sendTelegramMessage(text);
    }
  }
  
  if (newEpicDiscounts.length > 0) {
    let epicText = `🔥 <b>ГАРЯЧІ ЗНИЖКИ В EPIC GAMES STORE!</b>\n\n`;
    for (const deal of newEpicDiscounts) {
      const pct = deal.discountPercent > 0 ? `-${deal.discountPercent}%` : 'знижка';
      epicText += `🎮 <b>${escapeHtml(deal.title)}</b>\n` +
                   `🏷️ Знижка: <b>${pct}</b>\n` +
                   `💰 Ціна: <s>${formatPrice(deal.originalPrice, deal.currency)}</s> ➡️ <b>${formatPrice(deal.discountPrice, deal.currency)}</b>\n` +
                   `🔗 <a href="${escapeAttr(deal.url)}">Детальніше в Epic Games Store</a>\n\n`;
    }
    epicText += `🚀 Більше пропозицій дивіться на нашому сайті!`;
    await sendTelegramMessage(epicText);
  }
  
  if (newSteamDeals.length > 0) {
    let steamText = `🔥 <b>ГАРЯЧІ ЗНИЖКИ В STEAM (від 5%)!</b>\n\n`;
    for (const deal of newSteamDeals) {
      steamText += `🎮 <b>${escapeHtml(deal.title)}</b>\n` +
                   `🏷️ Знижка: <b>-${deal.discountPercent}%</b>\n` +
                   `💰 Ціна: <s>${formatPrice(deal.originalPrice, deal.currency)}</s> ➡️ <b>${formatPrice(deal.discountPrice, deal.currency)}</b>\n` +
                   `🔗 <a href="${escapeAttr(deal.url)}">Детальніше в Steam</a>\n\n`;
    }
    steamText += `🚀 Більше знижок дивіться на нашому сайті!`;
    await sendTelegramMessage(steamText);
  }
  
  if (newPopularGames.length > 0) {
    let popularText = `⭐ <b>ТРЕНДОВІ ІГРИ В STEAM (TOP SELLERS)!</b>\n\n`;
    for (const game of newPopularGames) {
      const priceText = game.discountPercent > 0 
        ? `<s>${formatPrice(game.originalPrice, game.currency)}</s> ➡️ <b>${formatPrice(game.discountPrice, game.currency)}</b> (-${game.discountPercent}%)`
        : `<b>${formatPrice(game.discountPrice, game.currency)}</b>`;
      
      popularText += `🎮 <b>${escapeHtml(game.title)}</b>\n` +
                     `💰 Ціна: ${priceText}\n` +
                     `🔗 <a href="${escapeAttr(game.url)}">Дивитися в Steam</a>\n\n`;
    }
    popularText += `🚀 Більше популярних ігор дивіться на нашому сайті!`;
    await sendTelegramMessage(popularText);
  }
  
  // Save updated data
  const newData: DealsData = {
    lastUpdated: new Date().toISOString(),
    epic: freshEpic,
    steam: freshSteam,
    notifiedHistory
  };
  
  fs.mkdirSync(DEALS_DIR, { recursive: true });
  fs.writeFileSync(DEALS_PATH, JSON.stringify(newData, null, 2), 'utf-8');
  console.log(`✅ Saved new data to ${DEALS_PATH}`);
}

run().catch(err => {
  console.error("❌ Critical error running fetcher:", err);
  process.exit(1);
});
