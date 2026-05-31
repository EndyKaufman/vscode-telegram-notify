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
  private originalShowInformationMessage?: typeof vscode.window.showInformationMessage;
  private originalShowWarningMessage?: typeof vscode.window.showWarningMessage;
  private originalShowErrorMessage?: typeof vscode.window.showErrorMessage;
  private originalShowInputBox?: typeof vscode.window.showInputBox;
  private originalShowQuickPick?: typeof vscode.window.showQuickPick;

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

    this.patchWindowNotification('showInformationMessage', MessageType.Information);
    this.patchWindowNotification('showWarningMessage', MessageType.Warning);
    this.patchWindowNotification('showErrorMessage', MessageType.Error);
    this.patchInputBox();
    this.patchQuickPick();

    this.logger.info('VS Code window notification and prompt methods patched for forwarding');
  }

  private patchWindowNotification(
    methodName: 'showInformationMessage' | 'showWarningMessage' | 'showErrorMessage',
    severity: MessageType
  ): void {
    const windowApi = vscode.window as any;
    const original = windowApi[methodName] as (...args: any[]) => Thenable<any>;

    if (typeof original !== 'function') {
      this.logger.warn(`Cannot patch vscode.window.${methodName}: method not found`);
      return;
    }

    if (methodName === 'showInformationMessage') {
      this.originalShowInformationMessage = original as typeof vscode.window.showInformationMessage;
    } else if (methodName === 'showWarningMessage') {
      this.originalShowWarningMessage = original as typeof vscode.window.showWarningMessage;
    } else {
      this.originalShowErrorMessage = original as typeof vscode.window.showErrorMessage;
    }

    const interceptor = this;
    const patched = function patchedShowMessage(this: unknown, message: string, ...args: any[]) {
      const buttons = interceptor.extractButtons(args);
      const originalPromise = original.call(this, message, ...args);

      if (buttons.length > 0) {
        // Extract target user ID from the chat
        const targetUserId = interceptor.getTargetUserId();
        const telegramPromise = interceptor.forwardSelectableNotification(
          String(message),
          severity,
          buttons,
          targetUserId
        );

        return Promise.race([
          originalPromise,
          telegramPromise.then((selectedTitle) => interceptor.findSelectedButton(args, selectedTitle))
        ]).then((value) => value || undefined);
      }

      interceptor.forwardNotification(
        String(message),
        severity,
        'VS Code Notification'
      );

      return originalPromise;
    };

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

  private patchInputBox(): void {
    const windowApi = vscode.window as any;
    const original = windowApi.showInputBox as (...args: any[]) => Thenable<string | undefined>;

    if (typeof original !== 'function') {
      this.logger.warn('Cannot patch vscode.window.showInputBox: method not found');
      return;
    }

    this.originalShowInputBox = original as typeof vscode.window.showInputBox;

    const interceptor = this;
    const patched = function patchedShowInputBox(this: unknown, ...args: any[]) {
      const options = args[0] || {};
      const message = options.prompt || options.placeHolder || 'Input requested';
      const originalPromise = original.call(this, ...args);
      // Extract target user ID from the chat
      const targetUserId = interceptor.getTargetUserId();
      const telegramPromise = interceptor.forwardPrompt(String(message), targetUserId);

      return Promise.race([originalPromise, telegramPromise]).then((value) => {
        if (typeof value === 'string' && typeof options.validateInput === 'function') {
          const validation = options.validateInput(value);
          if (validation) {
            interceptor.forwardNotification(
              `Telegram prompt answer rejected: ${validation}`,
              MessageType.Warning,
              'VS Code Prompt'
            );
            return undefined;
          }
        }

        return value;
      });
    };

    try {
      windowApi.showInputBox = patched;
    } catch {
      Object.defineProperty(windowApi, 'showInputBox', {
        configurable: true,
        writable: true,
        value: patched,
      });
    }
  }


  private patchQuickPick(): void {
    const windowApi = vscode.window as any;
    const original = windowApi.showQuickPick as (...args: any[]) => Thenable<any>;

    if (typeof original !== 'function') {
      this.logger.warn('Cannot patch vscode.window.showQuickPick: method not found');
      return;
    }

    this.originalShowQuickPick = original as typeof vscode.window.showQuickPick;

    const interceptor = this;
    const patched = function patchedShowQuickPick(this: unknown, ...args: any[]) {
      const items = args[0];
      const options = interceptor.getQuickPickOptions(args);
      const originalPromise = original.call(this, ...args);
      const telegramPromise = interceptor.forwardQuickPick(items, options);

      return Promise.race([originalPromise, telegramPromise]).then((value) => value || undefined);
    };

    try {
      windowApi.showQuickPick = patched;
    } catch {
      Object.defineProperty(windowApi, 'showQuickPick', {
        configurable: true,
        writable: true,
        value: patched,
      });
    }
  }

  private getQuickPickOptions(args: any[]): vscode.QuickPickOptions | undefined {
    return args.find((arg) => arg && typeof arg === 'object' && !Array.isArray(arg) && !this.isThenable(arg) && !('label' in arg));
  }

  private async forwardQuickPick(items: any, options?: vscode.QuickPickOptions): Promise<any> {
    if (!this.configManager.getConfig().enabled || !this.shouldForwardSeverity(MessageType.Information)) {
      return undefined;
    }

    const resolvedItems = await Promise.resolve(items);
    if (!Array.isArray(resolvedItems) || resolvedItems.length === 0) {
      return undefined;
    }

    const canPickMany = Boolean(options?.canPickMany);
    if (canPickMany) {
      await this.forwardNotification(
        `${options?.placeHolder || 'Quick pick requested'}\n\nMultiple selection QuickPick cannot be answered from Telegram yet.`,
        MessageType.Information,
        'VS Code QuickPick'
      );
      return undefined;
    }

    const limitedItems = resolvedItems.slice(0, 30);
    const buttons = limitedItems.map((item: any) => ({
      title: this.getQuickPickItemLabel(item)
    }));

    // Extract target user ID from the chat
    const targetUserId = this.getTargetUserId();
    const selectedTitle = await this.telegramBot.sendMessageAndWaitForButton(
      options?.placeHolder || 'Choose an option',
      MessageType.Information,
      'VS Code QuickPick',
      buttons,
      targetUserId
    );

    if (!selectedTitle) {
      return undefined;
    }

    return limitedItems.find((item: any) => this.getQuickPickItemLabel(item) === selectedTitle);
  }

  private getQuickPickItemLabel(item: any): string {
    if (typeof item === 'string') {
      return item;
    }

    if (item && typeof item.label === 'string') {
      const description = typeof item.description === 'string' ? ` — ${item.description}` : '';
      return `${item.label}${description}`;
    }

    return String(item);
  }

  private isThenable(value: any): boolean {
    return value && typeof value.then === 'function';
  }

  private extractButtons(args: any[]): ExtendedMessageItem[] {
    return args
      .filter((arg) => typeof arg === 'string' || (arg && typeof arg.title === 'string'))
      .map((arg) => typeof arg === 'string' ? { title: arg } : arg);
  }

  private findSelectedButton(args: any[], selectedTitle: string | undefined): any {
    if (!selectedTitle) {
      return undefined;
    }

    return args.find((arg) =>
      arg === selectedTitle || (arg && typeof arg.title === 'string' && arg.title === selectedTitle)
    );
  }

  private async forwardSelectableNotification(
    message: string,
    severity: MessageType,
    buttons: ExtendedMessageItem[],
    targetUserId?: number
  ): Promise<string | undefined> {
    if (!this.configManager.getConfig().enabled || !this.shouldForwardSeverity(severity)) {
      return undefined;
    }

    return this.telegramBot.sendMessageAndWaitForButton(
      message,
      severity,
      'VS Code Confirm',
      buttons,
      targetUserId
    );
  }

  private async forwardPrompt(message: string, targetUserId?: number): Promise<string | undefined> {
    if (!this.configManager.getConfig().enabled || !this.shouldForwardSeverity(MessageType.Information)) {
      return undefined;
    }

    return this.telegramBot.sendPromptAndWaitForReply(message, 'VS Code Prompt', targetUserId);
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

  private getTargetUserId(): number | undefined {
    // Get the chat ID from the Telegram bot service
    const chatId = this.telegramBot.getChatId();
    
    // If it's a private chat (positive number), the chat ID is the user ID
    // If it's a group chat (negative number), we can't determine the specific user
    if (chatId) {
      const chatIdNum = parseInt(chatId);
      // Private chats have positive IDs, group chats have negative IDs
      if (chatIdNum > 0) {
        return chatIdNum;
      }
    }
    
    // For group chats or if we can't determine, return undefined
    // This means anyone in the group can interact (you may want to change this behavior)
    return undefined;
  }

  resetCounter(): void {
    this.notificationCounter = 0;
  }

  dispose(): void {
    this.logger.info('Notification interceptor disposed');
    const windowApi = vscode.window as any;

    if (this.originalShowInformationMessage) {
      windowApi.showInformationMessage = this.originalShowInformationMessage;
    }

    if (this.originalShowWarningMessage) {
      windowApi.showWarningMessage = this.originalShowWarningMessage;
    }

    if (this.originalShowErrorMessage) {
      windowApi.showErrorMessage = this.originalShowErrorMessage;
    }

    if (this.originalShowInputBox) {
      windowApi.showInputBox = this.originalShowInputBox;
    }

    if (this.originalShowQuickPick) {
      windowApi.showQuickPick = this.originalShowQuickPick;
    }

    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
