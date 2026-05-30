import * as vscode from 'vscode';
import { Logger } from './logger';
import { ConfigManager } from './configManager';
import { TelegramBotService } from './telegramBot';
import { NotificationInterceptor } from './notificationInterceptor';

export class CommandManager {
  private logger: Logger;
  private configManager: ConfigManager;
  private telegramBot: TelegramBotService;
  private notificationInterceptor: NotificationInterceptor;
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private lastStatsMessage: string = '';

  constructor(
    logger: Logger,
    configManager: ConfigManager,
    telegramBot: TelegramBotService,
    notificationInterceptor: NotificationInterceptor
  ) {
    this.logger = logger;
    this.configManager = configManager;
    this.telegramBot = telegramBot;
    this.notificationInterceptor = notificationInterceptor;
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }

  registerCommands(): void {
    // Setup command
    this.disposables.push(
      vscode.commands.registerCommand('telegram-notify.setup', () => this.handleSetup())
    );

    // Test command
    this.disposables.push(
      vscode.commands.registerCommand('telegram-notify.test', () => this.handleTest())
    );

    // Toggle command
    this.disposables.push(
      vscode.commands.registerCommand('telegram-notify.toggle', () => this.handleToggle())
    );

    // Show stats command
    this.disposables.push(
      vscode.commands.registerCommand('telegram-notify.showStats', () => this.handleShowStats())
    );

    // Copy stats command
    this.disposables.push(
      vscode.commands.registerCommand('telegram-notify.copyStats', () => this.handleCopyStats())
    );

    this.logger.info('Commands registered successfully');
  }

  updateStatusBar(): void {
    const config = this.configManager.getConfig();
    
    if (this.telegramBot.isConnected() && config.enabled) {
      this.statusBarItem.text = '$(bell-dot) Telegram: Connected';
      this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
      this.statusBarItem.tooltip = 'Telegram notifications are active\nClick to configure';
    } else if (config.enabled && !this.telegramBot.isConnected()) {
      this.statusBarItem.text = '$(bell-slash) Telegram: Error';
      this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
      this.statusBarItem.tooltip = 'Telegram connection error\nClick to configure';
    } else {
      this.statusBarItem.text = '$(bell) Telegram: Disabled';
      this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
      this.statusBarItem.tooltip = 'Telegram notifications are disabled\nClick to configure';
    }

    this.statusBarItem.command = 'telegram-notify.setup';
    this.statusBarItem.show();
  }

