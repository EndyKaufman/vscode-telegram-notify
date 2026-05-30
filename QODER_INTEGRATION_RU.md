# Qoder Integration - Интеграция с Qoder IDE

## 📋 Описание

Модуль интеграции с Qoder позволяет пересылать уведомления и промпты из агентского чата Qoder в Telegram.

## 🎯 Возможности

### 1. Пересылка промптов
- Ручная отправка промптов в Telegram
- Кнопки для запуска агента
- Отслеживание истории промптов

### 2. Агентские задачи
- Пересылка задач агента (Build, Test, Deploy, и т.д.)
- Мониторинг выполнения
- Кнопки управления (Execute, Monitor, Pause)

### 3. Уведомления о завершении
- Успешное завершение
- Ошибки выполнения
- Предупреждения
- Кнопки действий (Retry, View Logs, Debug)

### 4. Произвольные сообщения
- Ручная отправка любых сообщений
- Выбор типа (Error, Warning, Information)
- Настраиваемое содержимое

## 🚀 Использование

### Команды в Command Palette

Все команды доступны через `Ctrl+Shift+P` с префиксом `[Qoder]`:

#### 1. `[Qoder] Forward Prompt`
**Команда:** `telegram-notify.qoder.forwardPrompt`

**Описание:** Отправить промпт Qoder в Telegram

**Использование:**
1. Выполните команду
2. Введите текст промпта
3. Промпт отправится в Telegram с кнопками:
   - ▶️ Start Agent - запустить агента
   - ❌ Cancel - отменить

**Пример:**
```
💬 Qoder Prompt:

Refactor the authentication module to use JWT tokens
```

---

#### 2. `[Qoder] Forward Agent Task`
**Команда:** `telegram-notify.qoder.forwardAgentTask`

**Описание:** Отправить задачу агента в Telegram

**Использование:**
1. Выполните команду
2. Выберите тип задачи:
   - 🔨 Build Task
   - 🧪 Test Task
   - 🚀 Deploy Task
   - 📦 Package Task
   - 🔍 Analysis Task
   - ✨ Custom Task
3. Введите описание задачи
4. Задача отправится в Telegram с кнопками:
   - ▶️ Execute - выполнить
   - 📊 Monitor - мониторить
   - ⏸️ Pause - приостановить

**Пример:**
```
🤖 Qoder Agent Task

Type: 🔨 Build Task
Description: Build the project with optimizations
Status: Queued
```

---

#### 3. `[Qoder] Forward Completion`
**Команда:** `telegram-notify.qoder.forwardCompletion`

**Описание:** Отправить уведомление о завершении задачи

**Использование:**
1. Выполните команду
2. Выберите статус:
   - ✅ Success
   - ❌ Failed
   - ⚠️ Warning
3. Введите краткое резюме
4. Уведомление отправится в Telegram

**Пример для успеха:**
```
✅ Qoder Task Completed

Status: ✅ Success
Summary: All tests passed successfully
Time: 2026-05-29 14:30:00
```

**Пример для ошибки:**
```
❌ Qoder Task Completed

Status: ❌ Failed
Summary: Build failed with 3 errors
Time: 2026-05-29 14:35:00
```

Кнопки для ошибок:
- 🔁 Retry - повторить
- 📋 View Logs - посмотреть логи
- 🐛 Debug - отладка

---

#### 4. `[Qoder] Custom Message`
**Команда:** `telegram-notify.qoder.customMessage`

**Описание:** Отправить произвольное сообщение

**Использование:**
1. Выполните команду
2. Выберите тип сообщения:
   - 🚨 Error
   - ⚠️ Warning
   - ℹ️ Information
3. Введите текст сообщения
4. Сообщение отправится в Telegram

**Пример:**
```
📢 Custom Qoder Message

Code review completed. Please check the pull request.
```

---

## 💻 Программное использование

### Из других расширений или скриптов

```typescript
// Импортировать QoderIntegration
import { QoderIntegration } from './qoderIntegration';

// Отправить промпт
await QoderIntegration.forwardQoderNotification(
  'Refactor authentication module',
  'prompt'
);

// Отправить ответ агента
await QoderIntegration.forwardQoderNotification(
  'I will analyze the authentication flow and suggest improvements',
  'response',
  'Estimated time: 5 minutes'
);

// Отправить задачу
await QoderIntegration.forwardQoderNotification(
  'Running unit tests...',
  'task',
  'Test suite: authentication (42 tests)'
);

// Отправить ошибку
await QoderIntegration.forwardQoderNotification(
  'Compilation failed: Cannot find module',
  'error',
  'File: auth.ts, Line: 42'
);

// Отправить прогресс
await QoderIntegration.forwardQoderNotification(
  'Processing... 65% complete',
  'progress',
  'ETA: 2 minutes'
);
```

### Типы уведомлений

| Тип | Эмодзи | Severity | Использование |
|-----|--------|----------|---------------|
| `prompt` | 💬 | Information | Промпты пользователя |
| `response` | 🤖 | Information | Ответы агента |
| `task` | 🔨 | Warning | Задачи в процессе |
| `error` | 🚨 | Error | Ошибки |
| `progress` | ⏳ | Information | Прогресс выполнения |

---

## 🔍 Автоматическое отслеживание

### Терминалы Qoder
Расширение автоматически обнаруживает терминалы Qoder:
- Qoder Agent Terminal
- Qoder Quest Terminal
- Qoder Build Terminal

При открытии такого терминала отправляется уведомление:
```
🤖 Qoder Terminal Opened: Qoder Agent
```

