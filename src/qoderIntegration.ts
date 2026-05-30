import * as vscode from 'vscode';
import { Logger } from './logger';
import { TelegramBotService } from './telegramBot';
import { ConfigManager } from './configManager';
import { MessageType, ExtendedMessageItem } from './types';
import { NotificationInterceptor } from './notificationInterceptor';

/**
 * Qoder Integration - Intercepts and forwards Qoder agent chat notifications
 * 
 * This module captures:
 * - Agent prompts and responses
 * - Task completion notifications
 * - Error messages from Qoder agents
 * - Progress updates
 */
export class QoderIntegration {
  private logger: Logger;
  private telegramBot: TelegramBotService;
  private configManager: ConfigManager;
  private notificationInterceptor: NotificationInterceptor;
  private disposables: vscode.Disposable[] = [];
  private isWatching: boolean = false;

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

    // Register manual trigger commands
    this.registerCommands();

    // Watch for Qoder sidebar updates
    this.watchQoderSidebar();

    this.logger.info('Qoder integration initialized');
  }

  /**
   * Watch for Qoder sidebar notifications and prompts
   */
  private watchQoderSidebar(): void {
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

    // Watch for Qoder sidebar data files
    const sidebarPatterns = [
      '**/.qoder/**/*.json',
      '**/.qoder/**/*.log',
      '**/.qoder/**/notifications*',
      '**/.qoder/**/prompts*',
      '**/.qoder/**/chat*',
      '**/.qoder/**/messages*',
    ];

    for (const pattern of sidebarPatterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, pattern)
      );

      // Watch for new notifications/prompts
      watcher.onDidCreate((uri) => {
        this.logger.info(`Qoder sidebar file created: ${uri.fsPath}`);
        this.processQoderFile(uri);
      });

      // Watch for updates
      watcher.onDidChange((uri) => {
        this.logger.debug(`Qoder sidebar file changed: ${uri.fsPath}`);
        this.processQoderFile(uri);
      });

      this.disposables.push(watcher);
    }

    // Also watch global storage for Qoder data
    this.watchGlobalQoderStorage();
  }

  /**
   * Process Qoder file and forward notifications
   */
  private async processQoderFile(uri: vscode.Uri): Promise<void> {
    try {
      const fileName = uri.fsPath.toLowerCase();
      
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
          for (const item of data.slice(-5)) { // Last 5 items
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
            'Qoder Sidebar'
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process Qoder file: ${uri.fsPath}`, error);
    }
  }

  /**
   * Forward individual Qoder item to Telegram
   */
  private async forwardQoderItem(item: any, source: string): Promise<void> {
    const message = item.message || item.content || item.text || JSON.stringify(item);
    const type = item.type || 'notification';
    
    let emoji = '📝';
    let messageType = MessageType.Information;

    if (type.includes('error') || message.toLowerCase().includes('error')) {
      emoji = '🚨';
      messageType = MessageType.Error;
    } else if (type.includes('warning') || type.includes('warn')) {
      emoji = '⚠️';
      messageType = MessageType.Warning;
    } else if (type.includes('prompt')) {
      emoji = '💬';
    } else if (type.includes('response')) {
      emoji = '🤖';
    }

    await this.forwardNotification(
      `${emoji} Qoder Sidebar ${type}\n\n${message.substring(0, 2000)}`,
      messageType,
      'Qoder Sidebar',
      [
        {
          title: '📂 Open File',
          command: { id: 'vscode.open', arguments: [vscode.Uri.file(source)] }
        },
        {
          title: 'ℹ️ Details',
          command: { id: 'workbench.action.output.toggleOutput' }
        }
      ]
    );
  }

  /**
   * Watch global storage for Qoder data
   */
  private watchGlobalQoderStorage(): void {
    // Try to find Qoder extension storage
    const extensions = vscode.extensions.all;
    
    for (const ext of extensions) {
      if (ext.id.toLowerCase().includes('qoder')) {
        this.logger.info(`Found Qoder extension: ${ext.id}`);
        
        // Listen for extension updates
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
    // Watch terminal output for Qoder messages
    this.watchTerminalOutput();

    // Watch output channels for Qoder
    this.watchOutputChannels();

    // Watch for file changes in Qoder directories
    this.watchQoderFiles();

    this.isWatching = true;
  }

  /**
   * Watch terminal output for Qoder-related messages
   */
  private watchTerminalOutput(): void {
    // Monitor terminal creation for Qoder terminals
    const terminalListener = vscode.window.onDidOpenTerminal((terminal) => {
      const terminalName = terminal.name.toLowerCase();
      
      if (terminalName.includes('qoder') || 
          terminalName.includes('agent') ||
          terminalName.includes('quest')) {
        
        this.logger.info(`Detected Qoder terminal: ${terminal.name}`);
        
        this.forwardNotification(
          `🤖 Qoder Terminal Opened: ${terminal.name}`,
          MessageType.Information,
          'Qoder Integration'
        );
      }
    });

    this.disposables.push(terminalListener);
  }

  /**
   * Watch output channels for Qoder messages
   */
  private watchOutputChannels(): void {
    // This is a workaround - we can't directly read output channels
    // But we can listen for when they're shown
    this.logger.info('Watching for Qoder output channels');
  }

  /**
   * Watch for file changes in Qoder-related directories
   */
  private watchQoderFiles(): void {
    // Watch for .qoder directory changes
    if (vscode.workspace.workspaceFolders) {
      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      
      const fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, '**/.qoder/**')
      );

      fileWatcher.onDidChange((uri) => {
        this.logger.debug(`Qoder file changed: ${uri.fsPath}`);
      });

      fileWatcher.onDidCreate((uri) => {
        if (uri.fsPath.includes('prompt') || uri.fsPath.includes('chat')) {
          this.logger.info(`New Qoder file created: ${uri.fsPath}`);
          this.forwardNotification(
            `📝 New Qoder prompt file created: ${uri.fsPath}`,
            MessageType.Information,
            'Qoder Integration'
          );
        }
      });

      this.disposables.push(fileWatcher);
    }
  }

  /**
   * Register manual trigger commands
   */
  private registerCommands(): void {
    // Manual trigger for Qoder notification
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.forwardPrompt',
        () => this.handleForwardPrompt()
      )
    );

    // Forward agent task
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.forwardAgentTask',
        () => this.handleForwardAgentTask()
      )
    );

    // Forward completion notification
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.forwardCompletion',
        () => this.handleForwardCompletion()
      )
    );

    // Custom Qoder message
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.qoder.customMessage',
        () => this.handleCustomMessage()
      )
    );

    this.logger.info('Qoder commands registered');
  }

  /**
   * Handle manual prompt forwarding
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
      [
        {
          title: '▶️ Start Agent',
          command: { id: 'qoder.agent.start', arguments: [prompt] }
        },
        {
          title: '❌ Cancel'
        }
      ]
    );

    vscode.window.showInformationMessage('Prompt forwarded to Telegram');
  }

  /**
   * Handle agent task forwarding
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

    await this.forwardNotification(
      `🤖 Qoder Agent Task\n\n` +
      `**Type:** ${taskType.label}\n` +
      `**Description:** ${details}\n` +
      `**Status:** Queued`,
      MessageType.Warning,
      'Qoder Integration',
      [
        {
          title: '▶️ Execute',
          command: { id: 'qoder.task.execute', arguments: [taskType.label, details] }
        },
        {
          title: '📊 Monitor',
          command: { id: 'qoder.task.monitor' }
        },
        {
          title: '⏸️ Pause'
        }
      ]
    );

    vscode.window.showInformationMessage('Agent task forwarded to Telegram');
  }

  /**
   * Handle completion notification
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

    const buttons: ExtendedMessageItem[] = completionType.label.includes('Failed') ? [
      {
        title: '🔁 Retry',
        command: { id: 'qoder.task.retry' }
      },
      {
        title: '📋 View Logs',
        command: { id: 'workbench.action.output.toggleOutput' }
      },
      {
        title: '🐛 Debug',
        command: { id: 'qoder.task.debug' }
      }
    ] : [
      {
        title: '📊 View Results',
        command: { id: 'qoder.task.results' }
      },
      {
        title: '🎉 Celebrate!'
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
   * Handle custom message
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
      'Qoder Integration'
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

  dispose(): void {
    this.logger.info('Disposing Qoder integration');
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.isWatching = false;
  }
}
