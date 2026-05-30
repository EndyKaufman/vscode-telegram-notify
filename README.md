# Telegram Notify for VS Code

Forward VS Code notifications to Telegram with interactive button support!

## Features

- 🔔 **Forward Notifications** - Send VS Code notifications to Telegram
- 🔘 **Interactive Buttons** - Click notification buttons directly from Telegram
- 🎛️ **Filter Controls** - Filter by severity (error, warning, info) and source
- 🔒 **Secure Storage** - Bot tokens stored in VS Code secrets
- 📊 **Statistics** - Track notification counts and active buttons
- ⚡ **Status Bar** - Quick access to connection status and controls

## Installation

1. Install from VS Code Marketplace or download the `.vsix` file
2. Open VS Code and go to Extensions (`Ctrl+Shift+X`)
3. Verify "Telegram Notify" is installed and enabled

## Quick Start

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the instructions:
   - Choose a name for your bot
   - Choose a username (must end in 'bot')
4. **Save the bot token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### Step 2: Get Your Chat ID

**For personal messages:**
1. Search for **@userinfobot** in Telegram
2. Send `/start`
3. Copy your ID (looks like: `123456789`)

**For groups:**
1. Add your bot to the group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` in the response (negative for groups, e.g., `-1001234567890`)

### Step 3: Configure the Extension

1. Open VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: `Telegram Notify: Setup Bot`
3. Enter your bot token
4. Enter your chat ID
5. Choose whether to enable notifications
6. Send a test message to verify

## Commands

| Command | Description |
|---------|-------------|
| `Telegram Notify: Setup Bot` | Configure bot token and chat ID |
| `Telegram Notify: Send Test Notification` | Send a test message to Telegram |
| `Telegram Notify: Toggle Notifications` | Enable/disable notifications |
| `Telegram Notify: Show Statistics` | View notification statistics |

## Configuration

Access settings via `File > Preferences > Settings` and search for "Telegram Notify":

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `telegramNotify.enabled` | boolean | `false` | Enable forwarding notifications |
| `telegramNotify.filterSeverity` | array | `["error", "warning", "info"]` | Which severities to forward |
| `telegramNotify.excludeSources` | array | `[]` | Sources to exclude |
| `telegramNotify.buttonTimeout` | number | `300` | Button active time (seconds) |
| `telegramNotify.maxMessageLength` | number | `4000` | Max message length |

## Usage

### Sending Notifications

The extension provides a command that other extensions or tasks can use:

```typescript
vscode.commands.executeCommand(
  'telegram-notify.sendNotification',
  'Your notification message',
  vscode.MessageType.Error, // Optional: Error, Warning, Information
  [
    { title: 'Retry', command: { id: 'your.retryCommand' } },
    { title: 'Ignore', command: { id: 'your.ignoreCommand' } }
  ]
);
```

### Interactive Buttons

When a notification with buttons is sent to Telegram:
- Buttons appear as inline keyboard buttons
- Clicking a button executes the corresponding VS Code command
- Confirmation is sent back to Telegram
- Buttons expire after the configured timeout

### Example: Integration with Tasks

You can integrate with VS Code tasks to get notified on completion:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "command": "npm run build",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always"
      }
    }
  ]
}
```

Then use a task completion notification extension or script to send to Telegram.

## Status Bar

The status bar shows the current connection status:

- 🟢 **Telegram: Connected** - Bot is active and connected
- 🟡 **Telegram: Disabled** - Notifications are disabled
- 🔴 **Telegram: Error** - Connection or configuration error

Click the status bar item to open setup.

## Troubleshooting

### Bot not sending messages

1. Verify bot token is correct
2. Check chat ID format (must be a number)
3. Ensure bot is not blocked in Telegram
4. Check Output panel: `View > Output > Telegram Notify`

### Buttons not working

1. Verify bot is connected (check status bar)
2. Check button timeout hasn't expired
3. Ensure VS Code is still running
4. Check Output panel for errors

### Can't find chat ID

- For personal messages: Use @userinfobot
- For groups: Bot must be added to group first
- Channel IDs start with `-100`
- User IDs are positive numbers
- Group IDs are negative numbers

### Messages truncated

- Adjust `telegramNotify.maxMessageLength` in settings
- Maximum is 4096 characters (Telegram limit)

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/your-username/vscode-telegram-notify.git
cd vscode-telegram-notify

# Install dependencies
npm install

# Build extension
npm run build

# Package for distribution
npx vsce package
```

### Running in Development

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test commands in the new window

### Project Structure

```
vscode-telegram-notify/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── configManager.ts       # Configuration management
│   ├── telegramBot.ts         # Telegram Bot service
│   ├── notificationInterceptor.ts  # Notification handler
│   ├── buttonHandler.ts       # Button callback handler
│   ├── messageFormatter.ts    # Message formatting
│   ├── commands.ts            # VS Code commands
│   └── logger.ts              # Logging utility
├── package.json
├── tsconfig.json
└── README.md
```

## API for Extension Developers

You can send notifications programmatically from your extension:

```typescript
// Get the Telegram Notify API
const telegramNotify = vscode.extensions.getExtension('your-publisher.telegram-notify');

if (telegramNotify) {
  // Send simple notification
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    'Build completed successfully!',
    vscode.MessageType.Information
  );

  // Send notification with buttons
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    'Build failed!',
    vscode.MessageType.Error,
    [
      { 
        title: 'Rebuild', 
        command: { id: 'myextension.rebuild' } 
      },
      { 
        title: 'Show Errors', 
        command: { id: 'workbench.action.showErrorsWarnings' } 
      }
    ]
  );
}
```

## Privacy & Security

- Bot tokens are stored in VS Code's secure secret storage
- Only messages from configured chat ID are processed
- No data is collected or transmitted except to your Telegram bot
- All processing happens locally

## Limitations

- VS Code does not provide a direct API to intercept all notifications
- This extension provides a command-based approach for sending notifications
- Full notification interception would require modifying VS Code itself
- Buttons require VS Code to be running when clicked

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/vscode-telegram-notify/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/vscode-telegram-notify/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

Made with ❤️ for the VS Code community
