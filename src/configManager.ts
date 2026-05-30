import * as vscode from 'vscode';
import { Logger } from './logger';

export interface TelegramNotifyConfig {
  enabled: boolean;
  botToken: string | undefined;
  chatId: string | undefined;
  filterSeverity: string[];
  excludeSources: string[];
  buttonTimeout: number;
  maxMessageLength: number;
  proxyEnabled: boolean;
  proxyUrl: string;
  proxyHost: string;
  proxyPort: number;
  proxyProtocol: 'http' | 'https' | 'socks4' | 'socks5';
  proxyUsername: string;
  proxyPassword: string;
}

export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  private logger: Logger;

  constructor(logger: Logger) {
    this.config = vscode.workspace.getConfiguration('telegramNotify');
    this.logger = logger;
  }

  getConfig(): TelegramNotifyConfig {
    return {
      enabled: this.config.get<boolean>('enabled', false),
      botToken: this.config.get<string>('botToken'),
      chatId: this.config.get<string>('chatId'),
      filterSeverity: this.config.get<string[]>('filterSeverity', ['error', 'warning', 'info']),
      excludeSources: this.config.get<string[]>('excludeSources', []),
      buttonTimeout: this.config.get<number>('buttonTimeout', 300),
      maxMessageLength: this.config.get<number>('maxMessageLength', 4000),
      proxyEnabled: this.config.get<boolean>('proxyEnabled', false),
      proxyUrl: this.config.get<string>('proxyUrl', ''),
      proxyHost: this.config.get<string>('proxyHost', ''),
      proxyPort: this.config.get<number>('proxyPort', 1080),
      proxyProtocol: this.config.get<'http' | 'https' | 'socks4' | 'socks5'>('proxyProtocol', 'socks5'),
      proxyUsername: this.config.get<string>('proxyUsername', ''),
      proxyPassword: this.config.get<string>('proxyPassword', ''),
    };
  }

  async getBotToken(): Promise<string | undefined> {
    // Try to get from VS Code secrets first (if available)
    try {
      const secretKey = 'telegramNotify.botToken';
      const token = await (vscode as any).secrets?.get(secretKey);
      if (token) {
        return token;
      }
    } catch (error) {
      this.logger.debug('Secrets API not available, falling back to settings');
    }
    
    // Fallback to settings (less secure)
    return this.config.get<string>('botToken');
  }

  async setBotToken(token: string): Promise<void> {
    // Try to store in VS Code secrets (if available)
    try {
      const secretKey = 'telegramNotify.botToken';
      await (vscode as any).secrets?.store(secretKey, token);
      this.logger.info('Bot token stored securely in VS Code secrets');
    } catch (error) {
      this.logger.warn('Secrets API not available, storing in settings (less secure)');
      await this.config.update('botToken', token, vscode.ConfigurationTarget.Global);
    }
  }

  getChatId(): string | undefined {
    return this.config.get<string>('chatId');
  }

  async setChatId(chatId: string): Promise<void> {
    await this.config.update('chatId', chatId, vscode.ConfigurationTarget.Global);
    this.logger.info(`Chat ID updated: ${chatId}`);
  }

  isEnabled(): boolean {
    return this.config.get<boolean>('enabled', false);
  }

  async toggleEnabled(): Promise<boolean> {
    const currentState = this.isEnabled();
    const newState = !currentState;
    await this.config.update('enabled', newState, vscode.ConfigurationTarget.Global);
    this.logger.info(`Notifications ${newState ? 'enabled' : 'disabled'}`);
    return newState;
  }

  async updateConfig(key: string, value: any): Promise<void> {
    await this.config.update(key, value, vscode.ConfigurationTarget.Global);
    this.logger.info(`Configuration updated: ${key}`);
  }

  validateConfig(): { valid: boolean; message: string } {
    const config = this.getConfig();

    if (!config.botToken) {
      return { valid: false, message: 'Bot token is not configured. Run "Telegram Notify: Setup Bot" command.' };
    }

    if (!config.chatId) {
      return { valid: false, message: 'Chat ID is not configured. Run "Telegram Notify: Setup Bot" command.' };
    }

    if (!config.enabled) {
      return { valid: false, message: 'Telegram notifications are currently disabled. Enable them in settings.' };
    }

    // Validate proxy configuration if enabled
    if (config.proxyEnabled) {
      // If proxyUrl is provided, validate it
      if (config.proxyUrl && config.proxyUrl.trim().length > 0) {
        try {
          const url = new URL(config.proxyUrl);
          if (!url.hostname || !url.port) {
            return { valid: false, message: 'Invalid proxy URL format. Expected: protocol://host:port or protocol://user:pass@host:port' };
          }
          const protocol = url.protocol.replace(':', '');
          if (!['http', 'https', 'socks4', 'socks5'].includes(protocol)) {
            return { valid: false, message: 'Invalid proxy protocol in URL. Supported: http, https, socks4, socks5' };
          }
        } catch {
          return { valid: false, message: 'Invalid proxy URL format. Expected: socks5://user:pass@proxy.com:1080' };
        }
      } else {
        // Otherwise validate individual fields
        if (!config.proxyHost || config.proxyHost.trim().length === 0) {
          return { valid: false, message: 'Proxy is enabled but proxy host/URL is not configured.' };
        }

        if (config.proxyPort < 1 || config.proxyPort > 65535) {
          return { valid: false, message: 'Proxy port must be between 1 and 65535.' };
        }

        // If username is provided, password must also be provided
        if (config.proxyUsername && !config.proxyPassword) {
          return { valid: false, message: 'Proxy username is set but password is empty.' };
        }
      }
    }

    return { valid: true, message: 'Configuration is valid!' };
  }

  onDidChangeConfiguration(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('telegramNotify')) {
        this.config = vscode.workspace.getConfiguration('telegramNotify');
        callback();
      }
    });
  }
}
