# VS Code Telegram Notify Extension - Project Knowledge

## 📋 Project Overview

**Name:** vscode-telegram-notify  
**Version:** 0.1.8  
**Type:** VS Code Extension  
**Language:** TypeScript  
**Build Tool:** esbuild  
**Package Manager:** npm

**Purpose:** Forward VS Code/Qoder notifications to Telegram with interactive button support, bidirectional sync, and full VS Code API interception (showMessage, showInputBox, showQuickPick).

## 🏗️ Architecture

### Core Modules (14 files in src/)

```
extension.ts (184 lines)
├── Entry point, activates all services
├── Initializes: Logger, ConfigManager, ProxyManager, MessageFormatter
├── Creates: TelegramBotService, NotificationInterceptor, CommandManager
├── Sets up: TestCommands, QoderIntegration, QoderTestCommands
└── Lifecycle: activate(), deactivate()

configManager.ts (163 lines)
├── Manages VS Code settings (telegramNotify.*)
├── 14 configuration fields including proxy
├── Secure storage: VS Code secrets API with fallback
├── Validation: validateConfig() checks all settings + proxy validation
└── Events: onDidChangeConfiguration()

telegramBot.ts (379 lines)
├── Wraps node-telegram-bot-api with BotMutex for multi-instance support
├── initialize() - connects with optional proxy, acquires polling mutex
├── sendMessage() - formats and sends messages
├── sendMessageAndWaitForButton() - waits for button click (5min timeout)
├── sendPromptAndWaitForReply() - waits for text reply in Telegram
├── handleCallbackQuery() - delegates to ButtonHandler
├── handleMessage() - handles text replies for prompts
└── shutdown() - cleanup polling and releases mutex

botMutex.ts (141 lines)
├── File-based mutex for multi-instance polling coordination
├── Prevents "409 Conflict: terminated by other getUpdates request"
├── tryAcquire() - tries to acquire lock, handles stale locks (5min)
├── release() - removes lock file
├── Heartbeat: updates timestamp every 60s to prevent stale detection
└── Lock file: /tmp/vscode-telegram-bot.lock

buttonHandler.ts (212 lines)
├── UUID-based button callback mapping
├── createInlineKeyboard() - creates Telegram inline keyboards
├── createInlineKeyboardWithSelection() - adds onSelect callback for waiting
├── handleCallbackQuery() - executes VS Code commands
├── User authorization: targetUserId validation for private/group chats
├── cleanupExpiredMappings() - interval-based cleanup (60s)
└── Timeout: configurable (default 300s)

messageFormatter.ts (173 lines)
├── formatNotification() - converts to Telegram Markdown
├── Adds: IDE name, project name, source, time
├── escapeMarkdown() - escapes all Telegram special chars (15 chars)
├── truncateMessage() - respects 4096 char limit
└── Severity emojis: 🚨 Error, ⚠️ Warning, ℹ️ Info

notificationInterceptor.ts (399 lines)
├── VS Code API patching: showInformationMessage, showWarningMessage, showErrorMessage
├── VS Code API patching: showInputBox, showQuickPick
├── Bidirectional sync: VS Code ↔ Telegram
├── Promise.race() - returns first response (VS Code or Telegram)
├── forwardNotification() - main sending logic
├── Filters: severity, source exclusion
├── Counter: tracks total notifications sent
├── getTargetUserId() - extracts user ID from chat for authorization
└── dispose() - restores original VS Code API methods

proxyManager.ts (273 lines)
├── Supports: HTTP, HTTPS, SOCKS4, SOCKS5
├── proxyUrl parsing: protocol://user:pass@host:port
├── createProxyAgent() - returns https.Agent
├── testProxyConnection() - validates proxy works (10s timeout)
└── Security: masks credentials in logs

qoderIntegration.ts (1128 lines)
├── File watchers for .qoder/**/*.json,log, **.jsonl
├── Transcript parsing: ~/.qoder/projects/**/*.jsonl
├── watchQoderSidebar() - monitors sidebar notifications
├── processQoderTranscript() - parses JSONL, tracks seenIds, deduplicates
├── 5 notification types: prompt, response, task, error, progress
├── Session tracking: mode (agent/ask/plan/debug), session_type
├── Action card extraction: auto-detects recommendations from responses
├── Deeplinks: qoder://aicoding.aicoding-deeplink/chat|quest
├── Manual commands + automatic detection
└── BuildActionButtons: Open Chat, Open Quest, Copy

commands.ts (449 lines)
├── registerCommands() - all VS Code commands
├── handleSetup() - interactive bot setup wizard (6 steps)
├── handleShowStats() - table-formatted statistics (3 tables)
├── configureProxy() - proxy URL input with validation
├── handleCopyStats() - clipboard integration
├── Status bar Integration: Connected/Error/Disabled states
└── initializeBot() - with proxy config

testCommands.ts (559 lines)
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
  "telegramNotify.botToken": "string - Telegram Bot Token (stored in secrets)",
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

## 🎯 Commands (35 total)

### Core Commands (5)
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

### Qoder Manual Commands (4)
- `telegram-notify.qoder.forwardPrompt`
- `telegram-notify.qoder.forwardAgentTask`
- `telegram-notify.qoder.forwardCompletion`
- `telegram-notify.qoder.customMessage`

### Qoder Deeplink Commands (3)
- `telegram-notify.qoder.openChat` - Open Qoder chat with text
- `telegram-notify.qoder.openQuest` - Open Qoder quest with text
- `telegram-notify.qoder.copyToClipboard` - Copy text to clipboard

### Qoder Test Commands (6)
- `telegram-notify.test.qoderPrompt`
- `telegram-notify.test.qoderAgentTask`
- `telegram-notify.test.qoderCompletion`
- `telegram-notify.test.qoderError`
- `telegram-notify.test.qoderProgress`
- `telegram-notify.test.qoderSequential`

### Internal Commands (1)
- `telegram-notify.sendNotification` - Programmatic notification sending

## 🔧 Development Commands

```bash
# Build (production)
npm run build
# → esbuild bundles to dist/extension.js (minified)

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

