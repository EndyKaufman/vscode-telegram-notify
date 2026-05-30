import * as vscode from 'vscode';
import { Logger } from './logger';
import { TelegramBotService } from './telegramBot';
import { ConfigManager } from './configManager';
import { MessageType, ExtendedMessageItem } from './types';

export class NotificationInterceptor {
  private logger: Logger;
  private telegramBot: TelegramBotService;
  private configManager: ConfigManager;
  private notificationCounter: number = 0;
  private disposables: vscode.Disposable[] = [];

  constructor(
    logger: Logger,
    telegramBot: TelegramBotService,
    configManager: ConfigManager
  ) {
    this.logger = logger;
    this.telegramBot = telegramBot;
    this.configManager = configManager;
  }

  initialize(): void {
    this.logger.info('Initializing notification interceptor');
    
    // Note: VS Code doesn't provide a direct API to intercept all notifications
    // We'll use a workaround by providing wrapper functions that extensions can use
    // For now, we'll monitor the output panel and provide manual triggering
    
    // TODO: Implement notification interception using VS Code API limitations
    // Current approach: Provide commands to manually send notifications
    
    this.logger.warn('VS Code does not provide direct notification interception API');
    this.logger.info('Use commands to manually trigger notifications or integrate with specific extensions');
  }

  async forwardNotification(
    message: string,
    severity: MessageType = MessageType.Information,
    source?: string,
    buttons?: ExtendedMessageItem[]
  ): Promise<void> {
    const config = this.configManager.getConfig();

    // Check if notifications are enabled
    if (!config.enabled) {
      this.logger.debug('Notifications are disabled, skipping');
      return;
    }

    // Check severity filter
    if (!this.shouldForwardSeverity(severity)) {
      this.logger.debug(`Severity filter blocked notification: ${MessageType[severity]}`);
      return;
    }

    // Check source filter
    if (source && this.shouldExcludeSource(source)) {
      this.logger.debug(`Source excluded: ${source}`);
      return;
    }

    try {
      this.notificationCounter++;
      this.logger.info(`Forwarding notification #${this.notificationCounter}: ${message.substring(0, 50)}...`);

      await this.telegramBot.sendMessage(message, severity, source, buttons);
    } catch (error) {
      this.logger.error('Failed to forward notification', error);
    }
  }

  private shouldForwardSeverity(severity: MessageType): boolean {
    const config = this.configManager.getConfig();
    const severityMap: { [key: number]: string } = {
      [MessageType.Error]: 'error',
      [MessageType.Warning]: 'warning',
      [MessageType.Information]: 'info',
    };

    const severityName = severityMap[severity];
    return config.filterSeverity.includes(severityName);
  }

  private shouldExcludeSource(source: string): boolean {
    const config = this.configManager.getConfig();
    return config.excludeSources.some(excluded => 
      source.toLowerCase().includes(excluded.toLowerCase())
    );
  }

  getNotificationCount(): number {
    return this.notificationCounter;
  }

  resetCounter(): void {
    this.notificationCounter = 0;
  }

  dispose(): void {
    this.logger.info('Notification interceptor disposed');
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
