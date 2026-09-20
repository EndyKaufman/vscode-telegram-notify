# Troubleshooting & Best Practices - Telegram Notify

## 🐛 Common Issues & Solutions

### Issue 1: "Bot not initialized"
**Symptoms:**
- Extension activates but doesn't send messages
- Logs show "Bot not initialized"

**Solutions:**
```bash
# 1. Check configuration
Ctrl+, → search "telegramNotify"
→ Verify botToken and chatId are set
→ Verify enabled = true

# 2. Test connection
Ctrl+Shift+P → "Telegram Notify: Send Test Notification"

# 3. Check logs
Ctrl+Shift+U → Select "Telegram Notify"
→ Look for initialization errors
```

**Code Fix:**
```typescript
const validation = configManager.validateConfig();
if (!validation.valid) {
  console.log(validation.message); // Shows what's missing
}
```

### Issue 2: Messages not arriving in Telegram
**Possible Causes:**
1. Wrong bot token or chat ID
2. Network/proxy issues
3. Bot blocked by user
4. Bot not initialized (config invalid)

**Diagnostic Steps:**
```typescript
// Check connection
if (telegramBot.isConnected()) {
  logger.info('Bot is connected');
} else {
  logger.error('Bot is NOT connected');
}

// Test proxy if enabled
const proxyManager = new ProxyManager(logger);
const proxyConfig = proxyManager.getProxyConfig();
if (proxyConfig.enabled) {
  const result = await proxyManager.testProxyConnection(proxyConfig);
  logger.info(result.message);
}
```

**Solutions:**
- Verify bot token: Get from @BotFather
- Verify chat ID: Send message to bot, check via `getUpdates` API
- Check proxy: Disable temporarily to test
- Unblock bot: Start chat with bot in Telegram

### Issue 3: Buttons not working
**Symptoms:**
- Buttons appear in Telegram but don't respond
- "This button has expired" message
- "Unauthorized" message

**Causes & Fixes:**

1. **Button Expired** (after 300s default)
```typescript
// Increase timeout in settings
"telegramNotify.buttonTimeout": 600  // 10 minutes
```

2. **Command Not Found**
```typescript
// Verify command exists in package.json
{
  "command": "your-extension.commandId",
  "title": "Your Command"
}

// Check button format
{
  title: 'Click Me',
  command: {
    id: 'your-extension.commandId',  // Must match package.json
    arguments: []  // Optional
  }
}
```

3. **Wrong Chat ID / Unauthorized User**
```typescript
// ButtonHandler validates chat ID
// Ensure callback comes from configured chat
if (callbackQuery.message.chat.id.toString() !== this.chatId) {
  // Rejected - unauthorized chat
}

// For private chats, targetUserId validation
if (mapping.targetUserId && callbackQuery.from.id !== mapping.targetUserId) {
  // Rejected - unauthorized user
}
```

### Issue 4: Markdown formatting broken
**Symptoms:**
- Messages show escape characters: `\*`, `\_`
- Formatting not applied

**Solutions:**

1. **Don't double-escape**
```typescript
// ❌ WRONG - already escaped by formatter
const msg = '\\*bold\\*';
await notificationInterceptor.forwardNotification(msg, ...);

// ✅ CORRECT - formatter handles escaping
const msg = '*bold*';
await notificationInterceptor.forwardNotification(msg, ...);
```

2. **Use plain text for code**
```typescript
// Code blocks are escaped automatically
const code = `function test() {
  return true;
}`;
// Will appear as escaped text in Telegram
```

3. **Check Telegram limits**
- Max message: 4096 chars
- Extension truncates at 4000 (configurable)

### Issue 5: Proxy connection fails
**Symptoms:**
- "Failed to initialize Telegram Bot"
- Proxy-related errors in logs

**Debug Steps:**
```typescript
// 1. Validate proxy URL format
// ✅ Correct formats:
socks5://user:pass@proxy.com:1080
http://proxy.com:3128
socks4://192.168.1.100:1080

// ❌ Wrong formats:
proxy.com:1080                    // Missing protocol
socks5://proxy.com                // Missing port
socks5://user@proxy.com:1080      // Missing password

// 2. Test proxy manually
curl -x socks5://user:pass@proxy.com:1080 https://api.telegram.org

// 3. Check credentials
// URL-encode special characters in password:
// @ → %40, # → %23, : → %3A
```

**Common Proxy Errors:**
```
ECONNREFUSED     → Wrong host/port
ECONNRESET       → Proxy server down
ETIMEDOUT        → Network/firewall blocking
Authentication   → Wrong username/password
```

### Issue 6: Qoder notifications not detected
**Symptoms:**
- Qoder sidebar updates but nothing sent to Telegram

