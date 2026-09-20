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
proxyManager = new ProxyManager(logger);
messageFormatter = new MessageFormatter(config.maxMessageLength);
telegramBot = new TelegramBotService(logger, messageFormatter);

// Services injected into dependent modules
notificationInterceptor = new NotificationInterceptor(
  logger,           // Logging
  telegramBot,      // Telegram API
  configManager     // Config access
);

commandManager = new CommandManager(
  logger,                   // Logging
  configManager,            // Config access
  telegramBot,              // Telegram API
  notificationInterceptor   // Notification routing
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
  if (!config.chatId) {
    return { valid: false, message: 'Chat ID is not configured...' };
  }
  if (!config.enabled) {
    return { valid: false, message: 'Telegram notifications are disabled...' };
  }
  // Proxy validation if enabled
  if (config.proxyEnabled) {
    // Validate proxyUrl or individual fields
  }
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
  createdAt: Date.now(),
  targetUserId: 123456789  // Optional: restrict to specific user
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
- ✅ User authorization via targetUserId

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
  
  // Priority 2: Use individual settings
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
// Workspace files
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceRoot, '**/.qoder/**/*.json')
);

watcher.onDidCreate((uri) => {
  this.processQoderFile(uri);  // Handle new file
});

watcher.onDidChange((uri) => {
  this.processQoderFile(uri);  // Handle update
});

// Transcript files (global)
const transcriptRoot = path.join(os.homedir(), '.qoder', 'projects');
const transcriptWatcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(transcriptRoot, '**/*.jsonl')
);

// Cleanup on dispose
this.disposables.push(watcher);
```

**Benefits:**
- ✅ Event-driven (no polling overhead)
- ✅ Real-time detection
- ✅ Automatic cleanup

**Trade-offs:**
- ❌ Only detects file changes, not in-memory updates
- ❌ Might miss rapid changes (no debouncing)

---

### 6. VS Code API Monkey-Patching
**Decision:** Patch VS Code window methods to intercept notifications

**Rationale:**
- VS Code doesn't provide API to intercept all notifications
- Monkey-patching allows bidirectional sync
- Transparent to users and other extensions

**Implementation:**
```typescript
private patchWindowNotification(methodName: 'showInformationMessage' | ..., severity: MessageType): void {
  const windowApi = vscode.window as any;
  const original = windowApi[methodName];

  // Store original
  this.originalShowInformationMessage = original;

  const interceptor = this;
  const patched = function patchedShowMessage(this: unknown, message: string, ...args: any[]) {
    const buttons = interceptor.extractButtons(args);
    const originalPromise = original.call(this, message, ...args);

    if (buttons.length > 0) {
      // Forward to Telegram with buttons
      const telegramPromise = interceptor.forwardSelectableNotification(...);
      
      // Return first response (VS Code or Telegram)
      return Promise.race([
        originalPromise,
        telegramPromise.then((selectedTitle) => interceptor.findSelectedButton(args, selectedTitle))
      ]);
    }

    // Forward without buttons
    interceptor.forwardNotification(message, severity, 'VS Code Notification');
    return originalPromise;
  };

  // Patch with fallback
  try {
    windowApi[methodName] = patched;
  } catch {
    Object.defineProperty(windowApi, methodName, {
      configurable: true,
      writable: true,
      value: patched,
    });
  }
}

// Restore on dispose
if (this.originalShowInformationMessage) {
  windowApi.showInformationMessage = this.originalShowInformationMessage;
}
```

**Benefits:**
- ✅ Transparent interception
- ✅ Bidirectional sync (VS Code ↔ Telegram)
- ✅ Works with all extensions

**Trade-offs:**
- ❌ May break with VS Code updates
- ❌ Requires careful restore on dispose
- ❌ Potential conflicts with other patching extensions

---

### 7. File-Based Mutex for Multi-Instance
**Decision:** Use file-based mutex to coordinate polling across VS Code instances

**Rationale:**
- Telegram Bot API allows only one polling instance
- Users often have multiple VS Code windows open
- Prevents "409 Conflict" errors

**Implementation:**
```typescript
// Lock file: /tmp/vscode-telegram-bot.lock
async tryAcquire(): Promise<boolean> {
  if (fs.existsSync(this.lockFilePath)) {
    const lockData = JSON.parse(fs.readFileSync(this.lockFilePath, 'utf-8'));
    const ageMs = Date.now() - new Date(lockData.timestamp).getTime();

    // Stale lock (> 5 min) → take over
    if (ageMs > 5 * 60 * 1000) {
      return this.acquireLock();
    }

    // Active lock → don't poll
    return false;
  }

  // No lock → acquire
  return this.acquireLock();
}

// Heartbeat: update timestamp every 60s
private startCleanupInterval(): void {
  this.cleanupInterval = setInterval(() => {
    if (lockData.pid === process.pid) {
      lockData.timestamp = new Date().toISOString();
      fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData));
    }
  }, 60 * 1000);
}

