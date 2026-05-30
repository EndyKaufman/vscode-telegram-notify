import TelegramBot from 'node-telegram-bot-api';
import { Logger } from './logger';
import { MessageFormatter, FormattedMessage } from './messageFormatter';
import { ButtonHandler } from './buttonHandler';
import { MessageType, ExtendedMessageItem } from './types';
import { ProxyManager, ProxyConfig } from './proxyManager';
import { BotMutex } from './botMutex';
import * as vscode from 'vscode';

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private logger: Logger;
  private formatter: MessageFormatter;
  private buttonHandler: ButtonHandler | null = null;
  private chatId: string | null = null;
  private isInitialized: boolean = false;
  private proxyManager: ProxyManager;
  private mutex: BotMutex;
  private hasPollingLock: boolean = false;

  constructor(logger: Logger, formatter: MessageFormatter) {
    this.logger = logger;
    this.formatter = formatter;
    this.proxyManager = new ProxyManager(logger);
    this.mutex = new BotMutex(logger);
  }

  async initialize(botToken: string, chatId: string, buttonTimeout: number = 300, proxyConfig?: ProxyConfig): Promise<boolean> {
    try {
      if (this.bot) {
        await this.shutdown();
      }

      this.logger.info('Initializing Telegram Bot...');

      // Try to acquire mutex for polling
      this.hasPollingLock = await this.mutex.tryAcquire();
      if (this.hasPollingLock) {
        this.logger.info('This instance will handle Telegram bot polling');
      } else {
        this.logger.info('Another instance is handling polling, this instance will only send messages');
      }

      // Configure proxy if provided
      let requestOptions: any = {};
      
      if (proxyConfig && proxyConfig.enabled) {
        this.logger.info('Configuring proxy for Telegram connection');
        const proxyAgent = this.proxyManager.createProxyAgent(proxyConfig);
        
        if (proxyAgent) {
          requestOptions = {
            agent: proxyAgent,
            timeout: 30000
          };
          this.proxyManager.updateConfig(proxyConfig);
          this.logger.info(`Proxy configured: ${this.proxyManager.formatProxyDisplay(proxyConfig)}`);
        } else {
          this.logger.warn('Failed to create proxy agent, continuing without proxy');
        }
      }

      // Create new bot instance
      // Only enable polling if we acquired the mutex lock
      const botOptions: any = {
        request: Object.keys(requestOptions).length > 0 ? requestOptions : undefined
      };

      if (this.hasPollingLock) {
        botOptions.polling = {
          interval: 1000,
          params: {
            timeout: 10
          }
        };
      } else {
        botOptions.polling = false;
      }

      this.bot = new TelegramBot(botToken, botOptions);

      this.chatId = chatId;

      // Setup event handlers
      this.bot.on('message', (msg) => this.handleMessage(msg));
      this.bot.on('callback_query', (callbackQuery) => this.handleCallbackQuery(callbackQuery));
      this.bot.on('polling_error', (error) => this.handlePollingError(error));
      this.bot.on('error', (error) => this.handleError(error));

      // Initialize button handler
      this.buttonHandler = new ButtonHandler(
        this.bot,
        chatId,
        this.logger,
        this.formatter,
        buttonTimeout
      );

      // Test connection
      const botInfo = await this.bot.getMe();
      this.logger.info(`Telegram Bot connected: @${botInfo.username}`);

      this.isInitialized = true;
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Telegram Bot', error);
      this.isInitialized = false;
      return false;
    }
  }

  async sendMessage(
    message: string,
    severity: MessageType = MessageType.Information,
    source?: string,
    buttons?: ExtendedMessageItem[]
  ): Promise<void> {
    if (!this.isInitialized || !this.bot || !this.chatId) {
      this.logger.warn('Telegram Bot not initialized, cannot send message');
      return;
    }

    try {
      const formattedMessage = this.formatter.formatNotification(message, severity, source);

      // If there are buttons, create inline keyboard
      if (buttons && buttons.length > 0 && this.buttonHandler) {
        const notificationId = `notif_${Date.now()}`;
        const inlineKeyboard = this.buttonHandler.createInlineKeyboard(buttons, notificationId);

        await this.bot.sendMessage(this.chatId, formattedMessage.text, {
          parse_mode: formattedMessage.parseMode,
          reply_markup: inlineKeyboard
        });

        this.logger.debug(`Message sent with ${buttons.length} buttons`);
      } else {
        await this.bot.sendMessage(this.chatId, formattedMessage.text, {
          parse_mode: formattedMessage.parseMode
        });
      }
    } catch (error) {
      this.logger.error('Failed to send message to Telegram', error);
      throw error;
    }
  }

  async sendTestMessage(): Promise<boolean> {
    if (!this.isInitialized || !this.bot || !this.chatId) {
      return false;
    }

    try {
      const testMessage = this.formatter.formatTestMessage();
      await this.bot.sendMessage(this.chatId, testMessage.text, {
        parse_mode: testMessage.parseMode
      });
      this.logger.info('Test message sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send test message', error);
      return false;
    }
  }

  private handleMessage(msg: TelegramBot.Message): void {
    this.logger.debug(`Received message from ${msg.from?.username || msg.from?.first_name}: ${msg.text}`);
  }

  private handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): void {
    if (!this.buttonHandler) {
      this.logger.warn('Button handler not initialized');
      return;
    }

    // Verify the callback is from the configured chat
    if (this.chatId && callbackQuery.message && callbackQuery.message.chat.id.toString() !== this.chatId) {
      this.logger.warn(`Callback query from unauthorized chat: ${callbackQuery.message.chat.id}`);
      this.bot?.answerCallbackQuery(callbackQuery.id, {
        text: 'Unauthorized',
        show_alert: true
      });
      return;
    }

    this.buttonHandler.handleCallbackQuery(callbackQuery);
  }

  private handlePollingError(error: any): void {
    this.logger.error('Telegram polling error', error);
  }

  private handleError(error: any): void {
    this.logger.error('Telegram Bot error', error);
  }

  updateChatId(newChatId: string): void {
    this.chatId = newChatId;
    if (this.buttonHandler) {
      this.buttonHandler.updateChatId(newChatId);
    }
    this.logger.info(`Chat ID updated: ${newChatId}`);
  }

  updateButtonTimeout(newTimeout: number): void {
    if (this.buttonHandler) {
      this.buttonHandler.updateButtonTimeout(newTimeout);
    }
    this.logger.info(`Button timeout updated: ${newTimeout}`);
  }

  isConnected(): boolean {
    return this.isInitialized && this.bot !== null;
  }

  getChatId(): string | null {
    return this.chatId;
  }

  getButtonHandler(): ButtonHandler | null {
    return this.buttonHandler;
  }

  async shutdown(): Promise<void> {
    try {
      if (this.buttonHandler) {
        this.buttonHandler.dispose();
        this.buttonHandler = null;
      }

      if (this.bot) {
        // Only stop polling if we were the ones doing it
        if (this.hasPollingLock) {
          this.bot.stopPolling();
        }
        this.bot = null;
      }

      // Release the mutex lock
      if (this.hasPollingLock) {
        this.mutex.release();
        this.hasPollingLock = false;
      }

      this.isInitialized = false;
      this.logger.info('Telegram Bot shutdown complete');
    } catch (error) {
      this.logger.error('Error during Telegram Bot shutdown', error);
    }
  }
}
