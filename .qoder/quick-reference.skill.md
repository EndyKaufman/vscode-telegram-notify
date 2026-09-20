# Quick Reference - Telegram Notify Extension

## 🚀 Quick Commands

### Build & Test
```bash
npm run build          # Production build
npm run watch          # Auto-rebuild on changes
npm run compile        # Type check only
npx vsce package       # Create .vsix
```

### VS Code Commands (Ctrl+Shift+P)
```
Telegram Notify: Setup Bot           # First-time setup
Telegram Notify: Send Test           # Test connection
Telegram Notify: Toggle              # Enable/disable
Telegram Notify: Show Statistics     # View stats
Telegram Notify: Copy Stats          # Copy stats to clipboard
```

## 📝 Common Code Patterns

### Forward Notification (Direct)
```typescript
import { notificationInterceptor } from './extension';
import { MessageType } from './types';

// Simple notification
await notificationInterceptor.forwardNotification(
  'Your message here',
  MessageType.Information,
  'Your Extension Name'
);

// With buttons
await notificationInterceptor.forwardNotification(
  'Action required',
  MessageType.Warning,
  'Source',
  [
    {
      title: 'Open Settings',
      command: { id: 'workbench.action.openSettings' }
    },
    {
      title: 'Dismiss',
      command: undefined
    }
  ]
);
```

### Programmatically from Other Extensions
```typescript
// Use the internal command
await vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  'Message text',
  MessageType.Information,
  buttons  // optional ExtendedMessageItem[]
);
```

### Add Logger
```typescript
import { logger } from './extension';

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error occurred', errorObject);
logger.debug('Debug details', data);
```

### Access Configuration
```typescript
import { configManager } from './extension';

const config = configManager.getConfig();
if (config.enabled) {
  console.log(config.botToken);
  console.log(config.chatId);
}

// Update setting
await configManager.updateConfig('enabled', true);
```

### Send via Telegram Bot Directly
```typescript
import { telegramBot } from './extension';
import { MessageType } from './types';

await telegramBot.sendMessage(
  'Direct message',
  MessageType.Information,
  'Custom Source'
);
```

### Wait for Button Click
```typescript
import { telegramBot } from './extension';
import { MessageType } from './types';

const selectedButton = await telegramBot.sendMessageAndWaitForButton(
  'Choose an action:',
  MessageType.Information,
  'Source',
  [
    { title: '✅ Accept' },
    { title: '❌ Reject' }
  ]
);

if (selectedButton === '✅ Accept') {
  // User accepted
}
```

### Wait for Text Reply (Prompt)
```typescript
import { telegramBot } from './extension';
import { MessageType } from './types';

const reply = await telegramBot.sendPromptAndWaitForReply(
  'Enter your name:',
  'Source'
);

if (reply) {
  console.log('User replied:', reply);
}
```

## 🔧 Adding New Features

### New Command
```typescript
// 1. In commands.ts registerCommands():
this.disposables.push(
  vscode.commands.registerCommand(
    'telegram-notify.myCommand',
    () => this.handleMyCommand()
  )
);

// 2. Add handler:
private async handleMyCommand(): Promise<void> {
  this.logger.info('My command executed');
  // Your logic here
}

// 3. In package.json:
{
  "command": "telegram-notify.myCommand",
  "title": "Telegram Notify: My Command",
  "category": "Telegram Notify"
}
```

### New Test Command
```typescript
// In testCommands.ts:
async testMyScenario(): Promise<void> {
  await vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    'Test message',
    MessageType.Information
  );
}

// Register in registerAll():
vscode.commands.registerCommand(
  'telegram-notify.test.myTest',
  () => this.testMyScenario()
);
```

### New Config Field
```typescript
// 1. In package.json configuration.properties:
"telegramNotify.mySetting": {
  "type": "boolean",
  "default": false,
  "description": "My custom setting"
}

// 2. In configManager.ts interface:
export interface TelegramNotifyConfig {
  // ... existing fields
  mySetting: boolean;
}

// 3. In getConfig():
mySetting: this.config.get<boolean>('mySetting', false),
```

### New VS Code API Interceptor
```typescript
// In notificationInterceptor.ts:

private patchNewMethod(): void {
  const windowApi = vscode.window as any;
  const original = windowApi.newMethod as (...args: any[]) => Thenable<any>;

  if (typeof original !== 'function') {
    return;
  }

  // Store original
  this.originalNewMethod = original;

  const interceptor = this;
  const patched = function patchedNewMethod(this: unknown, ...args: any[]) {
    const originalPromise = original.call(this, ...args);
    
    // Forward to Telegram
    interceptor.forwardNotification(
      String(args[0]),
      MessageType.Information,
      'New Method'
    );

    return originalPromise;
  };

  // Patch
  try {
    windowApi.newMethod = patched;
  } catch {
    Object.defineProperty(windowApi, 'newMethod', {
      configurable: true,
      writable: true,
      value: patched,
    });
  }
}

// In dispose():
if (this.originalNewMethod) {
  windowApi.newMethod = this.originalNewMethod;
}
```

