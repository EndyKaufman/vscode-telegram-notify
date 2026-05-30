# Telegram Notify - Тестовые команды

## 📋 Доступные тестовые команды

После установки расширения в Command Palette (`Ctrl+Shift+P`) появятся следующие тестовые команды:

### 1. Простые уведомления

#### `[TEST] Simple Info`
- **Команда:** `telegram-notify.test.simpleInfo`
- **Описание:** Простое информационное уведомление
- **Тип:** Information
- **Кнопки:** Нет

#### `[TEST] Simple Warning`
- **Команда:** `telegram-notify.test.simpleWarning`
- **Описание:** Простое предупреждение
- **Тип:** Warning
- **Кнопки:** Нет

#### `[TEST] Simple Error`
- **Команда:** `telegram-notify.test.simpleError`
- **Описание:** Простая ошибка
- **Тип:** Error
- **Кнопки:** Нет

---

### 2. Уведомления с кнопками

#### `[TEST] Error with Buttons`
- **Команда:** `telegram-notify.test.errorWithButtons`
- **Описание:** Ошибка сборки с кнопками действий
- **Тип:** Error
- **Кнопки:**
  - 🔨 Rebuild - перезапустить сборку
  - 📋 Show Errors - показать ошибки
  - ❌ Dismiss - закрыть

#### `[TEST] Warning with Multiple Buttons`
- **Команда:** `telegram-notify.test.warningWithMultipleButtons`
- **Описание:** Предупреждение с несколькими кнопками
- **Тип:** Warning
- **Кнопки:**
  - 🔍 View Details - посмотреть детали
  - 🔧 Fix Issue - исправить проблему
  - 📖 Documentation - открыть документацию
  - ⏰ Remind Later - напомнить позже

---

### 3. Форматирование сообщений

#### `[TEST] Long Message`
- **Команда:** `telegram-notify.test.longMessage`
- **Описание:** Очень длинное сообщение для проверки обрезки
- **Тип:** Error
- **Кнопки:**
  - 📊 View Full Log
  - 🔍 Search Errors
- **Цель теста:** Проверить, как расширение обрабатывает длинные сообщения

#### `[TEST] Special Characters`
- **Команда:** `telegram-notify.test.specialCharacters`
- **Описание:** Сообщение со специальными символами Markdown
- **Тип:** Information
- **Содержит:**
  - Жирный текст, курсив, зачеркнутый текст
  - Код в строках
  - Списки
  - Математические символы
  - Специальные символы Markdown
- **Цель теста:** Проверить экранирование специальных символов

#### `[TEST] Multiline Message`
- **Команда:** `telegram-notify.test.multilineMessage`
- **Описание:** Многострочное сообщение с ASCII артом
- **Тип:** Information
- **Кнопки:**
  - 📊 Dashboard
  - 📝 Release Notes
- **Цель теста:** Проверить форматирование многострочных сообщений

#### `[TEST] Markdown Formatting`
- **Команда:** `telegram-notify.test.markdownFormatting`
- **Описание:** Полноценное Markdown сообщение
- **Тип:** Information
- **Содержит:**
  - Заголовки разных уровней
  - Жирный/курсив текст
  - Код в строках и блоках
  - Упорядоченные и неупорядоченные списки
  - Таблицы
  - Цитаты
  - Ссылки
- **Кнопки:**
  - 📖 View Docs
  - 🧪 Run Tests
- **Цель теста:** Проверить полное форматирование Markdown

---

### 4. Последовательные уведомления

#### `[TEST] Batch Notifications`
- **Команда:** `telegram-notify.test.batchNotifications`
- **Описание:** Отправляет 5 уведомлений подряд с задержкой 500ms
- **Типы:** Information и Warning
- **Цель теста:** Проверить обработку нескольких уведомлений

#### `[TEST] Sequential Notifications`
- **Команда:** `telegram-notify.test.sequentialNotifications`
- **Описание:** Имитирует процесс деплоя с шагами
- **Последовательность:**
  1. 🚀 Starting deployment...
  2. 📦 Packaging application...
  3. 🔍 Running pre-deployment checks...
  4. ✅ Deployment completed! (с кнопками)
- **Задержка:** 1 секунда между уведомлениями
- **Кнопки (в последнем):**
  - 🌐 Open App
  - 📊 View Metrics
  - 📋 View Logs
- **Цель теста:** Проверить последовательную отправку

---

### 5. Тестирование кнопок

#### `[TEST] Button Timeout`
- **Команда:** `telegram-notify.test.buttonTimeout`
- **Описание:** Тест времени жизни кнопок
- **Тип:** Warning
- **Кнопки:**
  - ✅ I clicked in time!
  - ⏰ Too slow
- **Цель теста:** Проверить работу кнопок до истечения timeout

#### `[TEST] All Button Types`
- **Команда:** `telegram-notify.test.allButtonTypes`
- **Описание:** Все типы кнопок в одном уведомлении
- **Тип:** Information
- **Кнопки (8 штук):**
  1. 🔨 Execute Command - выполнить команду VS Code
  2. 🌐 Open URL - открыть URL
  3. 📁 Open File - открыть файл
  4. 💾 Save All - сохранить все файлы
  5. 🎨 Change Theme - изменить тему
  6. ⚙️ Open Settings - открыть настройки
  7. 📊 Show Output - показать Output
  8. ❌ Just Acknowledge - без команды
- **Цель теста:** Проверить разные типы команд кнопок

---

## 🧪 Как тестировать

