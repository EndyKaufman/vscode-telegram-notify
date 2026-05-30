import * as vscode from 'vscode';
import { MessageType } from './types';

export interface FormattedMessage {
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

export class MessageFormatter {
  private maxMessageLength: number;

  constructor(maxMessageLength: number = 4000) {
    this.maxMessageLength = maxMessageLength;
  }

  formatNotification(
    message: string,
    severity: MessageType,
    source?: string,
    timestamp?: Date
  ): FormattedMessage {
    const severityEmoji = this.getSeverityEmoji(severity);
    const severityText = this.getSeverityText(severity);
    const time = timestamp || new Date();
    const timeStr = time.toLocaleTimeString();

    // Get IDE and project info
    const ideName = this.getIdeName();
    const projectName = this.getProjectName();

    let text = `${severityEmoji} *${severityText}*\n\n`;

    // Add IDE and project info
    if (ideName || projectName) {
      text += `*IDE:* ${this.escapeMarkdown(ideName || 'VS Code')}\n`;
      if (projectName) {
        // Don't escape hyphens in project name - only escape critical markdown chars
        const escapedProject = projectName.replace(/([_*~`])/g, '\\$1');
        text += `*Project:* ${escapedProject}\n`;
      }
      text += '\n';
    }

    if (source) {
      text += `*Source:* ${this.escapeMarkdown(source)}\n`;
    }

    text += `*Time:* ${timeStr}\n\n`;
    text += this.escapeMarkdown(this.truncateMessage(message));

    return {
      text,
      parseMode: 'Markdown'
    };
  }

  formatWithButtons(
    message: string,
    severity: MessageType,
    buttons: vscode.MessageItem[],
    source?: string
  ): FormattedMessage {
    const formatted = this.formatNotification(message, severity, source);
    
    // Add button information to message
    if (buttons.length > 0) {
      formatted.text += `\n\n🔘 \\*Available actions:\\*\n`;
      buttons.forEach((btn, index) => {
        formatted.text += `${index + 1}\\. ${this.escapeMarkdown(btn.title)}\n`;
      });
    }

    return formatted;
  }

  formatSuccessMessage(action: string): FormattedMessage {
    return {
      text: `✅ \\*Action Executed\\*\n\nSuccessfully triggered: ${this.escapeMarkdown(action)}`,
      parseMode: 'Markdown'
    };
  }

  formatErrorMessage(error: string): FormattedMessage {
    return {
      text: `❌ \\*Error\\*\n\n${this.escapeMarkdown(error)}`,
      parseMode: 'Markdown'
    };
  }

  formatTestMessage(): FormattedMessage {
    return {
      text: `🔔 \\*Test Notification\\*\n\nThis is a test message from VS Code Telegram Notify extension\\.\n\nYour bot is configured correctly and ready to receive notifications\\!`,
      parseMode: 'Markdown'
    };
  }

  private getSeverityEmoji(severity: MessageType): string {
    switch (severity) {
      case MessageType.Error:
        return '🚨';
      case MessageType.Warning:
        return '⚠️';
      case MessageType.Information:
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  private getSeverityText(severity: MessageType): string {
    switch (severity) {
      case MessageType.Error:
        return 'Error';
      case MessageType.Warning:
        return 'Warning';
      case MessageType.Information:
        return 'Information';
      default:
        return 'Notification';
    }
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.maxMessageLength) {
      return message;
    }

    const truncated = message.substring(0, this.maxMessageLength - 100);
    return truncated + '\n\n\\*\\*\\[Message truncated\\.\\.\\.\\]\\*\\*';
  }

  private escapeMarkdown(text: string): string {
    // Escape only Telegram Markdown special characters
    // Don't over-escape - only escape what's necessary
    return text
      .replace(/\\/g, '\\\\')  // Backslash first
      .replace(/_/g, '\\_')    // Underscore
      .replace(/\*/g, '\\*')   // Asterisk
      .replace(/~/g, '\\~')    // Tilde
      .replace(/`/g, '\\`')    // Backtick
      .replace(/>/g, '\\>')    // Greater than
      .replace(/#/g, '\\#')    // Hash
      .replace(/\+/g, '\\+')   // Plus
      .replace(/-/g, '\\-')    // Minus
      .replace(/=/g, '\\=')    // Equals
      .replace(/\|/g, '\\|')   // Pipe
      .replace(/{/g, '\\{')    // Open brace
      .replace(/}/g, '\\}')    // Close brace
      .replace(/\./g, '\\.')   // Dot
      .replace(/!/g, '\\!');   // Exclamation
  }

  private getIdeName(): string {
    // Try to detect IDE
    const appName = vscode.env.appName;
    if (appName) {
      return appName;
    }
    return 'VS Code';
  }

  private getProjectName(): string | undefined {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return vscode.workspace.workspaceFolders[0].name;
    }
    return undefined;
  }

  setMaxMessageLength(length: number): void {
    this.maxMessageLength = length;
  }
}