**Checklist:**
```bash
# 1. Verify .qoder directory exists
ls -la .qoder/

# 2. Check file patterns
# Watchers monitor:
.qoder/**/*.json
.qoder/**/*.log
.qoder/**/notifications*
.qoder/**/prompts*
.qoder/**/chat*
.qoder/**/messages*

# 3. Check logs for watcher activity
# Look for: "Qoder sidebar file created/changed"

# 4. Verify Qoder extension is installed
Ctrl+Shift+X → Search "Qoder"
```

### Issue 7: "409 Conflict: terminated by other getUpdates request"
**Symptoms:**
- Multiple VS Code windows open
- Only one instance should poll Telegram
- Error appears in logs

**Solution:**
This is handled by BotMutex automatically:
```typescript
// BotMutex ensures only one instance polls
// Lock file: /tmp/vscode-telegram-bot.lock
// Stale lock timeout: 5 minutes
// Heartbeat: Every 60 seconds
```

**If issue persists:**
```bash
# Delete stale lock file
rm /tmp/vscode-telegram-bot.lock

# Restart VS Code
```

### Issue 8: VS Code API patching not working
**Symptoms:**
- showInformationMessage called but not forwarded to Telegram
- showInputBox not showing in Telegram
- showQuickPick not showing in Telegram

**Causes & Fixes:**

1. **Extension activated before patching**
```typescript
// Patching happens in notificationInterceptor.initialize()
// Called in extension.ts activate()
// Ensure interceptor is initialized before other extensions call VS Code APIs
```

2. **VS Code update broke patching**
```typescript
// Monkey-patching may break with VS Code updates
// Check logs: "Cannot patch vscode.window.XXX: method not found"
// If method signature changed, update patched function
```

3. **dispose() restored original methods**
```typescript
// Original methods restored on deactivate()
// If extension disabled, patching removed
// Re-enable extension to re-patch
```

### Issue 9: showQuickPick shows only 30 items
**Symptoms:**
- QuickPick has 50 items
- Only 30 appear in Telegram

**Cause:**
Telegram inline keyboard button limit is 30 (practical limit for UX).

**Solution:**
This is intentional. If you need more items, consider:
- Filtering items before showing
- Using showInputBox instead (text reply)
- Grouping items into categories

### Issue 10: Multiple selection QuickPick not working from Telegram
**Symptoms:**
- QuickPick with `canPickMany: true`
- Telegram message says "Multiple selection cannot be answered"

**Cause:**
Telegram buttons don't support multiple selection.

**Solution:**
```typescript
// Notification interceptor detects canPickMany
// Shows informational message instead of buttons
await this.forwardNotification(
  `${options?.placeHolder || 'Quick pick requested'}\n\nMultiple selection QuickPick cannot be answered from Telegram yet.`,
  MessageType.Information,
  'VS Code QuickPick'
);
return undefined;  // Falls back to VS Code
```

## 🎯 Best Practices

### 1. Configuration Management
```typescript
// ✅ DO: Validate before using
const validation = configManager.validateConfig();
if (!validation.valid) {
  vscode.window.showErrorMessage(validation.message);
  return;
}

// ❌ DON'T: Assume config is valid
const config = configManager.getConfig();
await telegramBot.initialize(config.botToken, ...);  // Might fail!
```

### 2. Error Handling
```typescript
// ✅ DO: Catch and log errors
try {
  await telegramBot.sendMessage(msg, severity, source);
} catch (error) {
  logger.error('Failed to send notification', error);
  vscode.window.showErrorMessage('Notification failed');
}

// ❌ DON'T: Let errors propagate
await telegramBot.sendMessage(msg, severity, source);  // Might crash!
```

### 3. Resource Disposal
```typescript
// ✅ DO: Dispose resources
export function deactivate() {
  if (qoderIntegration) qoderIntegration.dispose();
  if (telegramBot) telegramBot.shutdown();
  if (notificationInterceptor) notificationInterceptor.dispose();
  if (commandManager) commandManager.dispose();
  if (logger) logger.dispose();
}

// ❌ DON'T: Leave resources alive
// Memory leak! Polling continues!
```

### 4. Logging
```typescript
// ✅ DO: Use appropriate log levels
logger.info('Normal operation');
logger.warn('Something unusual but not critical');
logger.error('Something failed', error);
logger.debug('Detailed info for debugging');

// ❌ DON'T: Use console.log
console.log('message');  // Harder to filter
```

### 5. Button Management
```typescript
// ✅ DO: Set appropriate timeout
// Short timeout for time-sensitive actions
config.buttonTimeout = 60;  // 1 minute

// Long timeout for important actions
config.buttonTimeout = 600;  // 10 minutes

// ❌ DON'T: Use very long timeouts
config.buttonTimeout = 86400;  // 24 hours - wastes memory!
```

