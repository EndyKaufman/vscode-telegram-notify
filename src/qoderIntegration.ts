import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { Logger } from './logger';
import { TelegramBotService } from './telegramBot';
import { ConfigManager } from './configManager';
import { MessageType, ExtendedMessageItem } from './types';
import { NotificationInterceptor } from './notificationInterceptor';

interface TranscriptState {
  lineCount: number;
  seenIds: Set<string>;
  mode?: 'agent' | 'ask' | 'plan' | 'debug';
}

interface TranscriptRecord {
  type: 'session_meta' | 'user' | 'assistant' | 'progress' | string;
  sessionId?: string;
  uuid?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  data?: {
    meta_type?: string;
    content?: any;
    type?: string;
    hookEvent?: string;
    hookName?: string;
    command?: string;
    session_type?: string;
    mode?: string;
  };
  toolUseResult?: string;
  [key: string]: any;
}

/**
 * Qoder Integration - Intercepts and forwards Qoder agent chat notifications
 *
 * This module captures:
 * - Agent prompts and responses
 * - Task completion notifications
 * - Error messages from Qoder agents
 * - Progress updates
 * - Qoder transcript updates from chat / quest sessions
 */
export class QoderIntegration {
  private logger: Logger;
  private telegramBot: TelegramBotService;
  private configManager: ConfigManager;
  private notificationInterceptor: NotificationInterceptor;
  private disposables: vscode.Disposable[] = [];
  private isWatching: boolean = false;
  private transcriptStates: Map<string, TranscriptState> = new Map();

  constructor(
    logger: Logger,
    telegramBot: TelegramBotService,
    configManager: ConfigManager,
    notificationInterceptor: NotificationInterceptor
  ) {
    this.logger = logger;
    this.telegramBot = telegramBot;
    this.configManager = configManager;
    this.notificationInterceptor = notificationInterceptor;
  }

  /**
   * Initialize Qoder integration
   */
  initialize(): void {
    this.logger.info('Initializing Qoder integration');

    // Watch for Qoder-related notifications
    this.watchQoderNotifications();

    // Register manual trigger commands and deeplink actions
    this.registerCommands();

    // Watch for Qoder sidebar and transcript updates
    this.watchQoderSidebar();

    this.logger.info('Qoder integration initialized');
  }

  /**
   * Watch for Qoder sidebar notifications, prompts, and transcript updates
   */
  private watchQoderSidebar(): void {
    this.watchWorkspaceQoderFiles();
    this.watchQoderTranscriptFiles();
    this.watchGlobalQoderStorage();
  }

  /**
   * Watch workspace-local Qoder files
   */
  private watchWorkspaceQoderFiles(): void {
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

    const sidebarPatterns = [
      '**/.qoder/**/*.json',
      '**/.qoder/**/*.jsonl',
      '**/.qoder/**/*.log',
      '**/.qoder/**/notifications*',
      '**/.qoder/**/prompts*',
      '**/.qoder/**/chat*',
      '**/.qoder/**/messages*',
      '**/.qoder/**/transcript*',
    ];

    for (const pattern of sidebarPatterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, pattern)
      );

      watcher.onDidCreate((uri) => {
        this.logger.info(`Qoder file created: ${uri.fsPath}`);
        void this.processQoderPath(uri, true);
      });

      watcher.onDidChange((uri) => {
        this.logger.debug(`Qoder file changed: ${uri.fsPath}`);
        void this.processQoderPath(uri, false);
      });

