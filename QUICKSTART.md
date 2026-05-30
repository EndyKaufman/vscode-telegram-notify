# VS Code Telegram Notify - Quick Start Guide

## Project Summary

Successfully created a VS Code extension that forwards notifications to Telegram with interactive button support!

## What's Been Built

### Core Features ✅
1. **Telegram Bot Integration** - Full Telegram Bot API integration with polling
2. **Notification Forwarding** - Send VS Code notifications to Telegram
3. **Interactive Buttons** - Bidirectional button sync between VS Code and Telegram
4. **Secure Configuration** - Bot tokens stored in VS Code secrets
5. **Filtering System** - Filter by severity and source
6. **Status Bar UI** - Visual connection status indicator
7. **Command Palette** - Full set of VS Code commands
8. **Logging System** - Comprehensive output panel logging

### Project Structure
```
vscode-telegram-notify/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── configManager.ts          # Configuration management
│   ├── telegramBot.ts            # Telegram Bot service
│   ├── notificationInterceptor.ts # Notification handler
│   ├── buttonHandler.ts          # Button callback handler
│   ├── messageFormatter.ts       # Message formatting
│   ├── commands.ts               # VS Code commands
│   ├── logger.ts                 # Logging utility
│   └── types.ts                  # Type definitions
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .vscode/
    ├── launch.json
    └── tasks.json
```

## How to Use

### 1. Development Testing

Open the project in VS Code and press `F5` to launch the Extension Development Host.

In the development host:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `Telegram Notify: Setup Bot`
3. Enter your bot token and chat ID
4. Run `Telegram Notify: Send Test Notification`

### 2. Send Notifications Programmatically

From your code or other extensions:

```typescript
// Simple notification
vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  'Build completed!',
  3 // MessageType.Information
);

// Notification with buttons
vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  'Build failed!',
  1, // MessageType.Error
  [
    { 
      title: 'Rebuild', 
      command: { id: 'your.rebuildCommand' } 
    },
    { 
      title: 'Show Output', 
      command: { id: 'workbench.action.output.toggleOutput' } 
    }
  ]
);
```

### 3. Building for Distribution

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch for changes (development)
npm run watch

# Package (requires vsce CLI)
npm install -g @vscode/vsce
vsce package
```

### 4. Configuration

Access via Settings (`Ctrl+,`) and search for "Telegram Notify":

- `telegramNotify.enabled` - Enable/disable notifications
- `telegramNotify.filterSeverity` - Filter by error/warning/info
- `telegramNotify.excludeSources` - Exclude specific sources
- `telegramNotify.buttonTimeout` - Button expiration time (seconds)
- `telegramNotify.maxMessageLength` - Max message length

## Telegram Setup

### Create a Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow instructions to get your bot token
4. Token format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

### Get Your Chat ID

**Personal Chat:**
1. Search for `@userinfobot`
2. Send `/start`
3. Copy your ID

**Group Chat:**
1. Add bot to group
2. Send a message
3. Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find `chat.id` in response

## Architecture Highlights

### Button Synchronization Flow

1. VS Code notification created with buttons
2. Extension generates UUID for each button
3. Button mappings stored in memory
4. Message sent to Telegram with inline keyboard
5. User clicks button in Telegram
6. Callback query received by bot
7. Extension looks up mapping by UUID
8. Executes corresponding VS Code command
9. Sends confirmation back to Telegram
10. Cleans up expired mappings

### Security Features

- Bot tokens stored in VS Code secrets (when available)
- Chat ID validation for incoming callbacks
- Button expiration and cleanup
- Comprehensive error handling

## Known Limitations

1. **No Direct Notification Interception**
   - VS Code doesn't provide API to intercept all notifications
   - Must use command-based approach to send notifications
   - Full interception would require VS Code modifications

2. **Button Lifecycle**
   - Buttons expire after configured timeout (default: 5 minutes)
   - VS Code must be running when buttons are clicked
   - Expired buttons show error message

## Next Steps

### For Development
1. Test in Extension Development Host (`F5`)
2. Configure bot token and chat ID
3. Send test notifications
4. Integrate with your workflow

### For Distribution
1. Update `package.json` with your publisher name
2. Update repository URLs
3. Create VS Code Marketplace account
4. Package with `vsce package`
5. Publish to Marketplace

### Potential Enhancements
- Add support for notification scheduling
- Implement notification grouping
- Add custom notification templates
- Support for Telegram channels
- Add analytics dashboard
- Support for file attachments

## Troubleshooting

### Build Issues
```bash
# Clean and rebuild
rm -rf node_modules dist out
npm install
npm run build
```

### TypeScript Errors
```bash
# Check compilation
npm run compile
```

### Runtime Issues
1. Open Output panel in VS Code
2. Select "Telegram Notify" from dropdown
3. Check for error messages

## Commands Reference

| Command | Description |
|---------|-------------|
| `Telegram Notify: Setup Bot` | Interactive setup wizard |
| `Telegram Notify: Send Test Notification` | Verify configuration |
| `Telegram Notify: Toggle Notifications` | Enable/disable |
| `Telegram Notify: Show Statistics` | View stats |

## API Reference

### Send Notification Command

```typescript
vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  message: string,
  severity?: MessageType,  // 1=Error, 2=Warning, 3=Information
  buttons?: ExtendedMessageItem[]
)
```

### ExtendedMessageItem Interface

```typescript
interface ExtendedMessageItem extends vscode.MessageItem {
  command?: {
    id: string;
    arguments?: any[];
  };
}
```

## Support

- **Documentation**: See README.md
- **Changelog**: See CHANGELOG.md
- **License**: MIT (see LICENSE)

---

**Status**: ✅ Build Successful - Ready for Testing!
