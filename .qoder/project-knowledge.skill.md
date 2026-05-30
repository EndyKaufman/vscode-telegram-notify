# VS Code Telegram Notify Extension - Project Knowledge

## 📋 Project Overview

**Name:** vscode-telegram-notify  
**Version:** 0.1.5  
**Type:** VS Code Extension  
**Language:** TypeScript  
**Build Tool:** esbuild  
**Package Manager:** npm  

**Purpose:** Forward VS Code/Qoder notifications to Telegram with interactive button support and bidirectional sync.

## 🏗️ Architecture

### Core Modules (13 files in src/)

```
extension.ts (184 lines)
├── Entry point, activates all services
├── Initializes: Logger, ConfigManager, ProxyManager, MessageFormatter
├── Creates: TelegramBotService, NotificationInterceptor, CommandManager
├── Sets up: TestCommands, QoderIntegration, QoderTestCommands
└── Lifecycle: activate(), deactivate()

configManager.ts (163 lines)
├── Manages VS Code settings (telegramNotify.*)
├── 13 configuration fields including proxy
├── Secure storage: VS Code secrets API with fallback
├── Validation: validateConfig() checks all settings
└── Events: onDidChangeConfiguration()

telegramBot.ts (223 lines)
├── Wraps node-telegram-bot-api
├── initialize() - connects with optional proxy
├── sendMessage() - formats and sends messages
├── handleCallbackQuery() - delegates to ButtonHandler
└── shutdown() - cleanup polling and handlers

buttonHandler.ts (180 lines)
├── UUID-based button callback mapping
├── createInlineKeyboard() - creates Telegram inline keyboards
├── handleCallbackQuery() - executes VS Code commands
├── cleanupExpiredMappings() - interval-based cleanup (60s)
└── Timeout: configurable (default 300s)

messageFormatter.ts (173 lines)
├── formatNotification() - converts to Telegram Markdown
├── Adds: IDE name, project name, source, time
├── escapeMarkdown() - escapes Telegram special chars
├── truncateMessage() - respects 4096 char limit
└── Severity emojis: 🚨 Error, ⚠️ Warning, ℹ️ Info

notificationInterceptor.ts (107 lines)
├── forwardNotification() - main sending logic
├── Filters: severity, source exclusion
├── Counter: tracks total notifications sent
⚠️  Note: VS Code doesn't allow direct notification interception

proxyManager.ts (273 lines)
├── Supports: HTTP, HTTPS, SOCKS4, SOCKS5
├── proxyUrl parsing: protocol://user:pass@host:port
├── createProxyAgent() - returns https.Agent
├── testProxyConnection() - validates proxy works
└── Security: masks credentials in logs

qoderIntegration.ts (594 lines)
├── File watchers for .qoder/**/*.json,log
├── watchQoderSidebar() - monitors sidebar notifications
├── processQoderFile() - parses and forwards
├── 5 notification types: prompt, response, task, error, progress
└── Manual commands + automatic detection

commands.ts (415 lines)
├── registerCommands() - all VS Code commands
├── handleSetup() - interactive bot setup wizard
├── handleShowStats() - table-formatted statistics
├── configureProxy() - proxy URL input
├── handleCopyStats() - clipboard integration
└── Status bar integration

testCommands.ts (~500 lines)
├── 13 test scenarios for notifications
├── Tests: simple, buttons, long messages, special chars
├── Tests: batch, sequential, timeout, markdown
└── All registered as VS Code commands

qoderTestCommands.ts (159 lines)
├── 6 Qoder-specific test scenarios
├── Tests: prompt, agent task, completion, error, progress
└── Sequential Qoder notifications

types.ts (17 lines)
├── MessageType enum: Error=1, Warning=2, Information=3
└── ExtendedMessageItem - adds command property

logger.ts (57 lines)
├── Wraps VS Code OutputChannel
├── Methods: info(), warn(), error(), debug()
└── Timestamps in ISO format
```

## ⚙️ Configuration Schema

### Settings (telegramNotify.*)

