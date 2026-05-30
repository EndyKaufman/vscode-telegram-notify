# Telegram Notify - Инструкция по установке и публикации

## 📋 Содержание

1. [Требования к системе](#требования-к-системе)
2. [Локальная сборка и установка](#локальная-сборка-и-установка)
3. [Тестирование расширения](#тестирование-расширения)
4. [Публикация в VS Code Marketplace](#публикация-в-vs-code-marketplace)
5. [Устранение проблем](#устранение-проблем)

---

## 🖥️ Требования к системе

### Для Ubuntu 24.04

**Установленные компоненты:**
- Node.js (версия 18 или выше)
- npm (менеджер пакетов)
- VS Code или его форк (Cursor, VSCodium, и т.д.)
- Git

### Проверка установленных компонентов

```bash
# Проверить Node.js
node --version
# Должно показать: v18.x.x или выше

# Проверить npm
npm --version
# Должно показать: 9.x.x или выше

# Проверить VS Code
code --version
# Должно показать версию VS Code
```

### Если Node.js не установлен

```bash
# Добавить репозиторий Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Установить Node.js
sudo apt-get install -y nodejs

# Проверить установку
node --version
npm --version
```

---

## 🔧 Локальная сборка и установка

### Шаг 1: Перейти в папку проекта

```bash
cd /home/endy/Projects/vscode-telegram-notify
```

### Шаг 2: Установить зависимости

```bash
npm install
```

Эта команда установит все необходимые пакеты:
- `node-telegram-bot-api` - для работы с Telegram Bot API
- `uuid` - для генерации уникальных ID кнопок
- `esbuild` - для сборки проекта
- `typescript` - компилятор TypeScript
- и другие зависимости

**Ожидаемый результат:**
```
added 444 packages, and audited 445 packages in 38s
```

### Шаг 3: Собрать расширение

```bash
npm run build
```

Эта команда создаст файл `dist/extension.js` - готовое расширение.

**Ожидаемый результат:**
```
dist/extension.js  1.1mb ⚠️
⚡ Done in 97ms
```

### Шаг 4: Проверить компиляцию TypeScript (опционально)

```bash
npm run compile
```

Если ошибок нет - всё хорошо. Команда должна завершиться без вывода ошибок.

### Шаг 5: Установить расширение в VS Code

Есть **два способа**:

#### Способ 1: Установка через VSIX файл (рекомендуется)

**5.1. Создать VSIX пакет:**

```bash
npx vsce package --no-dependencies
```

Будет создан файл, например: `vscode-telegram-notify-0.1.0.vsix`

**5.3. Установить в VS Code:**

```bash
code --install-extension vscode-telegram-notify-0.1.0.vsix
```

Или через GUI:
1. Открыть VS Code
2. Перейти в Extensions (`Ctrl+Shift+X`)
3. Нажать на три точки (`...`) в правом верхнем углу
4. Выбрать "Install from VSIX..."
5. Выбрать файл `vscode-telegram-notify-0.1.0.vsix`

#### Способ 2: Запуск в режиме разработки

```bash
# Открыть проект в VS Code
code /home/endy/Projects/vscode-telegram-notify

# Нажать F5 для запуска в режиме разработки
```

Откроется новое окно VS Code с установленным расширением. Это удобно для тестирования.

---

## 🧪 Тестирование расширения

### После установки

1. **Перезапустите VS Code** (если устанавливали через VSIX)

2. **Откройте Command Palette:**
   - `Ctrl+Shift+P` (или `Cmd+Shift+P` на Mac)

3. **Найдите команду setup:**
   - Начните вводить: `Telegram Notify: Setup Bot`
   - Выберите эту команду

### Настройка Telegram бота

#### Шаг 1: Создать бота в Telegram

1. Откройте Telegram
2. Найдите бота **@BotFather**
3. Отправьте команду `/newbot`
4. BotFather попросит ввести:
   - **Имя бота** (например: "My VS Code Notifier")
   - **Username бота** (должен заканчиваться на `bot`, например: `my_vscode_notifier_bot`)
5. **Сохраните токен бота** (выглядит так: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

#### Шаг 2: Получить Chat ID

**Для личных сообщений:**

1. Найдите в Telegram бота **@userinfobot**
2. Отправьте `/start`
3. Скопируйте ваш ID (например: `123456789`)

**Для группы:**

1. Добавьте вашего бота в группу
2. Отправьте любое сообщение в группу
3. Откройте в браузере:
   ```
   https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates
   ```
4. Найдите `chat.id` в ответе (для групп отрицательный, например: `-1001234567890`)

#### Шаг 3: Настроить расширение

1. В VS Code выполните: `Telegram Notify: Setup Bot`
2. Введите токен бота
3. Введите Chat ID
4. Выберите: включить уведомления или нет
5. Отправьте тестовое сообщение

### Проверка работы

**Отправить тестовое уведомление:**

1. `Ctrl+Shift+P`
2. `Telegram Notify: Send Test Notification`
3. Проверьте Telegram - должно прийти сообщение

**Проверить статус:**

Посмотрите на строку состояния (внизу справа):
- 🟢 `Telegram: Connected` - всё работает
- 🟡 `Telegram: Disabled` - уведомления отключены
- 🔴 `Telegram: Error` - ошибка подключения

### Просмотр логов

Если что-то не работает:

1. `View` → `Output` (или `Ctrl+Shift+U`)
2. В выпадающем списке выберите `Telegram Notify`
3. Посмотрите сообщения об ошибках

---

## 📦 Публикация в VS Code Marketplace

### Шаг 1: Подготовка к публикации

#### 1.1. Создать аккаунт на Azure DevOps

1. Перейдите на: https://aka.ms/SignupAzureDevOps
2. Создайте аккаунт (можно через Microsoft/GitHub)

#### 1.2. Создать Personal Access Token (PAT)

1. Войдите в Azure DevOps
2. Перейдите в: https://dev.azure.com/<your-organization>/_usersSettings/tokens
3. Нажмите "New Token"
4. Настройки:
   - **Name**: VS Code Publisher
   - **Organization**: All accessible organizations
   - **Expiration**: 1 year (или меньше)
   - **Scopes**: Custom defined → Marketplace → **Manage**
5. Сохраните токен (он покажется один раз!)

#### 1.3. Создать издателя (Publisher)

```bash
# Войти в Azure DevOps через vsce
npx vsce login your-publisher-name
```

Или создать через веб-интерфейс:
https://marketplace.visualstudio.com/manage

### Шаг 2: Обновить package.json

Откройте `package.json` и обновите поля:

```json
{
  "name": "vscode-telegram-notify",
  "displayName": "Telegram Notify",
  "description": "Forward VS Code notifications to Telegram with interactive button support",
  "version": "1.0.0",
  "publisher": "your-publisher-name",  // ← ВАЖНО: Замените на ваш publisher
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/vscode-telegram-notify"  // ← Ваш GitHub
  },
  "homepage": "https://github.com/your-username/vscode-telegram-notify/blob/main/README.md",
  "bugs": {
    "url": "https://github.com/your-username/vscode-telegram-notify/issues"
  },
  "icon": "resources/icon.png",  // ← Добавьте иконку 128x128
  "galleryBanner": {
    "color": "#007ACC",
    "theme": "dark"
  },
  "keywords": [
    "telegram",
    "notification",
    "bot",
    "message",
    "alert"
  ],
  "categories": [
    "Other"
  ]
}
```

### Шаг 3: Добавить иконку (опционально, но рекомендуется)

Создайте файл `resources/icon.png` (128x128 пикселей):

```bash
# Создать папку
mkdir -p resources

# Если есть изображение, скопируйте его:
cp /path/to/your/icon.png resources/icon.png
```

Или создайте простую иконку с помощью любого графического редактора.

### Шаг 4: Обновить README для Marketplace

Marketplace использует README.md как страницу расширения. Убедитесь, что:
- Есть скриншоты или GIF (загрузите в `/resources` папку)
- Четкое описание функционала
- Инструкции по установке
- Примеры использования

### Шаг 5: Сборка пакета

```bash
# Убедиться, что всё собрано
npm run build

# Создать VSIX пакет
npx vsce package --no-dependencies
```

Будет создан файл: `vscode-telegram-notify-1.0.0.vsix`

### Шаг 6: Публикация

#### Способ 1: Через командную строку

```bash
# Опубликовать
npx vsce publish
```

Или с токеном напрямую:

```bash
npx vsce publish -p <your-personal-access-token>
```

#### Способ 2: Через веб-интерфейс

1. Перейдите на: https://marketplace.visualstudio.com/manage
2. Нажмите "Create extension"
3. Загрузите VSIX файл
4. Заполните информацию
5. Нажмите "Publish"

### Шаг 7: Проверка публикации

1. Перейдите на: https://marketplace.visualstudio.com/vscode
2. Найдите ваше расширение по имени
3. Проверьте страницу расширения

### Обновление расширения

```bash
# Обновить версию в package.json
# Например: 1.0.0 → 1.0.1

# Собрать и опубликовать
npm run build
vsce publish
```

---

## 🔍 Устранение проблем

### Ошибка: `node: command not found`

**Решение:**
```bash
# Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Ошибка: `vsce: command not found`

**Решение:**
```bash
# vsce уже установлен в проекте, используйте npx
npx vsce package
```

### Ошибка компиляции TypeScript

**Решение:**
```bash
# Очистить и переустановить
rm -rf node_modules dist out package-lock.json
npm install
npm run build
```

### Ошибка: `EPUBLISHCONFLICT` при публикации

**Причина:** Такая версия уже существует.

**Решение:**
```bash
# Увеличить версию в package.json
# Например: 1.0.0 → 1.0.1
npm version patch  # или minor, или major

# Опубликовать
npx vsce publish
```

### Бот не отправляет сообщения

**Проверки:**
1. Токен бота правильный?
2. Chat ID правильный? (число, может быть отрицательным для групп)
3. Бот не заблокирован в Telegram?
4. Расширение включено? (проверить в настройках)

**Диагностика:**
1. `Ctrl+Shift+U` → выбрать `Telegram Notify`
2. Посмотреть логи
3. Проверить статус в строке состояния

### Кнопки в Telegram не работают

**Причины:**
1. VS Code закрыт
2. Время жизни кнопок истекло (по умолчанию 5 минут)
3. Ошибка в команде

**Решение:**
- Проверьте логи в Output панели
- Отправьте новое уведомление (кнопки создадутся заново)

### Ошибка при установке VSIX

**Решение:**
```bash
# Проверить, что VS Code закрыт
# Установить через командную строку
code --install-extension vscode-telegram-notify-0.1.0.vsix --force
```

### Рас расширение не появляется в Command Palette

**Причины:**
1. Расширение не активировано
2. Ошибка при загрузке

**Решение:**
1. Перезапустить VS Code
2. Проверить логи: `Help` → `Toggle Developer Tools` → `Console`
3. Проверить, что расширение включено: `Extensions` → найти `Telegram Notify` → включить

---

## 📚 Дополнительные ресурсы

### Полезные команды npm

```bash
# Установить зависимости
npm install

# Собрать проект
npm run build

# Следить за изменениями (автосборка)
npm run watch

# Проверить TypeScript
npm run compile

# Проверить код линтером
npm run lint
```

### Структура проекта

```
vscode-telegram-notify/
├── src/                    # Исходный код TypeScript
│   ├── extension.ts        # Точка входа
│   ├── telegramBot.ts      # Telegram бот
│   ├── buttonHandler.ts    # Обработка кнопок
│   └── ...
├── dist/                   # Собранный JavaScript
│   └── extension.js        # Готовое расширение
├── package.json            # Манифест расширения
├── README.md               # Документация
└── .vsix                   # Пакет для установки
```

### Где найти расширение после установки

**Linux:**
```
~/.vscode/extensions/
# или
~/.vscode-server/extensions/
```

**Windows:**
```
%USERPROFILE%\.vscode\extensions\
```

**Mac:**
```
~/.vscode/extensions/
```

---

## 🎯 Быстрая шпаргалка

### Для локальной разработки:
```bash
cd /home/endy/Projects/vscode-telegram-notify
npm install
npm run build
code .
# Нажать F5
```

### Для публикации:
```bash
npm run build
npx vsce publish
```

### Для тестирования:
```bash
# В VS Code:
# 1. Ctrl+Shift+P
# 2. Telegram Notify: Setup Bot
# 3. Ввести токен и Chat ID
# 4. Telegram Notify: Send Test Notification
```

---

## 💡 Советы

1. **Всегда тестируйте перед публикацией** - используйте F5 для тестирования
2. **Увеличивайте версию** перед каждой публикацией
3. **Обновляйте CHANGELOG.md** с описанием изменений
4. **Добавляйте скриншоты** в README для Marketplace
5. **Проверяйте логи** при ошибках - Output → Telegram Notify

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в Output панели
2. Посмотрите файл `README.md`
3. Проверьте, что бот работает (отправьте ему сообщение в Telegram)
4. Убедитесь, что VS Code обновлен до последней версии

---

**Удачи с публикацией! 🚀**
