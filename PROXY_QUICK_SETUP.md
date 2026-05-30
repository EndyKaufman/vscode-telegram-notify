# Настройка прокси - одна строка

## 🚀 Быстрая настройка прокси

Теперь вы можете настроить прокси **одной строкой**!

### Во время установки

При выполнении `Telegram Notify: Setup Bot`:

1. Введите токен и Chat ID
2. На вопросе о прокси выберите: **Yes, configure proxy**
3. Введите прокси URL в формате:

```
protocol://[username:password@]host:port
```

### Примеры URL

#### SOCKS5 без пароля:
```
socks5://proxy.example.com:1080
```

#### SOCKS5 с паролем:
```
socks5://username:password@proxy.example.com:1080
```

#### HTTP прокси:
```
http://proxy.company.com:3128
```

#### HTTPS прокси с паролем:
```
https://user:pass@secure-proxy.com:443
```

#### SOCKS4:
```
socks4://192.168.1.100:1080
```

### Через настройки

Или настройте через VS Code Settings (`Ctrl+,`):

1. Найдите `telegramNotify.proxyUrl`
2. Введите URL: `socks5://user:pass@proxy.com:1080`
3. Убедитесь что `telegramNotify.proxyEnabled` = `true`

## ✅ Проверка

После настройки:
1. Выполните: `Telegram Notify: Send Test Notification`
2. Если сообщение пришло - прокси работает!

## 🔍 Формат URL

```
протокол://[логин:пароль@]хост:порт
  ↓         ↓        ↓      ↓
socks5://  user:pass@proxy.com:1080
```

**Поддерживаемые протоколы:**
- `socks5` (рекомендуется)
- `socks4`
- `https`
- `http`

## 💡 Примеры использования

### Пример 1: Простой SOCKS5
```
socks5://127.0.0.1:1080
```

### Пример 2: Корпоративный прокси с авторизацией
```
socks5://ivan:MyP@ssw0rd@proxy.company.com:1080
```

### Пример 3: HTTP прокси
```
http://proxy.example.com:8080
```

### Пример 4: Специальные символы в пароле
```
socks5://user:p%40ss%23word@proxy.com:1080
```

Для специальных символов используйте URL encoding:
- `@` → `%40`
- `#` → `%23`
- `:` → `%3A`
- `/` → `%2F`

## 🎉 Готово!

Теперь прокси настраивается **одной строкой** вместо 6 шагов!
