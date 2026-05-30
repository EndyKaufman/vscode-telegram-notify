# Qoder Sidebar Notifications

## 🆕 Что добавлено

Теперь расширение автоматически отслеживает уведомления и промпты из **сайдбара Qoder** и пересылает их в Telegram!

## 📡 Как это работает

### Автоматический мониторинг

Расширение следит за файлами в директориях:
- `.qoder/**/*.json`
- `.qoder/**/*.log`
- `.qoder/**/notifications*`
- `.qoder/**/prompts*`
- `.qoder/**/chat*`
- `.qoder/**/messages*`

### Что отслеживается

✅ **Промпты** - когда вы отправляете запрос в Qoder  
✅ **Ответы** - когда Qoder отвечает  
✅ **Задачи** - когда Qoder выполняет действия  
✅ **Ошибки** - когда возникают проблемы  
✅ **Прогресс** - статус выполнения задач  
✅ **Чат сообщения** - все сообщения из сайдбара

## 📨 Примеры уведомлений

### Промпт
```
💬 Qoder Sidebar prompt

*IDE:* Qoder
*Project:* my-project

*Source:* Qoder Sidebar
*Time:* 14:30:00

Refactor the authentication module to use JWT tokens
```

### Ответ
```
🤖 Qoder Sidebar response

*IDE:* Qoder
*Project:* my-project

*Source:* Qoder Sidebar
*Time:* 14:30:15

I'll help you refactor the authentication module...
```

### Ошибка
```
🚨 Qoder Sidebar error

*IDE:* Qoder
*Project:* my-project

*Source:* Qoder Sidebar
*Time:* 14:30:20

Failed to parse configuration file
```

## 🔧 Интерактивные кнопки

Каждое уведомление из сайдбара Qoder имеет кнопки:

- 📂 **Open File** - открыть файл с данными
- ℹ️ **Details** - показать детали в Output

## 📁 Где хранятся данные Qoder

Qoder хранит данные в:
```
.your-project/
└── .qoder/
    ├── notifications.json
    ├── prompts.json
    ├── chat.json
    └── messages.json
```

## ⚙️ Настройки

Сайдбар мониторинг включен **по умолчанию** когда:
1. Расширение активировано
2. Открыт проект с папкой `.qoder`
3. Qoder extension установлен

## 🎯 Ручные команды

Вы также можете вручную отправить уведомления:

- `Telegram Notify: [TEST] Qoder Prompt` - тест промпта
- `Telegram Notify: [TEST] Qoder Response` - тест ответа
- `Telegram Notify: [TEST] Qoder Task` - тест задачи
- `Telegram Notify: [TEST] Qoder Error` - тест ошибки
- `Telegram Notify: [TEST] Qoder Progress` - тест прогресса
- `Telegram Notify: [TEST] Qoder Sequential` - серия тестов

## 🔍 Логирование

Все действия логируются в Output канал:
1. `Ctrl+Shift+U` - открыть Output
2. Выберите `Telegram Notify`
3. Ищите сообщения `Qoder sidebar file created/changed`

## ⚡ Производительность

- File watchers используют VS Code API (эффективно)
- Обрабатываются только последние 5 элементов в файле
- Максимальный размер сообщения: 2000 символов
- Автоматическая очистка старых watchers

## 🐛 Troubleshooting

### Не приходят уведомления из сайдбара

1. Проверьте что `.qoder` директория существует
2. Убедитесь что файлы имеют правильные имена
3. Проверьте логи в Output
4. Перезапустите расширение

### Слишком много уведомлений

Можно отключить Qoder integration в настройках:
```json
"telegramNotify.qoderIntegrationEnabled": false
```

## 🚀 Готово!

Теперь все уведомления из сайдбара Qoder автоматически приходят в Telegram! 🎉
