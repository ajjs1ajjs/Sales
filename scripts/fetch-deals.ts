import fs from 'fs';
import path from 'path';
import type { EpicGame, SteamGame, XboxGame, DealsData, NotifiedItem } from '../src/types';
import { formatPrice, formatDate, escapeHtml, escapeAttr } from '../src/shared/format';

const DEALS_DIR = path.join(process.cwd(), 'public', 'data');
const DEALS_PATH = path.join(DEALS_DIR, 'deals.json');

const FREE_GAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const DISCOUNT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const TG_MESSAGE_LIMIT = 4000;

const XBOX_SGL_ALL_PC = process.env.XBOX_SGL_ALL_PC ?? '609d944c-d395-4c0a-9ea4-e9f39b52c1ad';
const XBOX_SGL_NEW_PC = process.env.XBOX_SGL_NEW_PC ?? '3fdd7f57-7092-4b65-bd40-5a9dac1b2b84';
const XBOX_SGL_COMING_PC = process.env.XBOX_SGL_COMING_PC ?? '4165f752-d702-49c8-886b-fb57936f6bae';
const XBOX_SGL_EA_PLAY_PC = process.env.XBOX_SGL_EA_PLAY_PC ?? '1d33fbb9-b895-4732-a8ca-a55c8b99fa2c';

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

        const catalogNs: CatalogNs | undefined = item.catalogNs;
        const slug = ((): string => {
          const s = catalogNs?.mappings?.[0]?.pageSlug || item.productSlug;
          if (typeof s === 'string' && s && s !== '[]') return s;
          if (Array.isArray(s) && typeof s[0] === 'string') return s[0];
          const attrSlug = item.customAttributes?.find((a) => a.key === 'com.epicgames.app.productSlug')?.value;
          if (attrSlug) return attrSlug;
          return item.urlSlug || '';
        })();
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

interface XboxProductResponse { Products?: XboxProduct[] }
interface XboxProduct {
  ProductId: string;
  LocalizedProperties?: { ProductTitle?: string; ProductDescription?: string; Images?: XboxImage[] }[];
  DisplaySkuAvailabilities?: XboxSkuAvailability[];
  MarketProperties?: { OriginalReleaseDate?: string }[];
}
interface XboxImage { ImagePurpose?: string; Uri?: string }
interface XboxSkuAvailability {
  Sku?: { SkuId?: string };
  Availabilities?: XboxAvailability[];
}
interface XboxAvailability {
  OrderManagementData?: { Price?: { CurrencyCode?: string; ListPrice?: number; MSRP?: number } };
}

async function fetchXboxGameIds(sglId: string): Promise<string[]> {
  const url = `https://catalog.gamepass.com/sigls/v2?id=${sglId}&market=UA&language=uk-UA`;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as { id?: string }[];
  return data
    .filter((item): item is { id: string } => typeof item.id === 'string' && !!item.id)
    .map((item) => item.id);
}

