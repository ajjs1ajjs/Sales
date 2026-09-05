# Changelog

## [1.1.0] - 2026-09-01

### Додано

- **Windows-підтримка встановлення повернена**: відновлено `scripts/install.ps1` (одна команда `irm ... | iex`) — той самий сценарій, що й `scripts/install.sh`, включно з підтримкою прапорця `-Dev`. Відповідний розділ додано в README.md.

### Виправлено

- **Битий бейдж License: MIT**: додано файл `LICENSE` (MIT) у корені репозиторію — раніше бейдж у README посилався на файл, якого не існувало. Додано поле `"license": "MIT"` у `package.json`.
- **Застарілий CI-бейдж**: посилання на неіснуючий `ajjs1ajjs/Sales-source` замінено на реальний workflow `ajjs1ajjs/Sales/actions/workflows/scheduler.yml`.

## [1.0.1] - 2026-08-31

### Змінено

- **Лише Ubuntu / Debian**: видалено `scripts/install.ps1` (Windows-інсталятор) та Windows-секцію з README. Тепер встановлення/розгортання підтримується лише на Ubuntu / Debian через `scripts/install.sh`.

