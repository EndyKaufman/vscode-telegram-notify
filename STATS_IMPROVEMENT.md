# 📊 Улучшенная статистика

## Что изменилось

Теперь статистика отображается в **табличном формате** с гораздо большим количеством информации!

## 🎨 Новый формат

### В VS Code notification

При вызове команды `Telegram Notify: Show Statistics`:

```
📊 Statistics: 42 notifications sent
[📋 Copy Stats] [📄 View in Output]
```

### В Output панели

```
📊 Telegram Notify Statistics

┌─────────────────────────────────┐
│       🔹 STATUS & INFO          │
├─────────────────────────────────┤
│ Status:       ✅ Enabled        │
│ Connected:    ✅ Yes            │
│ Uptime:       Active            │
│ IDE:          Qoder             │
│ Project:      vscode-telegram-notify │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       🔹 NOTIFICATION STATS     │
├─────────────────────────────────┤
│ Total Sent:   42                │
│ Active Btns:  3                 │
│ Button Timeout: 300s            │
│ Max Length:   4000              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       🔹 CONFIGURATION          │
├─────────────────────────────────┤
│ Chat ID:      123456789         │
│ Bot Token:    ✅ Set            │
│ Severity:     error, warning, info │
│ Proxy:        ❌ Disabled       │
└─────────────────────────────────┘
```

### С прокси

```
┌─────────────────────────────────┐
│       🔹 CONFIGURATION          │
├─────────────────────────────────┤
│ Chat ID:      123456789         │
│ Bot Token:    ✅ Set            │
│ Severity:     error, warning    │
│ Proxy:        ✅ socks5://proxy │
└─────────────────────────────────┘
```

## 📋 Копирование в буфер обмена

### Способ 1: Через кнопку
1. Вызовите `Show Statistics`
2. Нажмите `📋 Copy Stats`
3. ✅ Статистика в буфере обмена!

### Способ 2: Через команду
1. `Ctrl+Shift+P`
2. `Telegram Notify: Copy Statistics`
3. ✅ Готово!

## 📄 Просмотр в Output

1. Вызовите `Show Statistics`
2. Нажмите `📄 View in Output`
3. Откроется Output панель с таблицей

Или:
1. `Ctrl+Shift+U` - открыть Output
2. Выберите `Telegram Notify`
3. Найдите последнюю статистику

## 🔍 Что показывает статистика

### 📌 STATUS & INFO
- **Status** - включено/выключено
- **Connected** - подключен ли бот к Telegram
- **Uptime** - время работы (пока просто "Active")
- **IDE** - название IDE (Qoder, VS Code, и т.д.)
- **Project** - имя текущего проекта

### 📌 NOTIFICATION STATS
- **Total Sent** - общее количество отправленных уведомлений
- **Active Btns** - количество активных кнопок в Telegram
- **Button Timeout** - время жизни кнопок (секунды)
- **Max Length** - максимальная длина сообщения

### 📌 CONFIGURATION
- **Chat ID** - ID чата Telegram
- **Bot Token** - установлен ли токен
- **Severity** - какие типы уведомлений отправляются
- **Proxy** - статус и URL прокси (если включен)

## 💡 Примеры использования

### Пример 1: Быстрая проверка
```bash
Ctrl+Shift+P → Telegram Notify: Show Statistics
```
Результат: Notification с количеством и кнопками

### Пример 2: Копирование для отчета
```bash
Ctrl+Shift+P → Telegram Notify: Copy Statistics
```
Результат: Текст в буфере обмена

### Пример 3: Детальный просмотр
```
Show Statistics → View in Output
```
Результат: Красивая таблица в Output

## 🎯 Преимущества

✅ **Табличный формат** - легко читать  
✅ **Больше информации** - IDE, проект, прокси  
✅ **Копирование** - одним кликом в буфер  
✅ **Output панель** - для детального просмотра  
✅ **Группировка** - 3 секции с рамками  
✅ **Эмодзи** - быстрая визуальная идентификация  

## 🔄 Старый vs Новый формат

### ❌ Было (старый формат):
```
📊 Telegram Notify Statistics

🔔 Notifications sent: 42
🔘 Active buttons: 3
✅ Status: Enabled
🤖 Connected: Yes
👤 Chat ID: 123456789
```

### ✅ Стало (новый формат):
```
┌─────────────────────────────────┐
│       🔹 STATUS & INFO          │
├─────────────────────────────────┤
│ Status:       ✅ Enabled        │
│ Connected:    ✅ Yes            │
│ IDE:          Qoder             │
│ Project:      my-project        │
└─────────────────────────────────┘
```

## 🚀 Готово!

Теперь статистика стала намного информативнее и красивее! 🎉
