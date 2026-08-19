<p align="center">
  <img src="docs/banner.svg" width="100%" alt="Game Sales Aggregator">
</p>

# 🎮 Game Sales Aggregator

**Персональний радар знижок та безкоштовних ігор** — автоматично збирає актуальні пропозиції з **Steam**, **Epic Games Store** та **Xbox Game Pass (PC)** і публікує їх на сайті та у Telegram-каналі.

[![Сайт](https://img.shields.io/badge/🌐_Сайт-ajjs1ajjs.github.io/Sales-blue?style=for-the-badge)](https://ajjs1ajjs.github.io/Sales/)
[![Telegram](https://img.shields.io/badge/📢_Telegram-@salesgamesua-2CA5E0?style=for-the-badge&logo=telegram)](https://t.me/salesgamesua)
[![Version](https://img.shields.io/badge/version-v1.0.0-c084fc?style=for-the-badge)](https://github.com/ajjs1ajjs/Sales/releases)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/ajjs1ajjs/Sales/scheduler.yml?style=for-the-badge&label=Автооновлення)](https://github.com/ajjs1ajjs/Sales/actions)

---

## 🖼️ Інтерфейс

| Головна сторінка | Історія сповіщень |
|---|---|
| <img src="docs/screenshots/main.png" alt="Головна сторінка"> | <img src="docs/screenshots/history.png" alt="Історія сповіщень"> |

## 📡 Що відстежується

| Платформа | Тип | Опис |
|-----------|-----|-------|
| **Epic Games** | Безкоштовні роздачі | Ігри, які зараз безкоштовні |
| **Epic Games** | Майбутні роздачі | Ігри, що стануть безкоштовними невдовзі |
| **Epic Games** | Знижки | Акційні пропозиції в Epic Games Store |
| **Steam** | Гарячі знижки | Акційні пропозиції від 5% |
| **Steam** | Топ продажів | Лідери продажів прямо зараз |
| **Xbox Game Pass PC** | Нові надходження | Ігри, щойно додані до PC Game Pass |
| **Xbox Game Pass PC** | Очікується | Ігри, що скоро з'являться в Game Pass |
| **Xbox Game Pass PC** | Знижки | Знижки на ігри з каталогу Game Pass |

## ✨ Можливості сайту

| | |
|---|---|
| 🔍 **Пошук** | за назвою гри, з debounce 300 мс |
| 🗂️ **Фільтрація** | за категоріями (Epic/Steam, безкоштовні/знижки/тренди) |
| ↕️ **Сортування** | за ціною, відсотком знижки або назвою |
| 💰 **Фільтр ціни** | вибір діапазону цін |
| ⭐ **Список бажань** | обрані ігри, зберігаються в localStorage |
| 🕘 **Історія сповіщень** | виявлені знижки за останні 30 днів |
| 🌗 **Теми** | темна/світла, перемикання одним кліком |
| 📱 **PWA** | встановлюється як додаток на телефон/ПК |
| 📴 **Офлайн-режим** | кешування через Service Worker |
| 🌐 **Двомовність** | українська та англійська (перемикання в хедері) |
| 🔎 **SEO** | Open Graph, Twitter Cards, JSON-LD, sitemap.xml |

## ⚙️ Як це працює

```
Кожну годину (24/7)
        │
        ▼
GitHub Actions запускає скрипт
        │
        ▼
Збираються дані з API Steam, Epic Games та Xbox Game Pass
        │
        ├──▶ Оновлюється deals.json у репозиторії
        │
        ├──▶ Генерується sitemap.xml
        │
        ├──▶ Будується React-додаток → GitHub Pages (сайт)
        │
        └──▶ Нові знижки/роздачі/додавання → Telegram-канал
```

## 🚀 Локальний запуск

**Вимоги:** Node.js 20+ · npm

```bash
git clone https://github.com/ajjs1ajjs/Sales.git
cd Sales
npm install

npm run fetch   # отримати актуальні дані
npm run dev     # запустити сайт локально
npm run build   # продакшн-білд
npm run lint    # лінтер
npm test        # тести
```

> **Цільове середовище:** проєкт повністю сумісний із **Ubuntu / Debian** серверами — збірка, тести та деплой у CI працюють на `ubuntu-latest`. Застосунок статичний (PWA), для розгортання `dist/` достатньо будь-якого веб-сервера (nginx, Caddy тощо).

## 🔑 Налаштування GitHub Actions

Для повноцінної роботи додайте **секрети** у `Settings → Secrets and variables → Actions`:

| Секрет | Опис |
|--------|------|
| `TELEGRAM_BOT_TOKEN` | Токен бота від @BotFather |
| `TELEGRAM_CHAT_ID` | ID вашого Telegram-каналу |

**Отримання Chat ID каналу:**
1. Додайте бота як адміністратора каналу
2. Надішліть повідомлення в канал
3. Відкрийте: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Знайдіть поле `"chat": {"id": ...}`

## 🧩 Технології

- **Frontend:** React 19 + TypeScript + Vite + React Router
- **Стилі:** Vanilla CSS з Glassmorphism-ефектами, темна/світла теми
- **Локалізація:** власна i18n (LocaleContext) — українська та англійська
- **Збір даних:** Node.js + TypeScript (tsx)
- **Автоматизація:** GitHub Actions (cron щогодини)
- **Хостинг:** GitHub Pages
- **Сповіщення:** Telegram Bot API
- **PWA:** vite-plugin-pwa + Service Worker

## 📁 Структура

```
Sales/
├── .github/workflows/scheduler.yml   # запуск щогодини
├── public/data/deals.json            # актуальні дані про знижки
├── scripts/
│   ├── fetch-deals.ts                # збір даних з API
│   └── generate-sitemap.ts           # генерація sitemap.xml
├── src/
│   ├── components/                   # GameCard, Epic/Steam/XboxSection та ін.
│   ├── contexts/                     # LocaleContext, WishlistContext
│   ├── hooks/                        # useDebounce, useInstallPWA, useLocalStorage
│   ├── locales/                      # uk.ts, en.ts
│   ├── App.tsx                       # роутер
│   ├── DataContext.tsx               # завантаження deals.json
│   └── sw.ts                         # Service Worker
└── vite.config.ts                    # Vite + PWA
```

## 📢 Telegram-канал

Підписуйтесь на [@salesgamesua](https://t.me/salesgamesua) — миттєві сповіщення про:
- Безкоштовні ігри від Epic Games
- Знижки в Epic Games Store
- Гарячі знижки у Steam (від 5%)
- Нові хіти продажів (Steam Top Sellers)
- Нові ігри в PC Game Pass
- Очікувані додавання до Game Pass

---

<div align="center">

Розроблено для геймерів з ❤️

</div>