```json
{
  "telegramNotify.botToken": "string - Telegram Bot Token",
  "telegramNotify.chatId": "string - Telegram Chat ID",
  "telegramNotify.enabled": "boolean - Enable/disable (default: false)",
  "telegramNotify.filterSeverity": "array - ['error', 'warning', 'info']",
  "telegramNotify.excludeSources": "array - Exclude by source name",
  "telegramNotify.buttonTimeout": "number - Button lifetime in seconds (default: 300)",
  "telegramNotify.maxMessageLength": "number - Max message length (default: 4000)",
  
  "telegramNotify.proxyEnabled": "boolean - Enable proxy",
  "telegramNotify.proxyUrl": "string - Full proxy URL (priority over individual fields)",
  "telegramNotify.proxyHost": "string - Proxy hostname",
  "telegramNotify.proxyPort": "number - Proxy port (default: 1080)",
  "telegramNotify.proxyProtocol": "enum - http|https|socks4|socks5",
  "telegramNotify.proxyUsername": "string - Proxy auth username",
  "telegramNotify.proxyPassword": "string - Proxy auth password"
}
```

## 🎯 Commands (28 total)

### Core Commands (4)
- `telegram-notify.setup` - Setup Bot wizard
- `telegram-notify.test` - Send test notification
- `telegram-notify.toggle` - Enable/disable
- `telegram-notify.showStats` - Show statistics (table format)
- `telegram-notify.copyStats` - Copy stats to clipboard

### Test Commands (13)
- `telegram-notify.test.simpleInfo`
- `telegram-notify.test.simpleWarning`
- `telegram-notify.test.simpleError`
- `telegram-notify.test.errorWithButtons`
- `telegram-notify.test.warningWithMultipleButtons`
- `telegram-notify.test.longMessage`
- `telegram-notify.test.specialCharacters`
- `telegram-notify.test.multilineMessage`
- `telegram-notify.test.batchNotifications`
- `telegram-notify.test.sequentialNotifications`
- `telegram-notify.test.buttonTimeout`
- `telegram-notify.test.allButtonTypes`
- `telegram-notify.test.markdownFormatting`

### Qoder Commands (4 manual)
- `telegram-notify.qoder.forwardPrompt`
- `telegram-notify.qoder.forwardAgentTask`
- `telegram-notify.qoder.forwardCompletion`
- `telegram-notify.qoder.customMessage`

### Qoder Test Commands (6)
- `telegram-notify.test.qoderPrompt`
- `telegram-notify.test.qoderAgentTask`
- `telegram-notify.test.qoderCompletion`
- `telegram-notify.test.qoderError`
- `telegram-notify.test.qoderProgress`
- `telegram-notify.test.qoderSequential`

## 🔧 Development Commands

```bash
# Build (production)
npm run build
# → esbuild bundles to dist/extension.js (1.2MB minified)

# Watch (development)
npm run watch
# → Auto-rebuilds on file changes

# Type check
npm run compile
# → tsc --noEmit (no output files)

# Lint
npm run lint
# → eslint src --ext ts

# Package for distribution
npx vsce package
# → Creates .vsix file

# Publish to marketplace
npx vsce publish
# → Requires VS Code Marketplace token
```

## 📦 Dependencies

### Production (4)
- `node-telegram-bot-api` ^0.64.0 - Telegram Bot API wrapper
- `uuid` ^9.0.0 - UUID generation for button callbacks
- `https-proxy-agent` ^7.0.0 - HTTP/HTTPS proxy support
- `socks-proxy-agent` ^8.0.0 - SOCKS4/5 proxy support

### Development (9)
- `@types/vscode` ^1.106.0 - VS Code API types
- `@types/node` ^20.0.0 - Node.js types
- `@types/node-telegram-bot-api` ^0.64.0
- `@types/uuid` ^9.0.0
- `@vscode/vsce` ^2.24.0 - VS Code Extension CLI
- `typescript` ^5.3.0
- `esbuild` ^0.20.0 - Bundler
- `eslint` ^8.56.0
- `@typescript-eslint/*` ^7.0.0

## 🚀 Key Patterns & Workflows

