# Changelog

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

## [Unreleased]

### Видалено

- **Підтримка Windows та Debian**: видалено `scripts/install.ps1` (Windows-інсталятор) та секцію Windows з README. Тепер встановлення/розгортання підтримується лише на **Ubuntu** через `scripts/install.sh` (curl one-liner).
- Всі згадки про Windows, PowerShell, Debian та інші ОС прибрані з документації та інструкцій.

### Змінено

- `scripts/install.sh`: суворо перевіряє Ubuntu (видалено підтримку Debian), оновлено повідомлення про помилки.

## [1.1.0] - 2026-09-01

### Додано

- **Windows-підтримка встановлення повернена**: відновлено `scripts/install.ps1` (одна команда `irm ... | iex`) — той самий сценарій, що й `scripts/install.sh`, включно з підтримкою прапорця `-Dev`. Відповідний розділ додано в README.md.

### Виправлено

- **Битий бейдж License: MIT**: додано файл `LICENSE` (MIT) у корені репозиторію — раніше бейдж у README посилався на файл, якого не існувало. Додано поле `"license": "MIT"` у `package.json`.
- **Застарілий CI-бейдж**: посилання на неіснуючий `ajjs1ajjs/Sales-source` замінено на реальний workflow `ajjs1ajjs/Sales/actions/workflows/scheduler.yml`.

## [1.0.1] - 2026-08-31

### Змінено

- **Лише Ubuntu / Debian**: видалено `scripts/install.ps1` (Windows-інсталятор) та Windows-секцію з README. Тепер встановлення/розгортання підтримується лише на Ubuntu / Debian через `scripts/install.sh`.

