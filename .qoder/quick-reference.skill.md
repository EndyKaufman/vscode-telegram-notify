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
```

## 📝 Common Code Patterns

### Forward Notification
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
  await this.forwardNotification(
    'Test message',
    MessageType.Information,
    'Test Command'
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

## 📦 File Structure Quick Reference

```
src/
├── extension.ts              # Entry point (exports all services)
├── configManager.ts          # Settings management
├── telegramBot.ts            # Telegram API wrapper
├── buttonHandler.ts          # Button callback handling
├── messageFormatter.ts       # Message formatting
├── notificationInterceptor.ts # Notification routing
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

## 📊 Statistics

```typescript
// Get notification count
const count = notificationInterceptor.getNotificationCount();

// Get active buttons
const buttons = telegramBot.getButtonHandler()?.getActiveButtonCount() || 0;

// Check connection
const isConnected = telegramBot.isConnected();
```

## 🔄 Lifecycle

### Activation
```
activate()
  → Initialize services
  → Register commands
  → Validate config
  → Initialize bot (if configured)
  → Show welcome message (first time)
```

### Deactivation
```
deactivate()
  → Dispose Qoder integration
  → Dispose test commands
  → Shutdown Telegram bot
  → Dispose interceptor
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
