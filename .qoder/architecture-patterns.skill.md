# Architecture & Design Patterns - Telegram Notify

## 🏛️ Architectural Decisions

### 1. Service-Based Architecture
**Decision:** Use dependency injection with service classes

**Rationale:**
- Clear separation of concerns
- Easy to test individual components
- Reusable services across modules

**Implementation:**
```typescript
// Centralized service initialization in extension.ts
logger = new Logger('Telegram Notify');
configManager = new ConfigManager(logger);
telegramBot = new TelegramBotService(logger, messageFormatter);

// Services injected into dependent modules
commandManager = new CommandManager(
  logger,           // Logging
  configManager,    // Config access
  telegramBot,      // Telegram API
  notificationInterceptor  // Notification routing
);
```

**Benefits:**
- ✅ Single source of truth for each service
- ✅ Easy to mock for testing
- ✅ Clear dependency graph

**Trade-offs:**
- ❌ More boilerplate code
- ❌ Need to manage service lifecycle

---

### 2. Configuration-First Approach
**Decision:** Validate configuration before any operation

**Rationale:**
- Fail fast with clear error messages
- Prevent runtime errors from missing config
- User-friendly setup flow

**Implementation:**
```typescript
// ConfigManager validates all fields
validateConfig(): { valid: boolean; message: string } {
  if (!config.botToken) {
    return { valid: false, message: 'Bot token is not configured...' };
  }
  // ... more validations
}

// Used before critical operations
const validation = configManager.validateConfig();
if (!validation.valid) {
  vscode.window.showErrorMessage(validation.message);
  return;
}
```

**Benefits:**
- ✅ Clear error messages
- ✅ Prevents cryptic runtime errors
- ✅ Guides user through setup

---

### 3. UUID-Based Button Mapping
**Decision:** Use UUIDs to map Telegram callbacks to VS Code commands

**Rationale:**
- Telegram callback_data limit: 64 bytes
- Need to store complex command data
- UUIDs are unique and compact

**Implementation:**
```typescript
// Create mapping
const callbackId = uuidv4();  // e.g., "550e8400-e29b-41d4-a716-446655440000"
this.buttonMappings.set(callbackId, {
  callbackId,
  commandId: 'some.command',
  arguments: ['arg1', 'arg2'],
  notificationId: 'notif_123',
  buttonTitle: 'Open Settings',
  createdAt: Date.now()
});

// Send to Telegram with UUID as callback_data
{
  text: 'Open Settings',
  callback_data: '550e8400-e29b-41d4-a716-446655440000'  // 36 chars
}

// On callback, lookup and execute
const mapping = this.buttonMappings.get(callbackId);
await vscode.commands.executeCommand(mapping.commandId, ...mapping.arguments);
```