### Быстрый старт

1. **Запустите VS Code с расширением:**
   ```bash
   cd /home/endy/Projects/vscode-telegram-notify
   # Нажмите F5 для запуска в режиме разработки
   ```

2. **Настройте бота:**
   - `Ctrl+Shift+P`
   - `Telegram Notify: Setup Bot`
   - Введите токен и Chat ID

3. **Запустите тесты:**
   - `Ctrl+Shift+P`
   - Начните вводить `[TEST]`
   - Выберите нужный тест

### Рекомендуемая последовательность тестирования

#### Этап 1: Базовые тесты
```
1. [TEST] Simple Info          - Проверить базовую отправку
2. [TEST] Simple Warning       - Проверить предупреждения
3. [TEST] Simple Error         - Проверить ошибки
```

#### Этап 2: Тесты с кнопками
```
4. [TEST] Error with Buttons   - Проверить кнопки
5. [TEST] All Button Types     - Проверить все типы кнопок
6. Кликните по кнопкам в Telegram - Проверить синхронизацию
```

#### Этап 3: Форматирование
```
7. [TEST] Long Message         - Проверить длинные сообщения
8. [TEST] Special Characters   - Проверить спецсимволы
9. [TEST] Markdown Formatting  - Проверить Markdown
```

#### Этап 4: Последовательные уведомления
```
10. [TEST] Batch Notifications     - Проверить серию уведомлений
11. [TEST] Sequential Notifications - Проверить пошаговый процесс
```

#### Этап 5: Продвинутые тесты
```
12. [TEST] Button Timeout    - Проверить время жизни кнопок
13. [TEST] Warning with Multiple Buttons - Множество кнопок
14. [TEST] Multiline Message - Многострочные сообщения
```

---

## ✅ Что проверять в каждом тесте

### В Telegram:
- [ ] Сообщение пришло
- [ ] Форматирование правильное
- [ ] Эмодзи отображаются
- [ ] Кнопки присутствуют
- [ ] Текст кнопок правильный
- [ ] Длинные сообщения обрезаны корректно
- [ ] Специальные символы экранированы

### При клике на кнопки:
- [ ] Кнопка кликается
- [ ] Команда выполняется в VS Code
- [ ] Приходит подтверждение в Telegram
- [ ] VS Code выполняет действие
- [ ] Истекшие кнопки показывают ошибку

### Общее:
- [ ] Несколько сообщений приходят по порядку
- [ ] Нет дублирования
- [ ] Статус бар обновляется
- [ ] Логи пишутся в Output

---

## 🔍 Примеры использования

### Пример 1: Тестирование кнопок

```bash
# 1. Запустить тест с кнопками
[TEST] Error with Buttons

# 2. В Telegram появятся 3 кнопки:
#    - 🔨 Rebuild
#    - 📋 Show Errors
#    - ❌ Dismiss

# 3. Кликнуть по "🔨 Rebuild"
#    Ожидание: VS Code перезапустит сборку

# 4. В Telegram придет:
#    "✅ Action Executed
#     Successfully triggered: 🔨 Rebuild"
```

### Пример 2: Тестирование длинных сообщений

```bash
# 1. Запустить тест
[TEST] Long Message

# 2. Проверить в Telegram:
#    - Сообщение обрезано до maxMessageLength
#    - В конце "[Message truncated...]"
#    - Кнопки работают
```

### Пример 3: Тестирование последовательных уведомлений

```bash
# 1. Запустить тест
[TEST] Sequential Notifications

# 2. В Telegram придут 4 сообщения с интервалом 1 сек:
#    🚀 Starting deployment process...
#    📦 Packaging application...
#    🔍 Running pre-deployment checks...
#    ✅ Deployment completed successfully! (с кнопками)

# 3. Проверить порядок и время прихода
```

---

## 🐛 Что искать (баги)

### Критические:
- ❌ Сообщения не приходят
- ❌ Кнопки не работают
- ❌ VS Code падает при клике
- ❌ Ошибки в консоли

### Средние:
- ⚠️ Форматирование сломано
- ⚠️ Специальные символы не экранированы
- ⚠️ Кнопки дублируются
- ⚠️ Сообщения приходят не по порядку

### Минорные:
- 💡 Эмодзи не отображаются
- 💡 Обрезка сообщения в неправильном месте
- 💡 Задержки между сообщениями

---

## 📊 Результаты тестирования

После тестирования запишите результаты:

### Тест пройден ✅
- Все кнопки работают
- Форматирование правильное
- Ошибок в логах нет

### Тест не пройден ❌
- Описание проблемы:
- Ожидаемый результат:
- Фактический результат:
- Логи (из Output → Telegram Notify):
- Скриншоты:

---

## 🛠️ Программное использование

Вы можете использовать эти команды в своем коде:

```typescript
// Отправить простое уведомление
await vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  'Your message here',
  3 // MessageType.Information
);

// С кнопками
await vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  'Error occurred!',
  1, // MessageType.Error
  [
    { title: 'Retry', command: { id: 'your.retryCommand' } },
    { title: 'Cancel' }
  ]
);
```

---

## 💡 Советы

1. **Начните с простых тестов** - проверьте базовую функциональность
2. **Проверьте логи** - Output → Telegram Notify покажет детали
3. **Тестируйте кнопки сразу** - пока они не истекли
4. **Проверьте разные клиенты Telegram** - мобильный, десктоп, веб
5. **Запишите результаты** - для последующего исправления багов

---

**Удачного тестирования! 🚀**
