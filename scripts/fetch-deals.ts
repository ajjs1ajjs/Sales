import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEALS_DIR = path.join(process.cwd(), 'public', 'data');
const DEALS_PATH = path.join(DEALS_DIR, 'deals.json');

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

interface SteamDeal {
  id: string;
  title: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  currency: string;
  url: string;
}

interface DealsData {
  lastUpdated: string;
  epic: EpicGame[];
  steam: SteamDeal[];
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
  } catch (err) {
    return dateStr;
  }
}

async function fetchEpicGames(): Promise<EpicGame[]> {
  try {
    console.log("Fetching Epic Games promotions...");
    const url = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';
    const res = await fetch(url);
    const data = await res.json();
    const elements = data.data.Catalog.searchStore.elements || [];
    
    const games: EpicGame[] = [];
    
    for (const item of elements) {
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
            startDate = offer.startDate;
            endDate = offer.endDate;
          }
        }
      }
      
      // Upcoming promotions
      const upcomingOffers = item.promotions?.upcomingPromotionalOffers || [];
      for (const block of upcomingOffers) {
        for (const offer of block.promotionalOffers || []) {
          if (offer.discountSetting?.discountPercentage === 0) {
            isUpcomingFree = true;
            startDate = offer.startDate;
            endDate = offer.endDate;
          }
        }
      }
      
      if (isFreeNow || isUpcomingFree) {
        // Find suitable image
        const images = item.keyImages || [];
        const imageTypes = ['DieselStoreFrontWide', 'OfferImageWide', 'Thumbnail', 'OfferImageTall'];
        let imageUrl = "";
        for (const type of imageTypes) {
          const found = images.find((img: any) => img.type === type);
          if (found) {
            imageUrl = found.url;
            break;
          }
        }
        if (!imageUrl && images.length > 0) {
          imageUrl = images[0].url;
        }
        
        // Resolve slug for the URL
        let slug = item.catalogNs?.mappings?.[0]?.pageSlug || item.productSlug;
        if (Array.isArray(slug)) {
          slug = slug[0] || "";
        }
        if (typeof slug !== 'string' || !slug || slug === '[]') {
          const attrSlug = item.customAttributes?.find((attr: any) => attr.key === 'com.epicgames.app.productSlug')?.value;
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
          originalPrice: item.price.totalPrice.originalPrice / 100,
          discountPrice: item.price.totalPrice.discountPrice / 100,
          currency: item.price.totalPrice.currencyCode || "USD",
          url: gameUrl,
          startDate,
          endDate,
          isFreeNow,
          isUpcomingFree
        });
      }
    }
    
    return games;
  } catch (err) {
    console.error("❌ Error fetching Epic Games:", err);
    return [];
  }
}

async function fetchSteamDeals(): Promise<SteamDeal[]> {
  try {
    console.log("Fetching Steam specials...");
    const url = 'https://store.steampowered.com/api/featuredcategories/?cc=UA&l=ukrainian';
    const res = await fetch(url);
    const data = await res.json();
    const specials = data.specials?.items || [];
    
    const deals: SteamDeal[] = [];
    
    for (const item of specials) {
      deals.push({
        id: String(item.id),
        title: item.name,
        imageUrl: item.large_capsule_image || item.header_image || item.capsule_image,
        originalPrice: item.original_price / 100,
        discountPrice: item.final_price / 100,
        discountPercent: item.discount_percent,
        currency: item.currency || "UAH",
        url: `https://store.steampowered.com/app/${item.id}`
      });
    }
    
    return deals;
  } catch (err) {
    console.error("❌ Error fetching Steam deals:", err);
    return [];
  }
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
  let oldData: DealsData = { lastUpdated: "", epic: [], steam: [] };
  if (fs.existsSync(DEALS_PATH)) {
    try {
      oldData = JSON.parse(fs.readFileSync(DEALS_PATH, 'utf-8'));
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
        oldData = await res.json();
        console.log("✅ Loaded previous deals from GitHub Pages.");
      }
    } catch (err) {
      console.log("⚠️ Could not fetch from GitHub Pages, starting fresh.");
    }
  }
  
  // Fetch fresh data
  const freshEpic = await fetchEpicGames();
  const freshSteam = await fetchSteamDeals();
  
  // Detect changes
  const newFreeGames: EpicGame[] = [];
  const newSteamDeals: SteamDeal[] = [];
  
  // Epic: Find currently free games that were not free in the old data
  for (const game of freshEpic) {
    if (game.isFreeNow) {
      const wasFree = oldData.epic.some(oldGame => oldGame.id === game.id && oldGame.isFreeNow);
      if (!wasFree) {
        newFreeGames.push(game);
      }
    }
  }
  
  // Steam: Find new deals with >= 75% discount
  for (const deal of freshSteam) {
    if (deal.discountPercent >= 75) {
      const wasPresent = oldData.steam.some(oldDeal => oldDeal.id === deal.id);
      if (!wasPresent) {
        newSteamDeals.push(deal);
      }
    }
  }
  
  console.log(`Detected: ${newFreeGames.length} new free games, ${newSteamDeals.length} new hot Steam deals.`);
  
  // Send notifications if there are any updates
  if (newFreeGames.length > 0) {
    for (const game of newFreeGames) {
      const text = `🎁 <b>БЕЗКОШТОВНА ГРА В EPIC GAMES STORE!</b>\n\n` +
                   `🎮 <b>${game.title}</b>\n` +
                   `📝 ${game.description}\n\n` +
                   `📅 Роздача діє до: <b>${formatDate(game.endDate)}</b>\n\n` +
                   `🔗 <a href="${game.url}">Забрати гру в магазині</a>`;
      await sendTelegramMessage(text);
    }
  }
  
  if (newSteamDeals.length > 0) {
    let steamText = `🔥 <b>ГАРЯЧІ ЗНИЖКИ В STEAM (від 75%)!</b>\n\n`;
    for (const deal of newSteamDeals) {
      steamText += `🎮 <b>${deal.title}</b>\n` +
                   `🏷️ Знижка: <b>-${deal.discountPercent}%</b>\n` +
                   `💰 Ціна: <s>${deal.originalPrice} UAH</s> ➡️ <b>${deal.discountPrice} UAH</b>\n` +
                   `🔗 <a href="${deal.url}">Детальніше в Steam</a>\n\n`;
    }
    steamText += `🚀 Більше знижок дивіться на нашому сайті!`;
    await sendTelegramMessage(steamText);
  }
  
  // Save updated data
  const newData: DealsData = {
    lastUpdated: new Date().toISOString(),
    epic: freshEpic,
    steam: freshSteam
  };
  
  fs.mkdirSync(DEALS_DIR, { recursive: true });
  fs.writeFileSync(DEALS_PATH, JSON.stringify(newData, null, 2), 'utf-8');
  console.log(`✅ Saved new data to ${DEALS_PATH}`);
}

run().catch(err => {
  console.error("❌ Critical error running fetcher:", err);
  process.exit(1);
});
