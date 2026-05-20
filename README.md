# 🎮 Game Sales Aggregator

<div align="center">

**Персональний радар знижок та безкоштовних ігор**

[![Сайт](https://img.shields.io/badge/🌐_Сайт-ajjs1ajjs.github.io/Sales-blue?style=for-the-badge)](https://ajjs1ajjs.github.io/Sales/)
[![Telegram](https://img.shields.io/badge/📢_Telegram-@salesgamesua-2CA5E0?style=for-the-badge&logo=telegram)](https://t.me/salesgamesua)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/ajjs1ajjs/Sales/scheduler.yml?style=for-the-badge&label=Автооновлення)](https://github.com/ajjs1ajjs/Sales/actions)

</div>

---

## 📖 Про проект

**Game Sales Aggregator** — це автоматичний агрегатор ігрових знижок та безкоштовних роздач. Збирає актуальні пропозиції зі **Steam** та **Epic Games Store** і публікує їх на сайті та у Telegram-каналі.

### ✨ Що відстежується:

| Платформа | Тип | Опис |
|-----------|-----|-------|
| 🎁 **Epic Games** | Безкоштовні роздачі | Ігри, які зараз безкоштовні |
| 🎁 **Epic Games** | Майбутні роздачі | Ігри, що стануть безкоштовними невдовзі |
| 🔥 **Steam** | Гарячі знижки | Акційні пропозиції від 5% |
| ⭐ **Steam** | Топ продажів | Лідери продажів прямо зараз |
| 🆕 **Steam** | Нові релізи | Свіжі популярні новинки |

---

## 🚀 Як це працює

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
        ├──▶ Будується React-додаток → GitHub Pages (сайт)
        │
        └──▶ Нові знижки/роздачі → Telegram-канал 📢
```

---

## 🛠️ Технології

- **Frontend:** React + TypeScript + Vite
- **Стилі:** Vanilla CSS з Glassmorphism-ефектами
- **Скрипт збору даних:** Node.js + TypeScript (tsx)
- **Автоматизація:** GitHub Actions (cron кожну годину)
- **Хостинг:** GitHub Pages
- **Сповіщення:** Telegram Bot API

---

## 📦 Локальний запуск

### Вимоги
- Node.js 18+
- npm

### Встановлення

```bash
# Клонувати репозиторій
git clone https://github.com/ajjs1ajjs/Sales.git
cd Sales

# Встановити залежності
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
```

---

## ⚙️ Налаштування GitHub Actions

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

## 📂 Структура проекту

```
Sales/
├── .github/
│   └── workflows/
│       └── scheduler.yml      # GitHub Actions (запуск щогодини)
├── public/
│   └── data/
│       └── deals.json         # Актуальні дані про знижки
├── scripts/
│   └── fetch-deals.ts         # Скрипт збору даних з API
├── src/
│   ├── App.tsx                # Головний компонент React
│   └── index.css              # Стилі (Glassmorphism)
└── index.html                 # HTML-шаблон з SEO мета-тегами
```

---

## 📢 Telegram-канал

Підписуйтесь на [@salesgamesua](https://t.me/salesgamesua) — отримуйте миттєві сповіщення про:
- 🎁 Безкоштовні ігри від Epic Games
- 🔥 Будь-які знижки у Steam
- ⭐ Нові хіти продажів
- 🆕 Популярні нові релізи

---

<div align="center">

Розроблено для геймерів з ❤️

</div>