### 1. Notification Flow (Direct)
```
User Action / Extension Event
  → notificationInterceptor.forwardNotification()
    → config checks (enabled, severity, source)
    → telegramBot.sendMessage()
      → messageFormatter.formatNotification()
      → buttonHandler.createInlineKeyboard() (if buttons)
      → Telegram API
```

### 2. Notification Flow (Intercepted)
```
VS Code showInformationMessage() called
  → Patched method intercepts
    → Extracts buttons from args
    → Calls original VS Code method
    → Parallel: forwards to Telegram
  → Promise.race([VS Code result, Telegram result])
    → Returns first response
```

### 3. Button Callback Flow
```
User clicks button in Telegram
  → Telegram sends callback_query
    → telegramBot.handleCallbackQuery()
      → Chat ID validation
      → buttonHandler.handleCallbackQuery()
        → UUID lookup in Map
        → targetUserId validation (if set)
        → vscode.commands.executeCommand()
        → Send confirmation to Telegram
        → Delete mapping (one-time use)
```

### 4. Prompt/Reply Flow
```
VS Code showInputBox() called
  → Patched method intercepts
    → telegramBot.sendPromptAndWaitForReply()
      → Stores pendingPrompt callback
      → Stores promptTargetUserId
      → Sends message to Telegram
  → User replies in Telegram
    → telegramBot.handleMessage()
      → Validates targetUserId
      → Calls pendingPrompt(reply)
  → Promise.race resolves with reply
```

### 5. QuickPick Flow
```
VS Code showQuickPick() called
  → Patched method intercepts
    → Extracts items (max 30)
    → Creates buttons from items
    → telegramBot.sendMessageAndWaitForButton()
  → User clicks button in Telegram
    → Returns selected item
  → Promise.race resolves
```

### 6. Proxy Configuration
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

### 7. Qoder Sidebar Monitoring
```
Qoder creates/updates file
  → file watcher triggers
    → processQoderFile()
      → read file content
      → parse JSON (or treat as text)
      → forwardQoderItem()
        → classify by type (prompt/error/etc)
        → extract action cards (if recommendations)
        → forwardNotification()
```

### 8. Qoder Transcript Monitoring
```
Qoder writes to ~/.qoder/projects/**/*.jsonl
  → file watcher triggers
    → processQoderTranscript()
      → Parse JSONL lines
      → Track seenIds (deduplication, max 500)
      → Skip processed lines (state.lineCount)
      → Forward new records:
        - session_meta → Session started
        - user → Prompt
        - assistant → Response (detect errors, progress, reviews)
        - progress → Progress update
```

### 9. Multi-Instance Polling (BotMutex)
```
Extension activates
  → BotMutex.tryAcquire()
    → Check lock file (/tmp/vscode-telegram-bot.lock)
    → If lock exists and < 5min old → Don't poll
    → If lock exists and > 5min old → Stale, take over
    → If no lock → Create lock, start polling
  → telegramBot.initialize()
    → If hasPollingLock → Enable polling
    → If no lock → polling=false (send-only mode)
  → Heartbeat: Update lock timestamp every 60s
Extension deactivates
  → BotMutex.release()
    → Remove lock file
```

## ⚠️ Known Limitations

1. **VS Code API Patching**
   - Monkey-patches vscode.window methods
   - May break with VS Code updates
   - Dispose() restores original methods

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

5. **QuickPick Limitation**
   - Max 30 items (Telegram button limit)
   - Multiple selection not supported from Telegram

6. **File Watcher Limitations**
   - Only detects file changes, not in-memory updates
   - Might miss rapid changes (no debouncing)

## 🔍 File Locations

```
Source:     src/*.ts (14 files)
Build:      dist/extension.js (bundled)
Package:    package.json
Config:     tsconfig.json, .vscodeignore
Docs:       README.md, *.md (multiple docs)
Examples:   examples/
Output:     *.vsix (multiple versions)
Skills:     .qoder/*.skill.md (4 skill files)
```

## 🎨 Code Style

- **Strict TypeScript** - strict mode enabled
- **ES2020 target** - modern JavaScript
- **CommonJS modules** - VS Code requirement
- **No implicit any** - type-safe
- **Logger injection** - dependency injection pattern
- **Disposable pattern** - proper cleanup
- **Promise.race** - for bidirectional sync

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

### Add New VS Code API Interceptor
1. Add to `notificationInterceptor.ts`
2. Store original method
3. Create patched version with Promise.race
4. Call `Object.defineProperty` to patch
5. Restore in `dispose()`

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

5. **Multi-Instance Issues**
   - Check lock file: `/tmp/vscode-telegram-bot.lock`
   - Verify only one instance has polling
   - Look for "Another VS Code instance already has the bot polling lock"

6. **Qoder Transcript Issues**
   - Check `~/.qoder/projects/` directory exists
   - Verify `.jsonl` files are being created
   - Look for "Qoder transcript created/changed" in logs

## 📊 Statistics Format

Shows 3 tables:
1. **STATUS & INFO** - enabled, connected, IDE, project, uptime
2. **NOTIFICATION STATS** - sent count, active buttons, timeout, max length
3. **CONFIGURATION** - chat ID, token status, proxy, severity filter

Access: `Show Statistics` → `Copy Stats` or `View in Output`