  private async handleSetup(): Promise<void> {
    this.logger.info('Setup command executed');

    // Step 1: Get bot token
    const currentToken = await this.configManager.getBotToken();
    const tokenInput = await vscode.window.showInputBox({
      prompt: 'Enter your Telegram Bot Token',
      placeHolder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      value: currentToken,
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Bot token is required';
        }
        if (!value.match(/^\d+:[A-Za-z0-9_-]+$/)) {
          return 'Invalid bot token format. Expected format: 123456:ABC-DEF...';
        }
        return null;
      }
    });

    if (!tokenInput) {
      this.logger.info('Setup cancelled at token input');
      return;
    }

    await this.configManager.setBotToken(tokenInput);

    // Step 2: Get chat ID
    const currentChatId = this.configManager.getChatId();
    const chatIdInput = await vscode.window.showInputBox({
      prompt: 'Enter your Telegram Chat ID (user ID or group ID)',
      placeHolder: '123456789 or -1001234567890',
      value: currentChatId,
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Chat ID is required';
        }
        if (!value.match(/^-?\d+$/)) {
          return 'Invalid chat ID format. Must be a number (can be negative for groups)';
        }
        return null;
      }
    });

    if (!chatIdInput) {
      this.logger.info('Setup cancelled at chat ID input');
      return;
    }

    await this.configManager.setChatId(chatIdInput);

    // Step 3: Enable notifications
    const enableNotifications = await vscode.window.showQuickPick(
      ['Yes, enable notifications', 'No, keep disabled'],
      {
        placeHolder: 'Do you want to enable Telegram notifications now?'
      }
    );

    if (enableNotifications === 'Yes, enable notifications') {
      await this.configManager.updateConfig('enabled', true);
    }

    // Step 4: Configure proxy (optional)
    await this.configureProxy();

    // Step 5: Initialize bot with new configuration
    await this.initializeBot();

    // Step 6: Send test message
    const sendTest = await vscode.window.showQuickPick(
      ['Yes, send test message', 'No, skip test'],
      {
        placeHolder: 'Send a test message to verify configuration?'
      }
    );

    if (sendTest === 'Yes, send test message') {
      await this.handleTest();
    }

    vscode.window.showInformationMessage(
      'Telegram Notify setup complete! You can change settings anytime.'
    );
  }

  private async configureProxy(): Promise<void> {
    this.logger.info('Configuring proxy settings');

    // Ask if user wants to enable proxy
    const enableProxy = await vscode.window.showQuickPick(
      ['Yes, configure proxy', 'No, use direct connection'],
      {
        placeHolder: 'Do you need to use a proxy server for Telegram connection?'
      }
    );

    if (enableProxy !== 'Yes, configure proxy') {
      await this.configManager.updateConfig('proxyEnabled', false);
      await this.configManager.updateConfig('proxyUrl', '');
      this.logger.info('Proxy disabled');
      return;
    }

    // Ask for proxy URL (single line)
    const proxyUrl = await vscode.window.showInputBox({
      prompt: 'Enter proxy URL (format: protocol://[user:pass@]host:port)',
      placeHolder: 'socks5://user:pass@proxy.example.com:1080',
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Proxy URL is required';
        }
        
        try {
          const url = new URL(value);
          if (!url.hostname) {
            return 'Invalid URL: hostname is required';
          }
          if (!url.port) {
            return 'Invalid URL: port is required';
          }
          const protocol = url.protocol.replace(':', '');
          if (!['http', 'https', 'socks4', 'socks5'].includes(protocol)) {
            return 'Invalid protocol. Use: http, https, socks4, or socks5';
          }
          return null;
        } catch {
          return 'Invalid URL format. Example: socks5://user:pass@proxy.com:1080';
        }
      }
    });

    if (!proxyUrl) {
      await this.configManager.updateConfig('proxyEnabled', false);
      await this.configManager.updateConfig('proxyUrl', '');
      return;
    }

    // Set proxy URL and enable proxy
    await this.configManager.updateConfig('proxyUrl', proxyUrl);
    await this.configManager.updateConfig('proxyEnabled', true);

    this.logger.info(`Proxy URL configured: ${this.maskProxyUrl(proxyUrl)}`);
    vscode.window.showInformationMessage(
      `Proxy configured: ${this.maskProxyUrl(proxyUrl)}`
    );
  }

  private maskProxyUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.password) urlObj.password = '***';
      if (urlObj.username) urlObj.username = '***';
      return urlObj.toString();
    } catch {
      return url.replace(/\/\/([^@]+)@/, '//***:***@');
    }
  }

  private async handleTest(): Promise<void> {
    this.logger.info('Test command executed');

    const validation = this.configManager.validateConfig();
    if (!validation.valid) {
      vscode.window.showWarningMessage(validation.message);
      return;
    }

    try {
      const success = await this.telegramBot.sendTestMessage();
      
      if (success) {
        vscode.window.showInformationMessage(
          '✅ Test message sent successfully! Check your Telegram.'
        );
      } else {
        vscode.window.showErrorMessage(
          '❌ Failed to send test message. Check the output panel for details.'
        );
      }
    } catch (error) {
      this.logger.error('Test message failed', error);
      vscode.window.showErrorMessage(
        '❌ Test message failed. Check the output panel for details.'
      );
    }
  }

  private async handleToggle(): Promise<void> {
    this.logger.info('Toggle command executed');

    const newState = await this.configManager.toggleEnabled();
    
    if (newState) {
      vscode.window.showInformationMessage('Telegram notifications enabled');
    } else {
      vscode.window.showInformationMessage('Telegram notifications disabled');
    }

    this.updateStatusBar();
  }

  private async handleShowStats(): Promise<void> {
    this.logger.info('Show stats command executed');

    const config = this.configManager.getConfig();
    const notificationCount = this.notificationInterceptor.getNotificationCount();
    const activeButtons = this.telegramBot.getButtonHandler()?.getActiveButtonCount() || 0;

    // Get detailed stats
    const uptime = this.getUptime();
    const projectInfo = this.getProjectInfo();
    const proxyInfo = this.getProxyInfo(config);

    // Create detailed statistics with table format
    const statsMessage = `
📊 *Telegram Notify Statistics*

┌─────────────────────────────────┐
│       🔹 STATUS & INFO          │
├─────────────────────────────────┤
│ Status:       ${config.enabled ? '✅ Enabled' : '❌ Disabled              '}
│ Connected:    ${this.telegramBot.isConnected() ? '✅ Yes    ' : '❌ No      '}
│ Uptime:       ${uptime.padEnd(20)}│
│ IDE:          ${projectInfo.ide.padEnd(20)}│
│ Project:      ${projectInfo.project.padEnd(20)}│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       🔹 NOTIFICATION STATS     │
├─────────────────────────────────┤
│ Total Sent:   ${String(notificationCount).padEnd(20)}│
│ Active Btns:  ${String(activeButtons).padEnd(20)}│
│ Button Timeout: ${String(config.buttonTimeout + 's').padEnd(18)}│
│ Max Length:   ${String(config.maxMessageLength).padEnd(20)}│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       🔹 CONFIGURATION          │
├─────────────────────────────────┤
│ Chat ID:      ${(config.chatId || 'Not set').padEnd(20)}│
│ Bot Token:    ${config.botToken ? '✅ Set      ' : '❌ Not set  '}
│ Severity:     ${config.filterSeverity.join(', ').padEnd(14)}│
${proxyInfo}
└─────────────────────────────────┘
    `.trim();

    // Show in VS Code notification
    const selection = await vscode.window.showInformationMessage(
      '📊 Statistics: ' + notificationCount + ' notifications sent',
      { modal: false },
      { title: '📋 Copy Stats' },
      { title: '📄 View in Output' }
    );

    if (selection?.title === '📋 Copy Stats') {
      await this.copyStatsToClipboard(statsMessage);
    } else if (selection?.title === '📄 View in Output') {
      this.logger.info('\n' + statsMessage.replace(/\*/g, ''));
      vscode.commands.executeCommand('workbench.action.output.toggleOutput');
    }

    // Store stats for potential copy
    this.lastStatsMessage = statsMessage;
  }

  private async handleCopyStats(): Promise<void> {
    if (this.lastStatsMessage) {
      await this.copyStatsToClipboard(this.lastStatsMessage);
    } else {
      await this.handleShowStats();
    }
  }

  private async copyStatsToClipboard(statsMessage: string): Promise<void> {
    try {
      // Remove markdown for clipboard
      const plainText = statsMessage.replace(/\*/g, '');
      
      await vscode.env.clipboard.writeText(plainText);
      vscode.window.showInformationMessage('✅ Statistics copied to clipboard!');
      this.logger.info('Statistics copied to clipboard');
    } catch (error) {
      this.logger.error('Failed to copy stats to clipboard', error);
      vscode.window.showErrorMessage('Failed to copy statistics');
    }
  }

  private getUptime(): string {
    // This is a simple approximation - in real scenario you'd track start time
    return 'Active';
  }

  private getProjectInfo(): { ide: string; project: string } {
    const ide = require('vscode').env.appName || 'VS Code';
    const workspaceFolders = require('vscode').workspace.workspaceFolders;
    const project = workspaceFolders && workspaceFolders.length > 0 
      ? workspaceFolders[0].name 
      : 'No project';
    
    return {
      ide: ide.substring(0, 20),
      project: project.substring(0, 20)
    };
  }

  private getProxyInfo(config: any): string {
    if (!config.proxyEnabled) {
      return '│ Proxy:        ❌ Disabled            │';
    }

    const proxyUrl = config.proxyUrl || `${config.proxyProtocol}://${config.proxyHost}:${config.proxyPort}`;
    const maskedUrl = this.maskProxyUrlForStats(proxyUrl);
    
    return `│ Proxy:        ✅ ${maskedUrl.padEnd(15)}│`;
  }

  private maskProxyUrlForStats(url: string): string {
    try {
      const urlObj = new URL(url);
      let masked = urlObj.protocol + '//';
      if (urlObj.username) masked += '***:***@';
      masked += urlObj.hostname;
      if (urlObj.port) masked += ':' + urlObj.port;
      return masked.substring(0, 15);
    } catch {
      return url.substring(0, 15);
    }
  }

  async initializeBot(): Promise<boolean> {
    const config = this.configManager.getConfig();
    
    if (!config.botToken || !config.chatId) {
      this.logger.warn('Bot token or chat ID not configured');
      this.updateStatusBar();
      return false;
    }

    // Get proxy configuration
    const { ProxyManager } = require('./proxyManager');
    const proxyManager = new ProxyManager(this.logger);
    const proxyConfig = proxyManager.getProxyConfig();

    const success = await this.telegramBot.initialize(
      config.botToken,
      config.chatId,
      config.buttonTimeout,
      config.proxyEnabled ? proxyConfig : undefined
    );

    this.updateStatusBar();
    return success;
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.logger.info('Command manager disposed');
  }
}
