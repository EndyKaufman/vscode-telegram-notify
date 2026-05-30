import * as vscode from 'vscode';
import TelegramBot from 'node-telegram-bot-api';
import { Logger } from './logger';
import { MessageFormatter } from './messageFormatter';
import { ExtendedMessageItem } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface ButtonMapping {
  callbackId: string;
  commandId: string | undefined;
  arguments?: any[];
  notificationId: string;
  buttonTitle: string;
  createdAt: number;
}

export class ButtonHandler {
  private bot: TelegramBot;
  private logger: Logger;
  private formatter: MessageFormatter;
  private chatId: string;
  private buttonMappings: Map<string, ButtonMapping>;
  private buttonTimeout: number;
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(
    bot: TelegramBot,
    chatId: string,
    logger: Logger,
    formatter: MessageFormatter,
    buttonTimeout: number = 300
  ) {
    this.bot = bot;
    this.chatId = chatId;
    this.logger = logger;
    this.formatter = formatter;
    this.buttonMappings = new Map();
    this.buttonTimeout = buttonTimeout * 1000; // Convert to milliseconds

    // Setup cleanup interval to remove expired mappings every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanupExpiredMappings(), 60000);
  }

  createInlineKeyboard(buttons: ExtendedMessageItem[], notificationId: string): TelegramBot.InlineKeyboardMarkup {
    const inlineButtons: TelegramBot.InlineKeyboardButton[][] = buttons.map(button => {
      const callbackId = uuidv4();
      
      // Store the button mapping
      const mapping: ButtonMapping = {
        callbackId,
        commandId: button.command?.id,
        arguments: button.command?.arguments,
        notificationId,
        buttonTitle: button.title,
        createdAt: Date.now()
      };

      this.buttonMappings.set(callbackId, mapping);

      this.logger.debug(`Created button mapping: ${callbackId} -> ${button.title}`);

      return [
        {
          text: button.title,
          callback_data: callbackId
        }
      ];
    });

    return { inline_keyboard: inlineButtons };
  }

  handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): void {
    const callbackId = callbackQuery.data;
    if (!callbackId) {
      this.logger.warn('Received callback query without data');
      return;
    }

    const mapping = this.buttonMappings.get(callbackId);
    if (!mapping) {
      this.logger.warn(`No button mapping found for callback: ${callbackId}`);
      this.bot.answerCallbackQuery(callbackQuery.id, {
        text: 'This button has expired',
        show_alert: true
      });
      return;
    }

    this.logger.info(`Button clicked: ${mapping.buttonTitle} (${callbackId})`);

    // Execute the corresponding VS Code command
    this.executeCommand(mapping, callbackQuery);
  }

  private async executeCommand(mapping: ButtonMapping, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    try {
      // If there's a command ID, execute it
      if (mapping.commandId) {
        this.logger.info(`Executing VS Code command: ${mapping.commandId}`);
        await vscode.commands.executeCommand(mapping.commandId, ...(mapping.arguments || []));
        
        // Send success message
        const successMsg = this.formatter.formatSuccessMessage(mapping.buttonTitle);
        this.bot.answerCallbackQuery(callbackQuery.id, {
          text: `✅ ${mapping.buttonTitle}`,
          show_alert: false
        });

        // Send confirmation message to chat
        this.bot.sendMessage(this.chatId, successMsg.text, {
          parse_mode: successMsg.parseMode
        });
      } else {
        // No command, just acknowledge
        this.bot.answerCallbackQuery(callbackQuery.id, {
          text: mapping.buttonTitle,
          show_alert: false
        });
      }

      // Remove the mapping after execution
      this.buttonMappings.delete(mapping.callbackId);
    } catch (error) {
      this.logger.error(`Failed to execute command for button: ${mapping.buttonTitle}`, error);
      
      const errorMsg = this.formatter.formatErrorMessage(
        `Failed to execute: ${mapping.buttonTitle}`
      );

      this.bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Error executing action',
        show_alert: true
      });

      this.bot.sendMessage(this.chatId, errorMsg.text, {
        parse_mode: errorMsg.parseMode
      });
    }
  }

  private cleanupExpiredMappings(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [callbackId, mapping] of this.buttonMappings.entries()) {
      if (now - mapping.createdAt > this.buttonTimeout) {
        this.buttonMappings.delete(callbackId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired button mappings`);
    }
  }

  updateChatId(newChatId: string): void {
    this.chatId = newChatId;
    this.logger.info(`Button handler chat ID updated to: ${newChatId}`);
  }

  updateButtonTimeout(newTimeout: number): void {
    this.buttonTimeout = newTimeout * 1000;
    this.logger.info(`Button timeout updated to: ${newTimeout} seconds`);
  }

  getActiveButtonCount(): number {
    return this.buttonMappings.size;
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buttonMappings.clear();
    this.logger.info('Button handler disposed');
  }
}