**Benefits:**
- ✅ Works within Telegram limits
- ✅ Secure (can't guess UUIDs)
- ✅ Supports complex commands

**Trade-offs:**
- ❌ Memory usage (stored until expiry)
- ❌ One-time use (deleted after click)

---

### 4. Proxy URL Priority
**Decision:** proxyUrl field takes priority over individual fields

**Rationale:**
- Single string is easier to copy/paste
- Common use case: corporate proxy URL provided as-is
- Backward compatible with individual fields

**Implementation:**
```typescript
getProxyConfig(): ProxyConfig {
  const proxyUrl = config.get<string>('proxyUrl', '');
  
  // Priority 1: Parse proxyUrl
  if (proxyUrl && proxyUrl.trim().length > 0) {
    return this.parseProxyUrl(proxyUrl);
  }
  
  // Priority 2: Use individual fields
  return {
    enabled: config.get<boolean>('proxyEnabled'),
    host: config.get<string>('proxyHost'),
    port: config.get<number>('proxyPort'),
    // ...
  };
}
```

**Benefits:**
- ✅ Flexible configuration
- ✅ User-friendly (choose either approach)
- ✅ Backward compatible

---

### 5. File Watcher Pattern for Qoder
**Decision:** Use VS Code file watchers instead of polling

**Rationale:**
- Efficient (event-driven)
- Low resource usage
- Built into VS Code API

**Implementation:**
```typescript
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceRoot, '**/.qoder/**/*.json')
);

watcher.onDidCreate((uri) => {
  this.processQoderFile(uri);  // Handle new file
});

watcher.onDidChange((uri) => {
  this.processQoderFile(uri);  // Handle update
});

// Cleanup on dispose
this.disposables.push(watcher);
```

**Benefits:**
- ✅ Event-driven (no polling overhead)
- ✅ Real-time detection
- ✅ Automatic cleanup

**Trade-offs:**
- ❌ Only detects file changes, not in-memory updates
- ❌ Might miss rapid changes (debouncing needed)

---

## 🎨 Design Patterns Used

### 1. Singleton Pattern
**Where:** Logger, ConfigManager

**Why:** Single instance across extension

```typescript
// Module-level variables (singleton-like)
let logger: Logger;
let configManager: ConfigManager;

export async function activate(context: vscode.ExtensionContext) {
  logger = new Logger('Telegram Notify');  // Only created once
  configManager = new ConfigManager(logger);
}

export { logger, configManager };  // Export for other modules
```

---

### 2. Factory Pattern
**Where:** ProxyManager.createProxyAgent()

**Why:** Create different agent types based on config

```typescript
createProxyAgent(config: ProxyConfig): Agent | null {
  if (config.protocol === 'socks4' || config.protocol === 'socks5') {
    return new SocksProxyAgent(proxyUrl);  // Factory creates SOCKS agent
  } else {
    return new HttpsProxyAgent(proxyUrl);  // Factory creates HTTP agent
  }
}
```

---

### 3. Observer Pattern
**Where:** Configuration changes, file watchers

**Why:** React to external events

```typescript
// Observer: Listen for config changes
context.subscriptions.push(
  configManager.onDidChangeConfiguration(() => {
    logger.info('Configuration changed');
    commandManager.updateStatusBar();
  })
);

// Observer: Listen for file changes
watcher.onDidCreate((uri) => {
  this.processQoderFile(uri);
});
```

---

### 4. Strategy Pattern
**Where:** Message formatting, severity handling

**Why:** Different strategies for different message types

```typescript
// Strategy: Choose emoji based on severity
private getSeverityEmoji(severity: MessageType): string {
  switch (severity) {
    case MessageType.Error:       return '🚨';
    case MessageType.Warning:     return '⚠️';
    case MessageType.Information: return 'ℹ️';
    default:                      return '📢';
  }
}

// Strategy: Choose filter behavior
private shouldForwardSeverity(severity: MessageType): boolean {
  const severityName = severityMap[severity];
  return config.filterSeverity.includes(severityName);
}
```

---

### 5. Disposable Pattern
**Where:** All resources (watchers, intervals, channels)

**Why:** Prevent memory leaks

```typescript
// Collect all disposables
private disposables: vscode.Disposable[] = [];

// Add resources
this.disposables.push(watcher);
this.disposables.push(interval);
this.disposables.push(outputChannel);

// Cleanup on deactivate
export function deactivate() {
  disposables.forEach(d => d.dispose());
}
```

---

## 🔄 Data Flow Patterns

### 1. Notification Flow
```
User Action / Extension Event
  ↓
notificationInterceptor.forwardNotification()
  ↓
Config Validation
  ├─ enabled? → No: Return
  ├─ severity filter? → No: Return
  └─ source excluded? → Yes: Return
  ↓
Counter Increment
  ↓
telegramBot.sendMessage()
  ↓
messageFormatter.formatNotification()
  ├─ Add severity emoji
  ├─ Add IDE name
  ├─ Add project name
  ├─ Add source
  ├─ Add timestamp
  └─ Escape Markdown
  ↓
buttonHandler.createInlineKeyboard() (if buttons)
  ├─ Generate UUIDs
  ├─ Store mappings
  └─ Create inline keyboard
  ↓
Telegram API
  ↓
User receives message in Telegram
```

---

### 2. Button Callback Flow
```
User clicks button in Telegram
  ↓
Telegram sends callback_query to bot
  ↓
telegramBot.handleCallbackQuery()
  ↓
Chat ID Validation
  └─ From authorized chat? → No: Reject
  ↓
buttonHandler.handleCallbackQuery()
  ↓
UUID Lookup
  └─ Found in Map? → No: "Button expired"
  ↓
Execute VS Code Command
  ├─ vscode.commands.executeCommand()
  └─ Handle errors
  ↓
Send Confirmation
  ├─ answerCallbackQuery() → "✅ Success"
  └─ sendMessage() → Confirmation message
  ↓
Cleanup
  └─ Delete mapping from Map
```

---

### 3. Setup Wizard Flow
```
User runs: "Telegram Notify: Setup Bot"
  ↓
Step 1: Get Bot Token
  ├─ Show input box
  ├─ Validate format (contains ":")
  └─ Store in secrets (or settings)
  ↓
Step 2: Get Chat ID
  ├─ Show input box
  ├─ Explain how to get chat ID
  └─ Store in settings
  ↓
Step 3: Configure Proxy (optional)
  ├─ Ask: Enable proxy?
  ├─ Yes: Get proxyUrl
  │   ├─ Validate URL format
  │   └─ Store proxyUrl + enable
  └─ No: Disable proxy
  ↓
Step 4: Test Connection
  ├─ Initialize bot with config
  ├─ Send test message
  └─ Show result
  ↓
Complete
  └─ Update status bar
```

---

## ⚡ Performance Optimizations

### 1. Lazy Initialization
```typescript
// Don't initialize bot until needed
if (config.botToken && config.chatId) {
  await commandManager.initializeBot();  // Only if configured
}
```

### 2. Debounced File Watching
```typescript
// Process only last 5 items
for (const item of data.slice(-5)) {
  await this.forwardQoderItem(item);
}
```

### 3. Interval-Based Cleanup
```typescript
// Clean expired mappings every 60s (not every callback)
this.cleanupInterval = setInterval(() => {
  this.cleanupExpiredMappings();
}, 60000);
```

### 4. Conditional Logging
```typescript
// Debug logs only when needed
if (cleanedCount > 0) {
  this.logger.debug(`Cleaned up ${cleanedCount} mappings`);
}
```

---

## 🔒 Security Design

### 1. Secret Storage Fallback
```typescript
// Try secure storage first
try {
  await (vscode as any).secrets?.store(secretKey, token);
} catch {
  // Fallback to settings (less secure but works)
  await this.config.update('botToken', token);
}
```

### 2. Chat ID Validation
```typescript
// Reject callbacks from unauthorized chats
if (callbackQuery.message.chat.id.toString() !== this.chatId) {
  this.bot?.answerCallbackQuery(callbackQuery.id, {
    text: 'Unauthorized',
    show_alert: true
  });
  return;
}
```

### 3. Credential Masking
```typescript
// Never log credentials
maskProxyUrl(url: string): string {
  urlObj.password = '***';
  urlObj.username = '***';
  return urlObj.toString();
}
```

---

## 📐 Code Organization Principles

### 1. Single Responsibility
- Each class has one clear purpose
- Logger: Only logging
- ConfigManager: Only configuration
- TelegramBotService: Only Telegram API

### 2. Dependency Injection
- Dependencies passed via constructor
- Easy to mock for testing
- Clear dependency graph

### 3. Interface Segregation
- Small, focused interfaces
- ProxyConfig: Only proxy fields
- ButtonMapping: Only button fields

### 4. Open/Closed Principle
- Open for extension, closed for modification
- Add new commands without changing existing code
- Add new config fields without breaking validation

---

## 🎯 Future Improvements

### 1. Notification Interception
**Current:** Manual commands only  
**Future:** Hook into VS Code notification API  
**Challenge:** VS Code doesn't expose this API

### 2. Message Queue
**Current:** Direct send (might fail if offline)  
**Future:** Queue messages, retry on failure  
**Benefit:** No lost notifications

### 3. Multiple Chat IDs
**Current:** Single chat ID  
**Future:** Support multiple recipients  
**Use Case:** Team notifications

### 4. Custom Formatting
**Current:** Fixed format  
**Future:** User-defined templates  
**Benefit:** Flexibility

### 5. Analytics
**Current:** Simple counter  
**Future:** Detailed statistics  
- Notifications by type
- Button click rates
- Peak usage times