// Release on shutdown
release(): void {
  if (fs.existsSync(this.lockFilePath)) {
    fs.unlinkSync(this.lockFilePath);
  }
}
```

**Benefits:**
- ✅ Prevents 409 conflicts
- ✅ Handles stale locks (crash recovery)
- ✅ Cross-process coordination

**Trade-offs:**
- ❌ File I/O overhead (minimal)
-  Requires cleanup on crash

---

## 🎨 Design Patterns Used

### 1. Singleton Pattern
**Where:** Logger, ConfigManager, module-level variables

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
**Where:** Configuration changes, file watchers, Telegram events

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

// Observer: Listen for Telegram messages
this.bot.on('message', (msg) => this.handleMessage(msg));
this.bot.on('callback_query', (callbackQuery) => this.handleCallbackQuery(callbackQuery));
```

---

### 4. Strategy Pattern
**Where:** Message formatting, severity handling, transcript processing

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

// Strategy: Transcript record processing
private buildTranscriptPayload(record: TranscriptRecord, sessionMode: string) {
  if (record.type === 'user') {
    // Handle user prompt
  } else if (record.type === 'assistant') {
    // Handle assistant response
  } else if (record.type === 'progress') {
    // Handle progress update
  }
}
```

---

### 5. Disposable Pattern
**Where:** All resources (watchers, intervals, channels, commands)

**Why:** Prevent memory leaks

```typescript
// Collect all disposables
private disposables: vscode.Disposable[] = [];

// Add resources
this.disposables.push(watcher);
this.disposables.push(interval);
this.disposables.push(outputChannel);
this.disposables.push(commandRegistration);

// Cleanup on deactivate
export function deactivate() {
  if (qoderIntegration) qoderIntegration.dispose();
  if (telegramBot) telegramBot.shutdown();
  if (notificationInterceptor) notificationInterceptor.dispose();
  if (commandManager) commandManager.dispose();
  if (logger) logger.dispose();
}
```

---

### 6. Promise.race Pattern (Bidirectional Sync)
**Where:** notificationInterceptor for VS Code ↔ Telegram sync

**Why:** Return first response from either VS Code UI or Telegram

```typescript
// VS Code showInputBox intercepted
const originalPromise = original.call(this, ...args);
const telegramPromise = interceptor.forwardPrompt(message, targetUserId);

// Return whichever responds first
return Promise.race([originalPromise, telegramPromise]).then((value) => {
  // Validate if from Telegram
  if (typeof value === 'string' && typeof options.validateInput === 'function') {
    const validation = options.validateInput(value);
    if (validation) {
      return undefined;  // Reject invalid input
    }
  }
  return value;
});
```

**Benefits:**
- ✅ Transparent to user
- ✅ Works with both VS Code and Telegram
- ✅ Timeout handling (Telegram has 5min timeout)

---

### 7. State Machine Pattern (Transcript Processing)
**Where:** QoderIntegration transcript state tracking

**Why:** Track processed lines, deduplicate, maintain session context

```typescript
interface TranscriptState {
  lineCount: number;           // Track processed lines
  seenIds: Set<string>;        // Deduplication (max 500)
  mode?: 'agent' | 'ask' | 'plan' | 'debug';  // Session mode
}

// State per transcript file
private transcriptStates: Map<string, TranscriptState> = new Map();

// Update state after processing
state.lineCount = lines.length;
this.transcriptStates.set(uri.fsPath, state);

// Trim seenIds to prevent memory growth
if (state.seenIds.size > 500) {
  state.seenIds = new Set(Array.from(state.seenIds).slice(-250));
}
```

---

## 🔄 Data Flow Patterns

### 1. Notification Flow (Direct)
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

### 2. Notification Flow (Intercepted)
```
Extension calls vscode.window.showInformationMessage()
  ↓
Patched method intercepts
  ├─ Extract buttons from args
  ├─ Call original VS Code method
  └─ Parallel: forward to Telegram
  ↓
Promise.race([
  originalPromise,      // VS Code UI response
  telegramPromise       // Telegram button click
])
  ↓
First response wins
  ↓
Return to caller
```

---

### 3. Button Callback Flow
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
User Authorization (if targetUserId set)
  └─ From authorized user? → No: Reject
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

### 4. Prompt/Reply Flow
```
Extension calls vscode.window.showInputBox()
  ↓
Patched method intercepts
  ↓
telegramBot.sendPromptAndWaitForReply()
  ├─ Store pendingPrompt callback
  ├─ Store promptTargetUserId
  └─ Send message to Telegram
  ↓
User replies in Telegram chat
  ↓
telegramBot.handleMessage()
  ├─ Validate targetUserId
  └─ Call pendingPrompt(replyText)
  ↓
Promise.race resolves with reply
  ├─ Validate input (if validateInput provided)
  └─ Return to caller
```

---

### 5. Setup Wizard Flow
```
User runs: "Telegram Notify: Setup Bot"
  ↓
Step 1: Get Bot Token
  ├─ Show input box
  ├─ Validate format (regex: /^\d+:[A-Za-z0-9_-]+$/)
  └─ Store in secrets (or settings)
  ↓