## 📦 File Structure Quick Reference

```
src/
├── extension.ts              # Entry point (exports all services)
├── configManager.ts          # Settings management
├── telegramBot.ts            # Telegram API wrapper + mutex
├── botMutex.ts               # Multi-instance polling lock
├── buttonHandler.ts          # Button callback handling
├── messageFormatter.ts       # Message formatting
├── notificationInterceptor.ts # VS Code API patching + routing
├── proxyManager.ts           # Proxy support
├── qoderIntegration.ts       # Qoder sidebar monitoring
├── commands.ts               # VS Code commands
├── testCommands.ts           # Test scenarios
├── qoderTestCommands.ts      # Qoder tests
├── types.ts                  # Type definitions
└── logger.ts                 # Logging utility
```

## 🎯 Key Exports from extension.ts

```typescript
export {
  logger,                    // Logger instance
  configManager,             // ConfigManager instance
  telegramBot,               // TelegramBotService instance
  messageFormatter,          // MessageFormatter instance
  notificationInterceptor,   // NotificationInterceptor instance
  commandManager             // CommandManager instance
}
```

## 🔍 Debug Checklist

- [ ] Check Output panel (Ctrl+Shift+U → "Telegram Notify")
- [ ] Verify config: `telegramNotify.enabled = true`
- [ ] Test bot token and chat ID
- [ ] Check proxy if enabled
- [ ] Review logs for errors
- [ ] Run test command to verify connection
- [ ] Check mutex lock: `/tmp/vscode-telegram-bot.lock`

## 📊 Statistics

```typescript
// Get notification count
const count = notificationInterceptor.getNotificationCount();

// Get active buttons
const buttons = telegramBot.getButtonHandler()?.getActiveButtonCount() || 0;

// Check connection
const isConnected = telegramBot.isConnected();

// Check chat ID
const chatId = telegramBot.getChatId();
```

## 🔄 Lifecycle

### Activation
```
activate()
  → Initialize services (Logger, ConfigManager, ProxyManager, etc.)
  → Register commands
  → Validate config
  → Initialize bot (if configured)
    → BotMutex.tryAcquire()
    → If lock acquired → Enable polling
    → If lock exists → Send-only mode
  → Patch VS Code APIs (showMessage, showInputBox, showQuickPick)
  → Setup file watchers (Qoder)
  → Show welcome message (first time)
```

### Deactivation
```
deactivate()
  → Dispose Qoder integration (file watchers)
  → Dispose test commands
  → Shutdown Telegram bot
    → BotMutex.release()
    → Stop polling (if has lock)
  → Dispose interceptor (restore VS Code APIs)
  → Dispose command manager
  → Dispose logger
```

## 💡 Tips

1. **Always rebuild after changes**: `npm run build`
2. **Use watch mode during development**: `npm run watch`
3. **Check types before build**: `npm run compile`
4. **Test with built-in commands** before custom code
5. **Use logger** instead of console.log
6. **Dispose resources** to prevent memory leaks
7. **Validate config** before using bot
8. **Use notificationInterceptor** for consistent formatting
9. **Promise.race** enables bidirectional sync (VS Code ↔ Telegram)
10. **BotMutex** prevents 409 conflicts with multiple VS Code instances
11. **Monkey-patching** VS Code APIs may break with updates - test thoroughly
12. **targetUserId** ensures only intended user can respond (private chats)

## 🎯 Qoder Deeplinks

```typescript
// Open Qoder chat
await vscode.commands.executeCommand(
  'telegram-notify.qoder.openChat',
  'Your prompt text',
  'agent'  // or 'ask'
);

// Open Qoder quest
await vscode.commands.executeCommand(
  'telegram-notify.qoder.openQuest',
  'Your task text',
  'LocalAgent'  // or 'LocalWorktree', 'RemoteAgent'
);

// Copy to clipboard
await vscode.commands.executeCommand(
  'telegram-notify.qoder.copyToClipboard',
  'Text to copy'
);
```

## 🔐 Security Notes

- Bot token stored in VS Code secrets (with fallback to settings)
- Proxy credentials masked in logs
- Chat ID validation rejects unauthorized callbacks
- targetUserId validation for private/group chat authorization
- Never log raw credentials