### 1. Notification Flow
```
User Action
  → notificationInterceptor.forwardNotification()
    → config checks (enabled, severity, source)
    → telegramBot.sendMessage()
      → messageFormatter.formatNotification()
      → buttonHandler.createInlineKeyboard() (if buttons)
      → Telegram API
```

### 2. Button Callback Flow
```
User clicks button in Telegram
  → Telegram sends callback_query
    → telegramBot.handleCallbackQuery()
      → buttonHandler.handleCallbackQuery()
        → lookup callbackId in Map
        → vscode.commands.executeCommand()
        → send confirmation back to Telegram
        → delete mapping (one-time use)
```

### 3. Proxy Configuration
```
Setup Wizard
  → configureProxy() in commands.ts
    → prompt for proxyUrl
    → validate URL format
    → store in config
      → proxyManager.getProxyConfig()
        → parseProxyUrl() OR individual settings
        → createProxyAgent()
          → HttpsProxyAgent or SocksProxyAgent
```

### 4. Qoder Sidebar Monitoring
```
Qoder creates/updates file
  → file watcher triggers
    → processQoderFile()
      → read file content
      → parse JSON (or treat as text)
      → forwardQoderItem()
        → classify by type (prompt/error/etc)
        → forwardNotification()
```

## ⚠️ Known Limitations

1. **No Direct Notification Interception**
   - VS Code doesn't provide API to intercept all notifications
   - Workaround: manual commands + Qoder file watchers

2. **Button Expiry**
   - Buttons expire after timeout (default 300s)
   - Cleanup runs every 60s
   - Expired buttons show "This button has expired"

3. **Message Length**
   - Telegram limit: 4096 characters
   - Extension limit: 4000 (configurable)
   - Truncated messages show "[Message truncated...]"

4. **Secret Storage**
   - Newer VS Code: uses secrets API (secure)
   - Older VS Code: falls back to settings (less secure)
   - botToken stored with fallback mechanism

## 🔍 File Locations

```
Source:     src/*.ts (13 files)
Build:      dist/extension.js (bundled)
Package:    package.json
Config:     tsconfig.json, .vscodeignore
Docs:       README.md, *.md (8 docs)
Examples:   examples/
Output:     *.vsix (5 versions)
```

## 🎨 Code Style

- **Strict TypeScript** - strict mode enabled
- **ES2020 target** - modern JavaScript
- **CommonJS modules** - VS Code requirement
- **No implicit any** - type-safe
- **Logger injection** - dependency injection pattern
- **Disposable pattern** - proper cleanup

## 📝 Common Tasks

### Add New Command
1. Register in `commands.ts` → `registerCommands()`
2. Add handler method `handleXxx()`
3. Add to `package.json` → `contributes.commands`
4. Rebuild: `npm run build`

### Add New Config Field
1. Add to `package.json` → `configuration.properties`
2. Add to `TelegramNotifyConfig` interface in `configManager.ts`
3. Add to `getConfig()` method
4. Rebuild

### Add New Test
1. Create method in `testCommands.ts` or `qoderTestCommands.ts`
2. Register in `registerAll()`
3. Call `notificationInterceptor.forwardNotification()`
4. Rebuild

### Modify Message Format
1. Edit `messageFormatter.ts` → `formatNotification()`
2. Adjust `escapeMarkdown()` if needed
3. Update emoji mappings
4. Rebuild

## 🐛 Debugging Tips

1. **Check Output Panel**
   - `Ctrl+Shift+U` → Select "Telegram Notify"
   - All logs appear here

2. **Enable Debug Logs**
   - Look for `logger.debug()` calls
   - Check button mappings, proxy config, etc.

3. **Test Proxy**
   - Use `proxyManager.testProxyConnection()`
   - Check masked URL in logs

4. **Button Issues**
   - Check `buttonMappings.size` in stats
   - Verify timeout settings
   - Check callback UUID format

## 📊 Statistics Format

Shows 3 tables:
1. **STATUS & INFO** - enabled, connected, IDE, project
2. **NOTIFICATION STATS** - sent count, active buttons
3. **CONFIGURATION** - chat ID, token status, proxy

Access: `Show Statistics` → `Copy Stats` or `View in Output`