Step 2: Get Chat ID
  ├─ Show input box
  ├─ Explain how to get chat ID
  └─ Store in settings
  ↓
Step 3: Enable Notifications
  ├─ Ask: Enable now?
  └─ Update config
  ↓
Step 4: Configure Proxy (optional)
  ├─ Ask: Enable proxy?
  ├─ Yes: Get proxyUrl
  │   ├─ Validate URL format
  │   └─ Store proxyUrl + enable
  └─ No: Disable proxy
  ↓
Step 5: Initialize Bot
  ├─ BotMutex.tryAcquire()
  ├─ Create bot with proxy (if enabled)
  ├─ Test connection (getMe)
  └─ Update status bar
  ↓
Step 6: Send Test Message
  ├─ Ask: Send test?
  └─ Send test message
  ↓
Complete
  └─ Show success message
```

---

### 6. Qoder Transcript Flow
```
Qoder writes to ~/.qoder/projects/**/*.jsonl
  ↓
File watcher triggers
  ↓
processQoderTranscript()
  ├─ Read file content
  ├─ Split into lines
  ├─ Get state (lineCount, seenIds)
  └─ Determine start index (skip processed)
  ↓
For each new line:
  ├─ Parse JSON
  ├─ Check uuid (skip if seen)
  ├─ Add to seenIds
  └─ Process by type:
     ├─ session_meta → Extract mode, forward session start
     ├─ user → Extract prompt text, forward with action buttons
     ├─ assistant → Extract response, detect errors/progress, forward
     └─ progress → Extract progress info, forward
  ↓
Update state
  ├─ lineCount = lines.length
  └─ Trim seenIds if > 500
  ↓
Store state
```

---

### 7. Multi-Instance Polling Flow
```
Extension activates
  ↓
BotMutex.tryAcquire()
  ├─ Check lock file exists?
  │   ├─ Yes: Check age
  │   │   ├─ < 5 min → Return false (don't poll)
  │   │   └─ > 5 min → Stale, acquire lock
  │   └─ No: Acquire lock
  ↓
telegramBot.initialize()
  ├─ If hasPollingLock → Enable polling
  │   └─ botOptions.polling = { interval: 1000, ... }
  └─ If no lock → polling = false (send-only)
  ↓
Heartbeat (every 60s)
  └─ Update lock timestamp
  ↓
Extension deactivates
  ↓
BotMutex.release()
  └─ Remove lock file
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
// Process only last 5 items from array
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

### 5. Transcript State Caching
```typescript
// Cache state per transcript file
private transcriptStates: Map<string, TranscriptState> = new Map();

// Skip already processed lines
const startIndex = state.lineCount;
const recordsToProcess = lines.slice(startIndex);
```

### 6. Multi-Instance Optimization
```typescript
// Only one instance polls (reduces API load)
if (this.hasPollingLock) {
  botOptions.polling = true;
} else {
  botOptions.polling = false;  // Send-only mode
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

### 3. User Authorization (targetUserId)
```typescript
// Verify callback from intended user
if (mapping.targetUserId && callbackQuery.from.id !== mapping.targetUserId) {
  this.bot.answerCallbackQuery(callbackQuery.id, {
    text: '⚠️ Only the intended recipient can interact',
    show_alert: true
  });
  return;
}
```

### 4. Credential Masking
```typescript
// Never log credentials
maskProxyUrl(url: string): string {
  urlObj.password = '***';
  urlObj.username = '***';
  return urlObj.toString();
}
```

### 5. Prompt User Validation
```typescript
// Verify message from target user
if (this.promptTargetUserId && msg.from.id !== this.promptTargetUserId) {
  this.bot?.sendMessage(msg.chat.id, '⚠️ Only intended recipient can reply');
  return;
}
```

---

## 📐 Code Organization Principles

### 1. Single Responsibility
- Each class has one clear purpose
- Logger: Only logging
- ConfigManager: Only configuration
- TelegramBotService: Only Telegram API
- ButtonHandler: Only button callbacks
- NotificationInterceptor: Only API patching and routing

### 2. Dependency Injection
- Dependencies passed via constructor
- Easy to mock for testing
- Clear dependency graph

### 3. Interface Segregation
- Small, focused interfaces
- ProxyConfig: Only proxy fields
- ButtonMapping: Only button fields
- FormattedMessage: Only message fields

### 4. Open/Closed Principle
- Open for extension, closed for modification
- Add new commands without changing existing code
- Add new config fields without breaking validation

---

## 🎯 Future Improvements

### 1. Notification Interception Stability
**Current:** Monkey-patching VS Code APIs  
**Future:** Use official API if exposed  
**Challenge:** VS Code doesn't expose notification API

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
- Response times (Telegram vs VS Code)

### 6. QuickPick Improvements
**Current:** Max 30 items, no multi-select  
**Future:** Pagination, multi-select support  
**Challenge:** Telegram button limitations

### 7. Transcript Enhancement
**Current:** Basic parsing  
**Future:** Rich formatting, code block detection, tool use tracking  
**Benefit:** Better Qoder integration