### Файлы Qoder
Отслеживается создание файлов в директории `.qoder/`:
- Новые промпты
- Конфигурации
- Результаты

При создании файла промпта:
```
📝 New Qoder prompt file created: /project/.qoder/prompts/refactor-auth.yaml
```

---

## 📊 Примеры использования

### Пример 1: Отслеживание работы агента

```bash
# 1. Запуск задачи
[Qoder] Forward Agent Task
Type: 🔨 Build Task
Description: Build production bundle

# В Telegram придет:
🤖 Qoder Agent Task
Type: 🔨 Build Task
Description: Build production bundle
Status: Queued

# 2. Кнопка "▶️ Execute" запускает задачу

# 3. По завершении
[Qoder] Forward Completion
Status: ✅ Success
Summary: Build completed in 45s, output: 2.3MB

# В Telegram придет:
✅ Qoder Task Completed
Status: ✅ Success
Summary: Build completed in 45s, output: 2.3MB
Time: 2026-05-29 15:00:00
```

---

### Пример 2: Мониторинг ошибок

```bash
# При возникновении ошибки
[Qoder] Custom Message
Type: 🚨 Error
Message: Agent failed to complete the task. Timeout after 300s.

# В Telegram придет:
📢 Custom Qoder Message

Agent failed to complete the task. Timeout after 300s.
```

---

### Пример 3: Интерактивная работа с агентом

```bash
# 1. Отправить промпт
[Qoder] Forward Prompt
Prompt: Optimize database queries in user module

# В Telegram:
💬 Qoder Prompt:

Optimize database queries in user module

[▶️ Start Agent] [❌ Cancel]

# 2. Кликнуть "▶️ Start Agent"
# Выполнится команда: qoder.agent.start

# 3. Агент работает...

# 4. Отправить результат
[Qoder] Forward Completion
Status: ✅ Success
Summary: Optimized 12 queries, improved performance by 40%

# В Telegram:
✅ Qoder Task Completed
Status: ✅ Success
Summary: Optimized 12 queries, improved performance by 40%

[📊 View Results] [🎉 Celebrate!]
```

---

## 🔧 Настройка

### Автоматическое отслеживание

Модуль автоматически:
1. ✅ Следит за терминалами Qoder
2. ✅ Мониторит файлы в `.qoder/`
3. ✅ Отслеживает output channels

### Ручное управление

Все уведомления можно отправлять вручную через команды в Command Palette.

---

## 📝 Интеграция с Qoder Quest

Qoder Quest - это функция автоматического выполнения задач.

### Отслеживание Quest задач

```typescript
// При запуске Quest
await QoderIntegration.forwardQoderNotification(
  'Quest started: Refactor authentication system',
  'task',
  'Steps: 5 | Estimated time: 15 minutes'
);

// При завершении шага
await QoderIntegration.forwardQoderNotification(
  'Step 2/5 completed: Updated database schema',
  'progress',
  'Progress: 40%'
);

// При завершении Quest
await QoderIntegration.forwardQoderNotification(
  'Quest completed successfully!',
  'response',
  'All 5 steps completed'
);
```

---

## 🎯 Практические сценарии

### Сценарий 1: Удаленный мониторинг разработки

**Задача:** Следить за работой Qoder удаленно

**Решение:**
1. Запустить задачу в Qoder
2. Получить уведомление в Telegram
3. Нажать "Monitor" для проверки статуса
4. Получить отчет о завершении

---

### Сценарий 2: Командная работа

**Задача:** Уведомлять команду о завершении задач

**Решение:**
1. Настроить групповой чат в Telegram
2. Пересылать completion уведомления
3. Команда видит прогресс в реальном времени

---

### Сценарий 3: CI/CD интеграция

**Задача:** Мониторить сборку и деплой

**Решение:**
1. Запустить Build Task через Qoder
2. Получить уведомление о старте
3. Получить уведомление о результате
4. Кнопки для Retry или View Logs

---

## 🐛 Устранение проблем

### Уведомления не приходят

**Проверьте:**
1. Бот настроен и подключен
2. Telegram Notify включен
3. Проверьте Output → Telegram Notify

### Кнопки не работают

**Проверьте:**
1. VS Code запущен
2. Команды Qoder зарегистрированы
3. Timeout кнопок не истек

### Терминалы не обнаруживаются

**Проверьте:**
1. Имя терминала содержит "qoder", "agent" или "quest"
2. Output логи для деталей

---

## 💡 Советы

1. **Используйте прогресс уведомления** - отправляйте обновления статуса
2. **Добавляйте кнопки** - делайте уведомления интерактивными
3. **Логируйте ошибки** - всегда отправляйте детали ошибок
4. **Группируйте сообщения** - используйте sequential notifications
5. **Настройте групповой чат** - для командной работы

---

## 📚 API Reference

### QoderIntegration.forwardQoderNotification

```typescript
static async forwardQoderNotification(
  message: string,
  type: 'prompt' | 'response' | 'task' | 'error' | 'progress',
  details?: string
): Promise<void>
```

**Параметры:**
- `message` - основной текст сообщения
- `type` - тип уведомления
- `details` - дополнительные детали (опционально)

**Пример:**
```typescript
QoderIntegration.forwardQoderNotification(
  'Build completed',
  'response',
  'Time: 45s | Size: 2.3MB'
);
```

---

## 🎉 Готово!

Теперь вы можете:
- ✅ Пересылать промпты Qoder в Telegram
- ✅ Отправлять задачи агента
- ✅ Получать уведомления о завершении
- ✅ Управлять задачами из Telegram
- ✅ Мониторить прогресс удаленно

**Удачи с разработкой! 🚀**
