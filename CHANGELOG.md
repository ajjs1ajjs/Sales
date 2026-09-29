# Changelog

## [Unreleased]

### Додано

- **Автоматичний реліз за розкладом**: `release.yml` запускається щодня (`05:17 UTC`) і публікує збірку в `ajjs1ajjs/dist/sales`, лише якщо вона відрізняється від опублікованої (інакше версія/тег не створюються). Перший успішний запуск після оновлення лімітів Actions (1 жовтня) перепублікує поточний білд.

### Виправлено

- **Тема**: збережена тема застосовується при завантаженні сторінки та при синхронізації між вкладками (`ThemeToggle`).
- **Фільтр ціни**: підтримка десяткових цін (напр. 46.75), ввід більше не спотворюється клемом на кожен keystroke; додано `aria-expanded`/`aria-controls`.
- **Обране**: безпечна підстановка назви гри в `aria-label` (без `$&`-патернів) + `aria-pressed`.
- **Доступність**: заголовки секцій зберегли роль `heading`; виправлено конфлікт `role="alert"` / `aria-live`; локалізовано `aria-label` Telegram-банера.
- **fetch-deals**: fallback-дані тягнуться з актуального `/dist/sales/data/...` (раніше — мертвий `/Sales/...`, HTTP 404).
- **CI/Release**: `npm audit --audit-level=high` більше не валить збірку (оновлено lockfile); прибрано дублювання запусків на push до `main` та на md-only змінах (економія Actions-хвилин); аудит додано в release-пайплайн.

### Видалено

- **Підтримка Windows та Debian**: видалено `scripts/install.ps1` (Windows-інсталятор) та секцію Windows з README. Тепер встановлення/розгортання підтримується лише на **Ubuntu** через `scripts/install.sh` (curl one-liner).
- Всі згадки про Windows, PowerShell, Debian та інші ОС прибрані з документації та інструкцій.

### Змінено

- `package.json`: прибрано застаріле поле `"license": "MIT"` (файл `LICENSE` видалено, репозиторій приватний).
- README: задокументовано секрет `PUBLIC_RELEASE_TOKEN`, оновлено схему збірки/деплою (дані — у публічному `dist`, збірка — у цьому репо).
- `scripts/install.sh`: суворо перевіряє Ubuntu (видалено підтримку Debian), оновлено повідомлення про помилки.

### Тести

- Додано регресійні набори `ThemeToggle`, `CollapsibleSection` та кейси десяткових цін у `PriceRangeFilter` (56/56).

## [1.5.0] - 2026-09-15

### Fixed (leftover findings)

- **PWA icons**: generated `public/icons/icon-192.png` + `icon-512.png` (maskable, brand gamepad) via `scripts/generate-icons.mjs` — Chrome installability no longer relies on SVG alone; wired into manifest + `apple-touch-icon`.
- **Single deploy path**: removed competing `peaceiris/actions-gh-pages` deploy from `scheduler.yml` — Pages now deploys only via official `deploy-pages` (`pages.yml`), PAT `PUBLIC_RELEASE_TOKEN` no longer used; data-commit pushes trigger the same pipeline.
- Dead `Build React App` step in scheduler removed (artifact was discarded anyway).

## [1.4.0] - 2026-09-15

### Security (audit round, all findings closed)

- **CSP**: `object-src 'none'` + `upgrade-insecure-requests` in meta tag.
- **History classes**: `safeHistoryType` allowlist before class interpolation.
- **Build URLs**: `encodeURIComponent` on all upstream IDs (Epic slug, Steam/Xbox IDs, SGL IDs, batches).
- **Pipeline**: `CONFIG.tgTimeoutMs` wired; notified-history per-entry coercion; `replaceAll` token redact; `finiteOr` clamps Infinity.
- **Supply chain**: `vite-plugin-pwa` pinned exact + patch rationale in `patches/README.md`; lock/manifest versions synced; Dependabot (npm + actions); `npm audit` in scheduler CI.
- **CI**: least-privilege permissions, SHA-pinned actions, Node 22 everywhere, tsc gate in pages build; sitemap without dead `#/history` URL.

### Tests

- 3 new regression suites (allowlist, finiteOr, coercion). `npm test` 50/50, `eslint` clean, `vite build` ok.

## [1.1.0] - 2026-09-01

### Додано

- **Windows-підтримка встановлення повернена**: відновлено `scripts/install.ps1` (одна команда `irm ... | iex`) — той самий сценарій, що й `scripts/install.sh`, включно з підтримкою прапорця `-Dev`. Відповідний розділ додано в README.md.

### Виправлено

- **Битий бейдж License: MIT**: додано файл `LICENSE` (MIT) у корені репозиторію — раніше бейдж у README посилався на файл, якого не існувало. Додано поле `"license": "MIT"` у `package.json`.
- **Застарілий CI-бейдж**: посилання на неіснуючий `ajjs1ajjs/Sales-source` замінено на реальний workflow `ajjs1ajjs/Sales/actions/workflows/scheduler.yml`.

## [1.0.1] - 2026-08-31

### Змінено

- **Лише Ubuntu / Debian**: видалено `scripts/install.ps1` (Windows-інсталятор) та Windows-секцію з README. Тепер встановлення/розгортання підтримується лише на Ubuntu / Debian через `scripts/install.sh`.