### 6. Message Formatting
```typescript
// ✅ DO: Keep messages concise
const msg = `Build failed: ${error.message.substring(0, 200)}`;

// ❌ DON'T: Send huge messages
const msg = JSON.stringify(largeObject, null, 2);  // Might be KBs!

// ✅ DO: Use severity appropriately
MessageType.Error      // For failures
MessageType.Warning    // For potential issues
MessageType.Information  // For status updates
```

### 7. Proxy Security
```typescript
// ✅ DO: Mask credentials in logs
const masked = proxyManager.formatProxyDisplay(config);
logger.info(masked);  // "Proxy: SOCKS5 via socks5://***:***@proxy.com:1080"

// ❌ DON'T: Log raw proxy URL
logger.info(config.proxyUrl);  // Exposes credentials!

// ✅ DO: URL-encode special chars
const safeUrl = `socks5://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@host:port`;
```

### 8. Testing
```typescript
// ✅ DO: Test different scenarios
await testCommands.testSimpleInfo();
await testCommands.testErrorWithButtons();
await testCommands.testLongMessage();

// ✅ DO: Test in development mode
npm run watch  # Auto-rebuild
F5             # Launch Extension Development Host

// ❌ DON'T: Test only in production
// Hard to debug without logs!
```

### 9. VS Code API Patching
```typescript
// ✅ DO: Store original methods
this.originalShowInformationMessage = original;

// ✅ DO: Restore on dispose
if (this.originalShowInformationMessage) {
  windowApi.showInformationMessage = this.originalShowInformationMessage;
}

// ✅ DO: Use Promise.race for bidirectional sync
return Promise.race([originalPromise, telegramPromise]);

// ❌ DON'T: Block original method
// Always call original and return its result or Telegram result
```

### 10. BotMutex Management
```typescript
// ✅ DO: Check if lock acquired
this.hasPollingLock = await this.mutex.tryAcquire();

// ✅ DO: Release lock on shutdown
if (this.hasPollingLock) {
  this.mutex.release();
}

// ❌ DON'T: Poll without lock
// Causes 409 conflicts with other instances
```

## 📊 Performance Tips

### 1. Button Cleanup
```typescript
// ButtonHandler cleans up every 60s
// Expired mappings are removed automatically
// No action needed, but be aware:
// - Max 300s default lifetime
// - Cleanup runs every 60s
// - Deleted after use (one-time buttons)
```

### 2. File Watchers
```typescript
// Qoder integration uses file watchers
// Efficient: VS Code API handles watching
// But: Too many watchers = performance hit
// Solution: Watch specific patterns only

const patterns = [
  '**/.qoder/**/*.json',  // Specific
  '**/*.log'              // Too broad! Avoid this
];
```

### 3. Message Truncation
```typescript
// Default: 4000 chars
// Telegram limit: 4096 chars
// Adjust if needed:
"telegramNotify.maxMessageLength": 3000

// Good for: Reducing message size
// Bad for: Losing important information
```

### 4. Transcript Deduplication
```typescript
// QoderIntegration tracks seenIds (max 500)
// Prevents duplicate notifications
// Automatically trims to last 250 when exceeds 500
// No action needed, but be aware of memory usage
```

### 5. Multi-Instance Optimization
```typescript
// Only one instance polls (has BotMutex lock)
// Other instances run in send-only mode (polling=false)
// Reduces Telegram API load
// No manual configuration needed
```

## 🔐 Security Checklist

- [x] Bot token stored in VS Code secrets (when available)
- [x] Proxy credentials masked in logs
- [x] Chat ID validation (reject unauthorized)
- [x] targetUserId validation for private/group chats
- [x] No sensitive data in error messages
- [x] Configuration validation before use
- [ ] Don't commit secrets to git (use .gitignore)
- [ ] Rotate bot tokens periodically
- [ ] Use strong proxy passwords

## 📚 Useful Resources

### VS Code Extension API
- [Extension API Docs](https://code.visualstudio.com/api)
- [Configuration API](https://code.visualstudio.com/api/references/vscode-api#workspace.getConfiguration)
- [Secrets API](https://code.visualstudio.com/api/references/vscode-api#SecretController)

### Telegram Bot API
- [Bot API Docs](https://core.telegram.org/bots/api)
- [Markdown Formatting](https://core.telegram.org/bots/api#markdown-style)
- [Inline Keyboards](https://core.telegram.org/bots/api#inlinekeyboardmarkup)

### Debugging
- VS Code Output Panel: `Ctrl+Shift+U`
- Extension Logs: Select "Telegram Notify"
- Developer Tools: `Ctrl+Shift+I` (Extension Host)
- Mutex Lock File: `/tmp/vscode-telegram-bot.lock`
- Qoder Transcripts: `~/.qoder/projects/**/*.jsonl`