      this.disposables.push(watcher);
    }
  }

  /**
   * Watch Qoder transcript files in the user profile directory.
   * Qoder docs describe transcript JSONL files at ~/.qoder/projects/<project>/transcript/<session-id>.jsonl.
   */
  private watchQoderTranscriptFiles(): void {
    const transcriptRoot = path.join(os.homedir(), '.qoder', 'projects');
    this.transcriptStates.clear();
    this.logger.info(`Watching Qoder transcripts under ${transcriptRoot}`);

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(transcriptRoot, '**/*.jsonl')
    );

    watcher.onDidCreate((uri) => {
      this.logger.info(`Qoder transcript created: ${uri.fsPath}`);
      void this.processQoderTranscript(uri, true);
    });

    watcher.onDidChange((uri) => {
      this.logger.debug(`Qoder transcript changed: ${uri.fsPath}`);
      void this.processQoderTranscript(uri, false);
    });

    this.disposables.push(watcher);
  }

  /**
   * Process Qoder file and forward notifications
   */
  private async processQoderPath(uri: vscode.Uri, isNewFile: boolean): Promise<void> {
    try {
      const fileName = uri.fsPath.toLowerCase();

      if (fileName.endsWith('.jsonl') || fileName.includes(`${path.sep}transcript${path.sep}`)) {
        await this.processQoderTranscript(uri, isNewFile);
        return;
      }

      // Skip if not a notification/prompt file
      if (!fileName.includes('notification') &&
          !fileName.includes('prompt') &&
          !fileName.includes('chat') &&
          !fileName.includes('message')) {
        return;
      }

      // Read file content
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf-8');

      // Try to parse as JSON
      try {
        const data = JSON.parse(text);

        // Handle array of notifications
        if (Array.isArray(data)) {
          for (const item of data.slice(-5)) {
            await this.forwardQoderItem(item, uri.fsPath);
          }
        }
        // Handle single notification
        else if (data.message || data.content || data.text) {
          await this.forwardQoderItem(data, uri.fsPath);
        }
      } catch {
        // Not JSON - forward as text if it looks like a notification
        if (text.length > 10 && text.length < 5000) {
          await this.forwardNotification(
            `📝 Qoder Sidebar Update\n\n\`\`\`\n${text.substring(0, 1000)}\n\`\`\``,
            MessageType.Information,
            'Qoder Sidebar',
            this.buildActionButtons(text.substring(0, 1000), 'agent')
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process Qoder file: ${uri.fsPath}`, error);
    }
  }

  /**
   * Process Qoder transcript JSONL file and forward new records only.
   */
  private async processQoderTranscript(uri: vscode.Uri, isNewFile: boolean): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf-8');
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

      if (lines.length === 0) {
        return;
      }

      const state = this.transcriptStates.get(uri.fsPath) ?? {
        lineCount: 0,
        seenIds: new Set<string>()
      };

      const fileWasTruncated = lines.length < state.lineCount;
      const startIndex = (isNewFile || fileWasTruncated) ? Math.max(0, lines.length - 5) : state.lineCount;
      const recordsToProcess = lines.slice(startIndex);

      for (const line of recordsToProcess) {
        let record: TranscriptRecord;

        try {
          record = JSON.parse(line) as TranscriptRecord;
        } catch (error) {
          this.logger.debug(`Skipping non-JSON transcript line in ${uri.fsPath}`);
          continue;
        }

        if (record.uuid && state.seenIds.has(record.uuid)) {
          continue;
        }

        if (record.uuid) {
          state.seenIds.add(record.uuid);
        }

        if (state.seenIds.size > 500) {
          state.seenIds = new Set(Array.from(state.seenIds).slice(-250));
        }

        if (record.type === 'session_meta') {
          const mode = this.getTranscriptMode(record);
          if (mode) {
            state.mode = mode;
          }

          if (isNewFile) {
            const summary = this.describeTranscriptSession(record);
            await this.forwardNotification(
              summary,
              MessageType.Information,
              'Qoder Transcript',
              this.buildActionButtons(summary, mode ?? 'agent')
            );
          }

          continue;
        }

        await this.forwardTranscriptRecord(record, uri.fsPath, state.mode ?? 'agent');
      }

      state.lineCount = lines.length;
      this.transcriptStates.set(uri.fsPath, state);
    } catch (error) {
      this.logger.error(`Failed to process Qoder transcript: ${uri.fsPath}`, error);
    }
  }

  /**
   * Forward a single transcript record to Telegram.
   */
  private async forwardTranscriptRecord(
    record: TranscriptRecord,
    source: string,
    sessionMode: 'agent' | 'ask' | 'plan' | 'debug' = 'agent'
  ): Promise<void> {
    const payload = this.buildTranscriptPayload(record, sessionMode);

    if (!payload) {
      return;
    }

    await this.forwardNotification(
      payload.message,
      payload.severity,
      payload.source,
      payload.buttons
    );
  }

  /**
   * Build the Telegram message for a transcript record.
   */
  private buildTranscriptPayload(
    record: TranscriptRecord,
    sessionMode: 'agent' | 'ask' | 'plan' | 'debug'
  ): {
    message: string;
    severity: MessageType;
    source: string;
    buttons: ExtendedMessageItem[];
  } | null {
    const modeLabel = sessionMode.charAt(0).toUpperCase() + sessionMode.slice(1);
    const source = `Qoder ${modeLabel}`;

    if (record.type === 'user') {
      const prompt = this.extractTranscriptText(record);
      if (!prompt) {
        return null;
      }

      const recommendations = this.extractActionCards(prompt);
      const buttons = recommendations.length > 0
        ? this.buildPromptButtons(prompt, sessionMode, recommendations)
        : this.buildActionButtons(prompt, sessionMode);

      return {
        message: `💬 Qoder ${modeLabel} Prompt\n\n${this.truncateForTelegram(prompt, 2000)}`,
        severity: MessageType.Information,
        source,
        buttons
      };
    }

    if (record.type === 'assistant') {
      const response = this.extractTranscriptText(record);
      if (!response) {
        return null;
      }

      const todoCards = this.extractActionCards(response);
      const isError = /error|failed|failure|exception|cannot|unable/i.test(response);
      const isProgress = /progress|running|applying|generating|waiting|queued/i.test(response);
      const isReview = /review code changes|view changes|accept or reject|diff/i.test(response);

      const severity = isError
        ? MessageType.Error
        : isProgress || isReview
          ? MessageType.Warning
          : MessageType.Information;

      const headline = isReview
        ? '🧾 Qoder Review Ready'
        : todoCards.length > 0
          ? '🗒️ Qoder To-dos'
          : isProgress
            ? '⏳ Qoder Progress'
            : '🤖 Qoder Response';

      const buttons = todoCards.length > 0
        ? this.buildPromptButtons(response, sessionMode, todoCards)
        : this.buildActionButtons(response, sessionMode);

      return {
        message: `${headline}\n\n${this.truncateForTelegram(response, 2000)}`,
        severity,
        source,
        buttons
      };
    }

    if (record.type === 'progress') {
      const progressText = this.describeProgressRecord(record);
      if (!progressText) {
        return null;
      }

      return {
        message: `⏳ Qoder Progress\n\n${this.truncateForTelegram(progressText, 2000)}`,
        severity: MessageType.Information,
        source,
        buttons: this.buildActionButtons(progressText, sessionMode)
      };
    }

    return null;
  }

  /**
   * Forward an arbitrary Qoder item from a JSON / log file.
   */
  private async forwardQoderItem(item: any, source: string): Promise<void> {
    const rawMessage = typeof item === 'string'
      ? item
      : item?.message || item?.content || item?.text || JSON.stringify(item, null, 2);

    const message = String(rawMessage);
    const type = String(item?.type || 'notification').toLowerCase();
    const mode = (item?.mode || item?.sessionMode || 'agent') as 'agent' | 'ask' | 'plan' | 'debug';
    const recommendations = this.extractActionCards(message);

    let emoji = '📝';
    let severity = MessageType.Information;

    if (type.includes('error') || /error|failed|failure|exception/i.test(message)) {
      emoji = '🚨';
      severity = MessageType.Error;
    } else if (type.includes('warning') || type.includes('warn')) {
      emoji = '⚠️';
      severity = MessageType.Warning;
    } else if (type.includes('prompt')) {
      emoji = '💬';
    } else if (type.includes('response')) {
      emoji = '🤖';
    } else if (type.includes('progress')) {
      emoji = '⏳';
    }

    const buttons = recommendations.length > 0
      ? this.buildPromptButtons(message, mode, recommendations)
      : this.buildActionButtons(message, mode);

    await this.forwardNotification(
      `${emoji} Qoder Sidebar ${type}

${this.truncateForTelegram(message, 2000)}`,
      severity,
      'Qoder Sidebar',
      buttons
    );
  }

  /**
   * Watch global storage for Qoder data.
   */
  private watchGlobalQoderStorage(): void {
    const extensions = vscode.extensions.all;

    for (const ext of extensions) {
      if (ext.id.toLowerCase().includes('qoder')) {
        this.logger.info(`Found Qoder extension: ${ext.id}`);

        const extWatcher = vscode.extensions.onDidChange(() => {
          this.logger.debug('Extensions changed - checking for Qoder updates');
        });

        this.disposables.push(extWatcher);
      }
    }
  }

  /**
   * Watch for Qoder notifications using VS Code APIs
   */
  private watchQoderNotifications(): void {
    this.watchTerminalOutput();
    this.watchOutputChannels();
    this.isWatching = true;
  }

  /**
   * Watch terminal output for Qoder-related messages
   */
  private watchTerminalOutput(): void {
    const terminalListener = vscode.window.onDidOpenTerminal((terminal) => {
      const terminalName = terminal.name.toLowerCase();

      if (terminalName.includes('qoder') ||
          terminalName.includes('agent') ||
          terminalName.includes('quest')) {

        this.logger.info(`Detected Qoder terminal: ${terminal.name}`);

        void this.forwardNotification(
          `🤖 Qoder Terminal Opened: ${terminal.name}`,
          MessageType.Information,
          'Qoder Integration',
          this.buildActionButtons(`Qoder terminal opened: ${terminal.name}`, 'agent')
        );
      }
    });

    this.disposables.push(terminalListener);
  }

  /**
   * Watch output channels for Qoder messages
   */
  private watchOutputChannels(): void {
    this.logger.info('Watching for Qoder output channels');
  }

  /**
   * Watch for file changes in Qoder-related directories
   */
  private watchQoderFiles(): void {
    this.watchWorkspaceQoderFiles();
  }

  /**
   * Register manual trigger commands and deeplink helpers
   */
  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.forwardPrompt',
        () => this.handleForwardPrompt()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.forwardAgentTask',
        () => this.handleForwardAgentTask()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.forwardCompletion',
        () => this.handleForwardCompletion()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.customMessage',
        () => this.handleCustomMessage()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.openChat',
        async (text: string, mode: 'agent' | 'ask' = 'agent') => {
          await this.openQoderChat(text, mode);
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.openQuest',
        async (text: string, agentClass: 'LocalAgent' | 'LocalWorktree' | 'RemoteAgent' = 'LocalAgent') => {
          await this.openQoderQuest(text, agentClass);
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.copyToClipboard',
        async (text: string) => {
          await this.copyToClipboard(text);
        }
      )
    );

    this.logger.info('Qoder commands registered');
  }

  /**
   * Handle manual prompt forwarding.
   */
  private async handleForwardPrompt(): Promise<void> {
    const prompt = await vscode.window.showInputBox({
      prompt: 'Enter Qoder prompt to forward to Telegram',
      placeHolder: 'e.g., Refactor the authentication module',
      ignoreFocusOut: true,
      validateInput: (value) => {
        return value && value.trim().length > 0 ? null : 'Prompt is required';
      }
    });

    if (!prompt) {
      return;
    }

    await this.forwardNotification(
      `💬 Qoder Prompt:\n\n${prompt}`,
      MessageType.Information,
      'Qoder Integration',
      this.buildActionButtons(prompt, 'agent')
    );

    vscode.window.showInformationMessage('Prompt forwarded to Telegram');
  }

  /**
   * Handle agent task forwarding.
   */
  private async handleForwardAgentTask(): Promise<void> {
    const taskType = await vscode.window.showQuickPick(
      [
        { label: '🔨 Build Task', description: 'Build and compile' },
        { label: '🧪 Test Task', description: 'Run tests' },
        { label: '🚀 Deploy Task', description: 'Deploy application' },
        { label: '📦 Package Task', description: 'Package application' },
        { label: '🔍 Analysis Task', description: 'Code analysis' },
        { label: '✨ Custom Task', description: 'Custom agent task' }
      ],
      {
        placeHolder: 'Select Qoder agent task type'
      }
    );

    if (!taskType) {
      return;
    }

    const details = await vscode.window.showInputBox({
      prompt: `Enter details for ${taskType.label}`,
      placeHolder: 'Task description...',
      ignoreFocusOut: true
    });

    if (!details) {
      return;
    }

    const message =
      `🤖 Qoder Agent Task\n\n` +
      `**Type:** ${taskType.label}\n` +
      `**Description:** ${details}\n` +
      `**Status:** Queued`;

    await this.forwardNotification(
      message,
      MessageType.Warning,
      'Qoder Integration',
      this.buildActionButtons(details, 'agent')
    );

    vscode.window.showInformationMessage('Agent task forwarded to Telegram');
  }

  /**
   * Handle completion notification.
   */
  private async handleForwardCompletion(): Promise<void> {
    const completionType = await vscode.window.showQuickPick(
      [
        { label: '✅ Success', description: 'Task completed successfully' },
        { label: '❌ Failed', description: 'Task failed' },
        { label: '⚠️ Warning', description: 'Completed with warnings' }
      ],
      {
        placeHolder: 'Select completion status'
      }
    );

    if (!completionType) {
      return;
    }

    const summary = await vscode.window.showInputBox({
      prompt: 'Enter completion summary',
      placeHolder: 'What was accomplished?',
      ignoreFocusOut: true
    });

    if (!summary) {
      return;
    }

    const messageType = completionType.label.includes('Success') ? MessageType.Information :
                       completionType.label.includes('Failed') ? MessageType.Error :
                       MessageType.Warning;

    const emoji = completionType.label.includes('Success') ? '✅' :
                 completionType.label.includes('Failed') ? '❌' : '⚠️';

    const buttons = completionType.label.includes('Failed') ? [
      {
        title: '🚀 Open Quest',
        command: { id: 'telegram-notify.qoder.openQuest', arguments: [summary] }
      },
      {
        title: '💬 Open Chat',
        command: { id: 'telegram-notify.qoder.openChat', arguments: [summary, 'agent'] }
      },
      {
        title: '📋 Copy',
        command: { id: 'telegram-notify.qoder.copyToClipboard', arguments: [summary] }
      }
    ] : [
      {
        title: '🚀 Open Quest',
        command: { id: 'telegram-notify.qoder.openQuest', arguments: [summary] }
      },
      {
        title: '💬 Open Chat',
        command: { id: 'telegram-notify.qoder.openChat', arguments: [summary, 'agent'] }
      },
      {
        title: '📋 Copy',
        command: { id: 'telegram-notify.qoder.copyToClipboard', arguments: [summary] }
      }
    ];

    await this.forwardNotification(
      `${emoji} Qoder Task Completed\n\n` +
      `**Status:** ${completionType.label}\n` +
      `**Summary:** ${summary}\n` +
      `**Time:** ${new Date().toLocaleString()}`,
      messageType,
      'Qoder Integration',
      buttons
    );

    vscode.window.showInformationMessage('Completion notification sent to Telegram');
  }

  /**
   * Handle custom message.
   */
  private async handleCustomMessage(): Promise<void> {
    const messageType = await vscode.window.showQuickPick(
      [
        { label: '🚨 Error', description: 'Error message', severity: MessageType.Error },
        { label: '⚠️ Warning', description: 'Warning message', severity: MessageType.Warning },
        { label: 'ℹ️ Information', description: 'Info message', severity: MessageType.Information }
      ],
      {
        placeHolder: 'Select message type'
      }
    );

    if (!messageType) {
      return;
    }

    const message = await vscode.window.showInputBox({
      prompt: 'Enter custom message',
      placeHolder: 'Your message...',
      ignoreFocusOut: true,
      validateInput: (value) => {
        return value && value.trim().length > 0 ? null : 'Message is required';
      }
    });

    if (!message) {
      return;
    }

    await this.forwardNotification(
      `📢 Custom Qoder Message\n\n${message}`,
      (messageType as any).severity || MessageType.Information,
      'Qoder Integration',
      this.buildActionButtons(message, 'agent')
    );

    vscode.window.showInformationMessage('Custom message sent to Telegram');
  }

  /**
   * Forward notification to Telegram
   */
  private async forwardNotification(
    message: string,
    severity: MessageType,
    source?: string,
    buttons?: ExtendedMessageItem[]
  ): Promise<void> {
    try {
      await this.notificationInterceptor.forwardNotification(
        message,
        severity,
        source,
        buttons
      );
    } catch (error) {
      this.logger.error('Failed to forward Qoder notification', error);
      vscode.window.showErrorMessage('Failed to send notification to Telegram');
    }
  }

  /**
   * Open Qoder chat with a deeplink.
   */
  private async openQoderChat(text: string, mode: 'agent' | 'ask' = 'agent'): Promise<void> {
    const prompt = text?.trim();
    if (!prompt) {
      return;
    }

    const url = this.buildQoderChatDeeplink(prompt, mode);
    this.logger.info(`Opening Qoder chat deeplink: ${url}`);
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /**
   * Open Qoder quest with a deeplink.
   */
  private async openQoderQuest(
    text: string,
    agentClass: 'LocalAgent' | 'LocalWorktree' | 'RemoteAgent' = 'LocalAgent'
  ): Promise<void> {
    const prompt = text?.trim();
    if (!prompt) {
      return;
    }

    const url = this.buildQoderQuestDeeplink(prompt, agentClass);
    this.logger.info(`Opening Qoder quest deeplink: ${url}`);
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /**
   * Copy text to clipboard.
   */
  private async copyToClipboard(text: string): Promise<void> {
    const value = text?.trim();
    if (!value) {
      return;
    }

    await vscode.env.clipboard.writeText(value);
    vscode.window.showInformationMessage('Copied Qoder text to clipboard');
  }

  /**
   * Build a Qoder chat deeplink.
   */
  private buildQoderChatDeeplink(text: string, mode: 'agent' | 'ask' = 'agent'): string {
    const url = new URL('qoder://aicoding.aicoding-deeplink/chat');
    url.searchParams.set('text', text);
    url.searchParams.set('mode', mode);
    return url.toString();
  }

  /**
   * Build a Qoder quest deeplink.
   */
  private buildQoderQuestDeeplink(
    text: string,
    agentClass: 'LocalAgent' | 'LocalWorktree' | 'RemoteAgent' = 'LocalAgent'
  ): string {
    const url = new URL('qoder://aicoding.aicoding-deeplink/quest');
    url.searchParams.set('text', text);
    url.searchParams.set('agentClass', agentClass);
    return url.toString();
  }

  /**
   * Build generic action buttons for a Qoder-related message.
   */
  private buildActionButtons(
    text: string,
    mode: 'agent' | 'ask' | 'plan' | 'debug' = 'agent'
  ): ExtendedMessageItem[] {
    const payload = text.trim();

    return [
      {
        title: '💬 Open Chat',
        command: { id: 'telegram-notify.qoder.openChat', arguments: [payload, mode === 'ask' ? 'ask' : 'agent'] }
      },
      {
        title: '🚀 Open Quest',
        command: { id: 'telegram-notify.qoder.openQuest', arguments: [payload] }
      },
      {
        title: '📋 Copy',
        command: { id: 'telegram-notify.qoder.copyToClipboard', arguments: [payload] }
      }
    ];
  }

  /**
   * Build prompt-specific buttons. If recommendations are available, use them as actions.
   */
  private buildPromptButtons(
    prompt: string,
    mode: 'agent' | 'ask' | 'plan' | 'debug',
    recommendations: string[]
  ): ExtendedMessageItem[] {
    const buttons: ExtendedMessageItem[] = recommendations.slice(0, 3).map((recommendation, index) => ({
      title: `${index + 1}. ${this.truncateButtonLabel(recommendation)}`,
      command: { id: 'telegram-notify.qoder.openChat', arguments: [recommendation, mode === 'ask' ? 'ask' : 'agent'] }
    }));

    buttons.push(...this.buildActionButtons(prompt, mode));
    return buttons;
  }

  /**
   * Programmatically forward Qoder notification
   */
  static async forwardQoderNotification(
    message: string,
    type: 'prompt' | 'response' | 'task' | 'error' | 'progress' = 'prompt',
    details?: string
  ): Promise<void> {
    const emojis: Record<string, string> = {
      prompt: '💬',
      response: '🤖',
      task: '🔨',
      error: '🚨',
      progress: '⏳'
    };

    const types: Record<string, MessageType> = {
      prompt: MessageType.Information,
      response: MessageType.Information,
      task: MessageType.Warning,
      error: MessageType.Error,
      progress: MessageType.Information
    };

    const fullMessage = `${emojis[type]} Qoder ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n${message}${details ? `\n\n${details}` : ''}`;

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      fullMessage,
      types[type]
    );
  }

  /**
   * Extract the human-readable text from a transcript record.
   */
  private extractTranscriptText(record: TranscriptRecord): string {
    const content = record.message?.content;

    if (typeof content === 'string') {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const textParts: string[] = [];

      for (const item of content) {
        if (item && typeof item === 'object') {
          const entry = item as any;
          if (entry.type === 'text' && typeof entry.text === 'string') {
            textParts.push(entry.text);
          } else if (entry.type === 'tool_use' && entry.name && entry.input) {
            const toolLabel = `${entry.name}: ${JSON.stringify(entry.input)}`;
            textParts.push(toolLabel);
          } else if (entry.type === 'tool_result' && typeof entry.content === 'string') {
            textParts.push(entry.content);
          }
        }
      }

      if (textParts.length > 0) {
        return textParts.join('\n\n').trim();
      }
    }

    if (typeof record.toolUseResult === 'string') {
      return record.toolUseResult.trim();
    }

    if (record.data?.content) {
      if (typeof record.data.content === 'string') {
        return record.data.content.trim();
      }

      if (Array.isArray(record.data.content)) {
        return JSON.stringify(record.data.content, null, 2);
      }

      return JSON.stringify(record.data.content, null, 2);
    }

    return '';
  }

  /**
   * Describe a session meta record.
   */
  private describeTranscriptSession(record: TranscriptRecord): string {
    const mode = this.getTranscriptMode(record) ?? 'agent';
    const sessionType = this.getTranscriptSessionType(record) ?? 'assistant';
    const cwd = record.cwd || record.data?.content?.cwd || '';
    const cwdLabel = cwd ? `\n*Workspace:* ${this.truncateForTelegram(cwd, 120)}` : '';

    return (
      `🧭 Qoder Session Started\n\n` +
      `*Mode:* ${mode}\n` +
      `*Session:* ${sessionType}` +
      cwdLabel
    );
  }

  /**
   * Convert a progress record into readable text.
   */
  private describeProgressRecord(record: TranscriptRecord): string {
    if (record.data?.hookEvent || record.data?.hookName) {
      return [
        record.data.hookEvent ? `Hook event: ${record.data.hookEvent}` : '',
        record.data.hookName ? `Hook name: ${record.data.hookName}` : '',
        record.data.command ? `Command: ${record.data.command}` : '',
      ].filter(Boolean).join('\n');
    }

    if (record.data?.content) {
      if (typeof record.data.content === 'string') {
        return record.data.content;
      }

      return JSON.stringify(record.data.content, null, 2);
    }

    return JSON.stringify(record, null, 2);
  }

  /**
   * Read mode from transcript metadata.
   */
  private getTranscriptMode(record: TranscriptRecord): 'agent' | 'ask' | 'plan' | 'debug' | undefined {
    const content = record.data?.content;
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      const mode = content.mode || content.session_mode || content.sessionType;
      if (mode === 'agent' || mode === 'ask' || mode === 'plan' || mode === 'debug') {
        return mode;
      }
    }

    const rawMode = record.data?.mode;
    if (rawMode === 'agent' || rawMode === 'ask' || rawMode === 'plan' || rawMode === 'debug') {
      return rawMode;
    }

    return undefined;
  }

  /**
   * Read session type from transcript metadata.
   */
  private getTranscriptSessionType(record: TranscriptRecord): string | undefined {
    const content = record.data?.content;
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      const sessionType = content.session_type || content.sessionType;
      if (typeof sessionType === 'string') {
        return sessionType;
      }
    }

    if (typeof record.data?.session_type === 'string') {
      return record.data.session_type;
    }

    return undefined;
  }

  /**
   * Extract the most likely next-step / recommendation cards from a transcript message.
   */
  private extractActionCards(text: string): string[] {
    const normalized = text.replace(/\r/g, '');
    const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
    const hasRecommendationCue = /to-dos|recommendation|what would you like to do|what you want to do|next step|question|questions|choose one|select one/i.test(normalized);

    if (!hasRecommendationCue) {
      return [];
    }

    const cards: string[] = [];
    const captureFromLine = (line: string): string | null => {
      const numbered = line.match(/^(?:\d+|[A-Ca-c])[.)\-:]\s+(.+)$/);
      if (numbered) {
        return numbered[1].trim();
      }

      const bullet = line.match(/^[-*•]\s+(.+)$/);
      if (bullet) {
        return bullet[1].trim();
      }

      return null;
    };

    for (const line of lines) {
      const card = captureFromLine(line);
      if (card) {
        cards.push(card);
      }
    }

    const uniqueCards = Array.from(new Set(cards));
    return uniqueCards.slice(0, 3);
  }

  /**
   * Truncate text for Telegram payloads and button labels.
   */
  private truncateForTelegram(text: string, limit: number): string {
    if (text.length <= limit) {
      return text;
    }

    return `${text.substring(0, Math.max(0, limit - 20))}\n\n[...truncated...]`;
  }

  private truncateButtonLabel(text: string): string {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= 30) {
      return trimmed;
    }

    return `${trimmed.substring(0, 27)}…`;
  }

  dispose(): void {
    this.logger.info('Disposing Qoder integration');
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.transcriptStates.clear();
    this.isWatching = false;
  }
}
