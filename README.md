# Game Sales Aggregator

<div align="center">

**Персональний радар знижок та безкоштовних ігор**

[![Сайт](https://img.shields.io/badge/🌐_Сайт-ajjs1ajjs.github.io/Sales-blue?style=for-the-badge)](https://ajjs1ajjs.github.io/Sales/)
[![Telegram](https://img.shields.io/badge/📢_Telegram-@salesgamesua-2CA5E0?style=for-the-badge&logo=telegram)](https://t.me/salesgamesua)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/ajjs1ajjs/Sales/scheduler.yml?style=for-the-badge&label=Автооновлення)](https://github.com/ajjs1ajjs/Sales/actions)

</div>

---

## Про проект

**Game Sales Aggregator** — це автоматичний агрегатор ігрових знижок та безкоштовних роздач. Збирає актуальні пропозиції зі **Steam** та **Epic Games Store** і публікує їх на сайті та у Telegram-каналі.

### Що відстежується:

| Платформа | Тип | Опис |
|-----------|-----|-------|
| **Epic Games** | Безкоштовні роздачі | Ігри, які зараз безкоштовні |
| **Epic Games** | Майбутні роздачі | Ігри, що стануть безкоштовними невдовзі |
| **Steam** | Гарячі знижки | Акційні пропозиції від 5% |
| **Steam** | Топ продажів | Лідери продажів прямо зараз |
| **Steam** | Нові релізи | Свіжі популярні новинки |

### Можливості сайту:

- **Пошук** за назвою гри (з debounce 300 мс)
- **Фільтрація** за категоріями (Epic/Steam, безкоштовні/знижки/тренди)
- **Сортування** за ціною, відсотком знижки або назвою
- **Фільтр ціни** — вибір діапазону цін
- **Список бажань** — додавайте ігри в обране (зберігається в localStorage)
- **Історія сповіщень** — перегляд виявлених знижок за останні 30 днів
- **Темна/світла тема** — перемикання одним кліком
- **PWA** — можливість встановити як додаток на телефон/ПК
- **Офлайн-режим** — кешування через Service Worker
- **Двомовність** — українська та англійська мови (перемикання в хедері)
- **SEO** — Open Graph, Twitter Cards, JSON-LD, sitemap.xml

---

## Як це працює

```
Кожну годину (24/7)
        │
        ▼
GitHub Actions запускає скрипт
        │
        ▼
Збираються дані з API Steam та Epic Games
        │
        ├──▶ Оновлюється deals.json у репозиторії
        │
        ├──▶ Генерується sitemap.xml
        │
        ├──▶ Будується React-додаток → GitHub Pages (сайт)
        │
        └──▶ Нові знижки/роздачі → Telegram-канал
```

---

## Технології

- **Frontend:** React 19 + TypeScript + Vite + React Router
- **Стилі:** Vanilla CSS з Glassmorphism-ефектами, темна/світла теми
- **Локалізація:** Власна i18n система (LocaleContext) — українська та англійська мови
- **Скрипт збору даних:** Node.js + TypeScript (tsx)
- **Автоматизація:** GitHub Actions (cron кожну годину)
- **Хостинг:** GitHub Pages
- **Сповіщення:** Telegram Bot API
- **PWA:** vite-plugin-pwa + Service Worker з Network-First стратегією

---

## Локальний запуск

### Вимоги
- Node.js 18+
- npm

### Встановлення

```bash
git clone https://github.com/ajjs1ajjs/Sales.git
cd Sales

npm install
```

### Запуск

```bash
# Отримати актуальні дані
npm run fetch

# Запустити сайт локально
npm run dev

# Зібрати продакшн-білд
npm run build

# Лінтер
npm run lint

# Тести
npm test
```

---

## Налаштування GitHub Actions

Для повноцінної роботи потрібно додати **секрети** у налаштуваннях репозиторію:

`Settings → Secrets and variables → Actions → New repository secret`

| Секрет | Опис |
|--------|------|
| `TELEGRAM_BOT_TOKEN` | Токен бота від @BotFather |
| `TELEGRAM_CHAT_ID` | ID вашого Telegram-каналу |

### Отримання Chat ID каналу:
1. Додайте бота як адміністратора каналу
2. Надішліть повідомлення в канал
3. Відкрийте: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Знайдіть поле `"chat": {"id": ...}`

---

## Структура проекту

```
Sales/
├── .github/
│   └── workflows/
│       └── scheduler.yml          # GitHub Actions (запуск щогодини)
├── public/
│   ├── data/
│   │   └── deals.json             # Актуальні дані про знижки
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/
│   ├── fetch-deals.ts             # Скрипт збору даних з API
│   └── generate-sitemap.ts        # Генерація sitemap.xml
├── src/
│   ├── __tests__/                 # Тести ErrorBoundary
│   ├── components/
│   │   ├── __tests__/             # Тести компонентів
│   │   ├── EpicSection.tsx        # Секція Epic Games
│   │   ├── ErrorBoundary.tsx      # Обробка помилок React
│   │   ├── GameCard.tsx           # Картка гри
│   │   ├── HistoryPage.tsx        # Сторінка історії сповіщень
│   │   ├── InstallPWA.tsx         # Банер встановлення PWA
│   │   ├── PriceRangeFilter.tsx   # Фільтр за діапазоном цін
│   │   ├── SearchControls.tsx     # Пошук та фільтри
│   │   ├── ShowMore.tsx           # Кнопка "Показати ще"
│   │   ├── Skeleton.tsx           # Скелетон-завантаження
│   │   ├── SortControls.tsx       # Сортування
│   │   ├── SteamSection.tsx       # Секція Steam
│   │   ├── TelegramBanner.tsx     # Банер Telegram
│   │   ├── ThemeToggle.tsx        # Перемикач теми
│   │   └── WishlistButton.tsx     # Кнопка обраного
│   ├── hooks/
│   │   ├── useDebounce.ts         # Debounce hook
│   │   ├── useInstallPWA.ts       # PWA install hook
│   │   └── useLocalStorage.ts     # localStorage hook
│   ├── App.tsx                    # Головний компонент + роутер
│   ├── index.css                  # Стилі
│   ├── main.tsx                   # Точка входу
│   ├── sw.ts                      # Service Worker
│   ├── test-setup.ts              # Налаштування тестів
│   ├── types.ts                   # Типи TypeScript
│   └── utils.ts                   # Утиліти (форматування)
├── index.html                     # HTML-шаблон з SEO мета-тегами
└── vite.config.ts                 # Конфігурація Vite + PWA
```

---

## Telegram-канал

Підписуйтесь на [@salesgamesua](https://t.me/salesgamesua) — отримуйте миттєві сповіщення про:
- Безкоштовні ігри від Epic Games
- Будь-які знижки у Steam
- Нові хіти продажів
- Популярні нові релізи

---

<div align="center">

Розроблено для геймерів з ❤️

</div>