async function fetchXboxDetails(ids: string[]): Promise<XboxProduct[]> {
  if (ids.length === 0) return [];
  const batchSize = 20;
  const allDetails: XboxProduct[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${batch.join(',')}&market=UA&languages=uk-UA`;
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as XboxProductResponse;
    if (data.Products) {
      allDetails.push(...data.Products);
    }
  }
  return allDetails;
}

function extractXboxPrice(product: XboxProduct): { originalPrice: number; discountPrice: number; discountPercent: number; currency: string } {
  const defaultPrice = { originalPrice: 0, discountPrice: 0, discountPercent: 0, currency: 'UAH' };
  try {
    const avail = product.DisplaySkuAvailabilities?.[0];
    if (!avail?.Availabilities?.length) return defaultPrice;
    const priceData = avail.Availabilities[0].OrderManagementData?.Price;
    if (!priceData) return defaultPrice;
    const listPrice = priceData.ListPrice || 0;
    const msrp = priceData.MSRP || listPrice;
    const currency = priceData.CurrencyCode || 'UAH';
    return {
      originalPrice: msrp,
      discountPrice: listPrice,
      discountPercent: msrp > 0 ? Math.round((1 - listPrice / msrp) * 100) : 0,
      currency,
    };
  } catch {
    return defaultPrice;
  }
}

function extractXboxImage(product: XboxProduct): string {
  try {
    const images = product.LocalizedProperties?.[0]?.Images || [];
    const preferredTypes = ['SuperHeroArt', 'BoxArt', 'Poster'];
    const pick = (img: XboxImage | undefined): string => {
      if (!img?.Uri) return '';
      // Xbox API returns protocol-relative URIs ("//cdn..."). Normalize to
      // https and refuse anything that is not an http(s) URL so a tampered
      // product record cannot inject javascript:/data: into the app.
      const uri = img.Uri.startsWith('//') ? `https:${img.Uri}` : img.Uri;
      return /^https?:\/\//i.test(uri) ? uri : '';
    };
    for (const type of preferredTypes) {
      const url = pick(images.find((i) => i.ImagePurpose === type));
      if (url) return url;
    }
    if (images.length > 0) return pick(images[0]);
  } catch { /* ignore */ }
  return '';
}

async function fetchXboxGames(): Promise<{ games: XboxGame[]; allIds: string[]; newIds: Set<string>; comingIds: Set<string> }> {
  try {
    console.log("Fetching Xbox Game Pass games...");
    const [newIds, comingIds, allIds, eaIds] = await Promise.all([
      fetchXboxGameIds(XBOX_SGL_NEW_PC),
      fetchXboxGameIds(XBOX_SGL_COMING_PC),
      fetchXboxGameIds(XBOX_SGL_ALL_PC),
      fetchXboxGameIds(XBOX_SGL_EA_PLAY_PC),
    ]);
    const newSet = new Set(newIds);
    const comingSet = new Set(comingIds);
    const allSet = new Set(allIds);
    const eaSet = new Set(eaIds);
    // Беремо всі унікальні ID з усіх SGL-списків (включно з EA Play),
    // щоб жодна гра, зокрема від Ubisoft/EA, не залишилась без деталей.
    const allUniqueIds = [...new Set([...newIds, ...comingIds, ...allIds, ...eaIds])];
    const details = await fetchXboxDetails(allUniqueIds);
    const detailMap = new Map<string, XboxProduct>();
    for (const d of details) {
      detailMap.set(d.ProductId, d);
    }
    const games: XboxGame[] = [];
    const visitedIds = new Set<string>();
    // Спочатку додаємо ігри з головного каталогу (allSet)
    for (const id of allSet) {
      const product = detailMap.get(id);
      const title = product?.LocalizedProperties?.[0]?.ProductTitle;
      if (!title) continue;
      const priceInfo = product ? extractXboxPrice(product) : { originalPrice: 0, discountPrice: 0, discountPercent: 0, currency: 'UAH' };
      games.push({
        id,
        title,
        description: product?.LocalizedProperties?.[0]?.ProductDescription || '',
        imageUrl: product ? extractXboxImage(product) : '',
        originalPrice: priceInfo.originalPrice,
        discountPrice: priceInfo.discountPrice,
        discountPercent: priceInfo.discountPercent,
        currency: priceInfo.currency,
        url: `https://www.xbox.com/uk-ua/games/store/-/${id}`,
        isGamePass: true,
        isNewToGamePass: newSet.has(id),
        isComingSoon: comingSet.has(id),
        isDiscounted: priceInfo.discountPercent > 0,
      });
      visitedIds.add(id);
    }
    // Додаємо ігри з EA Play, яких ще немає в головному каталозі
    for (const id of eaSet) {
      if (visitedIds.has(id)) continue;
      const product = detailMap.get(id);
      const title = product?.LocalizedProperties?.[0]?.ProductTitle;
      if (!title) continue;
      const priceInfo = product ? extractXboxPrice(product) : { originalPrice: 0, discountPrice: 0, discountPercent: 0, currency: 'UAH' };
      games.push({
        id,
        title,
        description: product?.LocalizedProperties?.[0]?.ProductDescription || '',
        imageUrl: product ? extractXboxImage(product) : '',
        originalPrice: priceInfo.originalPrice,
        discountPrice: priceInfo.discountPrice,
        discountPercent: priceInfo.discountPercent,
        currency: priceInfo.currency,
        url: `https://www.xbox.com/uk-ua/games/store/-/${id}`,
        isGamePass: true,
        isNewToGamePass: newSet.has(id) || eaSet.has(id),
        isComingSoon: comingSet.has(id),
        isDiscounted: priceInfo.discountPercent > 0,
      });
    }
    return { games, allIds, newIds: newSet, comingIds: comingSet };
  } catch (err) {
    throw new Error(`Error fetching Xbox games: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log("⚠️ Telegram credentials not found (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID). Skipping notification.");
    return;
  }
  
  // Never log the full URL: the bot token lives in the path and must not leak
  // into CI logs via error messages / stack traces.
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const logSafeUrl = 'https://api.telegram.org/bot[REDACTED]/sendMessage';
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
  } catch (err) {
    console.error(`❌ Telegram API network error for ${logSafeUrl}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
  
  if (!response.ok) {
    console.error(`❌ Telegram API error for ${logSafeUrl}: ${response.status}`);
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
      xbox: Array.isArray(p.xbox) ? (p.xbox as DealsData['xbox']) : [],
      notifiedHistory:
        p.notifiedHistory && typeof p.notifiedHistory === 'object'
          ? (p.notifiedHistory as DealsData['notifiedHistory'])
          : {},
    };
  };

  let oldData: DealsData = { lastUpdated: "", epic: [], steam: [], xbox: [], notifiedHistory: {} };
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
  const freshXboxData = await fetchXboxGames();
  const freshXbox = freshXboxData.games;
  
  // Guard against API/scraping failure:
  // If we fetched 0 games but we had games previously, it's highly likely a scrape failure.
  // We should keep the old data and abort rather than overwriting the dataset with empty arrays.
  if (freshEpic.length === 0 && oldData.epic.length > 0) {
    throw new Error('Scraped Epic Games list is empty, but previous data was not. Aborting to prevent data deletion.');
  }
  if (freshSteam.length === 0 && oldData.steam.length > 0) {
    throw new Error('Scraped Steam games list is empty, but previous data was not. Aborting to prevent data deletion.');
  }
  if (freshXbox.length === 0 && oldData.xbox.length > 0) {
    throw new Error('Fetched Xbox games list is empty, but previous data was not. Aborting to prevent data deletion.');
  }
  
  // Detect changes
  const newFreeGames: EpicGame[] = [];
  const newEpicDiscounts: EpicGame[] = [];
  const newSteamDeals: SteamGame[] = [];
  const newPopularGames: SteamGame[] = [];
  const newXboxAdditions: XboxGame[] = [];
  
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
        if (now.getTime() - lastNotified > FREE_GAME_COOLDOWN_MS) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newFreeGames.push(game);
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
        const cooldownExpired = now.getTime() - lastNotified > DISCOUNT_COOLDOWN_MS;
        if (priceDropped || cooldownExpired) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newEpicDiscounts.push(game);
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
        const cooldownExpired = now.getTime() - lastNotified > DISCOUNT_COOLDOWN_MS;
        if (priceDropped || cooldownExpired) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newSteamDeals.push(game);
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
        const cooldownExpired = now.getTime() - lastNotified > DISCOUNT_COOLDOWN_MS;
        if (cooldownExpired) {
          shouldNotify = true;
        }
      }
      
      if (shouldNotify) {
        newPopularGames.push(game);
      }
    }
  }
  
  // Xbox: Find new Game Pass additions
  // Використовуємо ID попереднього запуску для виявлення нових ігор,
  // які могли не потрапити до списку "Нещодавно додані" (наприклад, Ubisoft).
  const oldXboxIds = new Set(oldData.xbox.map(g => g.id));

  for (const game of freshXbox) {
    // Вважаємо гру "новою", якщо:
    // 1. Вона позначена як isNewToGamePass (список "Нещодавно додані"), АБО
    // 2. Її ID немає в попередніх даних (нова в каталозі)
    const isNewToCatalog = !oldXboxIds.has(game.id);
    if (game.isNewToGamePass || isNewToCatalog) {
      const historyKey = `xbox_new_${game.id}`;
      const historyEntry = notifiedHistory[historyKey];
      let shouldNotify = false;
      if (!historyEntry) {
        shouldNotify = true;
      } else {
        const lastNotified = new Date(historyEntry.timestamp).getTime();
        if (now.getTime() - lastNotified > DISCOUNT_COOLDOWN_MS) {
          shouldNotify = true;
        }
      }
      if (shouldNotify) {
        newXboxAdditions.push(game);
      }
    }
  }

  console.log(`Detected: ${newFreeGames.length} free Epic, ${newEpicDiscounts.length} discounted Epic, ${newSteamDeals.length} hot Steam, ${newPopularGames.length} popular Steam, ${newXboxAdditions.length} new Xbox Game Pass.`);

  function markNotified(key: string, entry: NotifiedItem) {
    notifiedHistory[key] = entry;
  }

  // Shared Telegram-HTML builders to keep the notification blocks DRY.
  const gameTitle = (name: string) => `<b>${escapeHtml(name)}</b>`;
  const storeLink = (label: string, url: string) => `<a href="${escapeAttr(url)}">${label}</a>`;

  function formatDealLine(
    title: string,
    percent: number,
    originalPrice: number,
    discountPrice: number,
    currency: string,
    url: string,
    linkLabel: string,
  ): string {
    const pct = percent > 0 ? `-${percent}%` : 'знижка';
    return `🎮 ${gameTitle(title)}\n🏷️ Знижка: <b>${pct}</b>\n💰 Ціна: <s>${formatPrice(originalPrice, currency)}</s> ➡️ <b>${formatPrice(discountPrice, currency)}</b>\n🔗 ${storeLink(linkLabel, url)}`;
  }

  // Helper: split array of items into batches and send each as Telegram message.
  // Calls markSent(index) after each successful batch to prevent duplicate
  // notifications on the next cron run if a later batch fails.
  async function sendBatched<T>(
    header: string,
    items: T[],
    footer: string,
    buildItem: (item: T) => string,
    markSent: (index: number) => void,
  ) {
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      let text = header;
      for (const item of batch) {
        text += buildItem(item) + '\n\n';
      }
      text += footer;
      await sendTelegramMessage(text.slice(0, TG_MESSAGE_LIMIT));
      for (let j = 0; j < batch.length; j++) {
        markSent(i + j);
      }
    }
  }

  // Send notifications if there are any updates
  if (newFreeGames.length > 0) {
    for (const game of newFreeGames) {
      const desc = game.description?.trim();
      const text = `🎁 <b>БЕЗКОШТОВНА ГРА В EPIC GAMES STORE!</b>\n\n` +
                   `🎮 ${gameTitle(game.title)}\n` +
                   (desc ? `📝 ${escapeHtml(desc)}\n\n` : '') +
                   `📅 Роздача діє до: <b>${formatDate(game.endDate, true)}</b>\n\n` +
                   `🔗 ${storeLink('Забрати гру в магазині', game.url)}`;
      try {
        await sendTelegramMessage(text);
        markNotified(`epic_free_${game.id}`, {
          title: game.title, price: 0, percent: 100, timestamp: now.toISOString(), type: 'free'
        });
      } catch (err) {
        console.error(`❌ Failed to notify free game ${game.title}:`, err);
      }
    }
  }
  
  if (newEpicDiscounts.length > 0) {
    await sendBatched(
      `🔥 <b>ГАРЯЧІ ЗНИЖКИ В EPIC GAMES STORE!</b>\n\n`,
      newEpicDiscounts,
      `🚀 Більше пропозицій дивіться на нашому сайті!`,
      (deal) => formatDealLine(deal.title, deal.discountPercent, deal.originalPrice, deal.discountPrice, deal.currency, deal.url, 'Детальніше в Epic Games Store'),
      (i) => markNotified(`epic_discount_${newEpicDiscounts[i].id}`, {
        title: newEpicDiscounts[i].title, price: newEpicDiscounts[i].discountPrice, percent: newEpicDiscounts[i].discountPercent, timestamp: now.toISOString(), type: 'discount'
      }),
    );
  }
  
  if (newSteamDeals.length > 0) {
    await sendBatched(
      `🔥 <b>ГАРЯЧІ ЗНИЖКИ В STEAM (від 5%)!</b>\n\n`,
      newSteamDeals,
      `🚀 Більше знижок дивіться на нашому сайті!`,
      (deal) => formatDealLine(deal.title, deal.discountPercent, deal.originalPrice, deal.discountPrice, deal.currency, deal.url, 'Детальніше в Steam'),
      (i) => markNotified(`steam_discount_${newSteamDeals[i].id}`, {
        title: newSteamDeals[i].title, price: newSteamDeals[i].discountPrice, percent: newSteamDeals[i].discountPercent, timestamp: now.toISOString(), type: 'discount'
      }),
    );
  }
  
  if (newPopularGames.length > 0) {
    await sendBatched(
      `⭐ <b>ТРЕНДОВІ ІГРИ В STEAM (TOP SELLERS)!</b>\n\n`,
      newPopularGames,
      `🚀 Більше популярних ігор дивіться на нашому сайті!`,
      (game) => {
        const priceText = game.discountPercent > 0 
          ? `<s>${formatPrice(game.originalPrice, game.currency)}</s> ➡️ <b>${formatPrice(game.discountPrice, game.currency)}</b> (-${game.discountPercent}%)`
          : `<b>${formatPrice(game.discountPrice, game.currency)}</b>`;
        return `🎮 ${gameTitle(game.title)}\n💰 Ціна: ${priceText}\n🔗 ${storeLink('Дивитися в Steam', game.url)}`;
      },
      (i) => markNotified(`steam_popular_${newPopularGames[i].id}`, {
        title: newPopularGames[i].title, price: newPopularGames[i].discountPrice, percent: newPopularGames[i].discountPercent, timestamp: now.toISOString(), type: 'popular'
      }),
    );
  }
  
  if (newXboxAdditions.length > 0) {
    await sendBatched(
      `🎮 <b>НОВІ ІГРИ В PC GAME PASS!</b>\n\n`,
      newXboxAdditions,
      `🚀 Більше ігор PC Game Pass дивіться на нашому сайті!`,
      (game) => {
        let text = `🎮 ${gameTitle(game.title)}\n`;
        const desc = game.description?.trim();
        if (desc) {
          text += `📝 ${escapeHtml(desc.slice(0, 120))}${desc.length > 120 ? '…' : ''}\n`;
        }
        if (game.originalPrice > 0) {
          text += `💰 Ціна в магазині: <b>${formatPrice(game.originalPrice, game.currency)}</b>\n`;
        }
        if (game.isComingSoon) {
          text += `📅 Скоро в Game Pass\n`;
        } else {
          text += `✅ Доступно в PC Game Pass\n`;
        }
        text += `🔗 ${storeLink('Microsoft Store', game.url)}`;
        return text;
      },
      (i) => markNotified(`xbox_new_${newXboxAdditions[i].id}`, {
        title: newXboxAdditions[i].title, price: 0, percent: 0, timestamp: now.toISOString(), type: 'xbox_new'
      }),
    );
  }
  
  // Save updated data
  const newData: DealsData = {
    lastUpdated: new Date().toISOString(),
    epic: freshEpic,
    steam: freshSteam,
    xbox: freshXbox,
    notifiedHistory
  };
  
  await fs.promises.mkdir(DEALS_DIR, { recursive: true });
  await fs.promises.writeFile(DEALS_PATH, JSON.stringify(newData, null, 2), 'utf-8');
  console.log(`✅ Saved new data to ${DEALS_PATH}`);
}

run().catch(err => {
  console.error("❌ Critical error running fetcher:", err);
  process.exit(1);
});
