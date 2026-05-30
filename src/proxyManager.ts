import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Logger } from './logger';
import * as vscode from 'vscode';
import { Agent } from 'https';

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}

export interface ProxyAgentOptions {
  proxyUrl: string;
  timeout?: number;
}

/**
 * Proxy Manager - Handles proxy configuration and agent creation
 */
export class ProxyManager {
  private logger: Logger;
  private currentConfig: ProxyConfig | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create proxy agent from configuration
   */
  createProxyAgent(config: ProxyConfig): Agent | null {
    if (!config.enabled || !config.host || config.port < 1) {
      this.logger.debug('Proxy not enabled or invalid configuration');
      return null;
    }

    try {
      const proxyUrl = this.buildProxyUrl(config);
      this.logger.info(`Creating proxy agent: ${this.maskProxyUrl(proxyUrl)}`);

      // Create appropriate agent based on protocol
      if (config.protocol === 'socks4' || config.protocol === 'socks5') {
        return new SocksProxyAgent(proxyUrl);
      } else {
        return new HttpsProxyAgent(proxyUrl);
      }
    } catch (error) {
      this.logger.error('Failed to create proxy agent', error);
      return null;
    }
  }

  /**
   * Build proxy URL from configuration
   */
  private buildProxyUrl(config: ProxyConfig): string {
    const { protocol, host, port, username, password } = config;

    let url = `${protocol}://`;

    // Add authentication if provided
    if (username && password) {
      url += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }

    url += `${host}:${port}`;

    return url;
  }

  /**
   * Mask proxy URL for logging (hide credentials)
   */
  private maskProxyUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.password) {
        urlObj.password = '***';
      }
      if (urlObj.username) {
        urlObj.username = urlObj.username ? '***' : '';
      }
      return urlObj.toString();
    } catch {
      return url.replace(/\/\/([^@]+)@/, '//***:***@');
    }
  }

  /**
   * Get proxy configuration from VS Code settings
   */
  getProxyConfig(): ProxyConfig {
    const config = vscode.workspace.getConfiguration('telegramNotify');
    const proxyUrl = config.get<string>('proxyUrl', '');

    // If proxyUrl is provided, parse it and use it
    if (proxyUrl && proxyUrl.trim().length > 0) {
      try {
        return this.parseProxyUrl(proxyUrl);
      } catch (error) {
        this.logger.error('Failed to parse proxy URL, falling back to individual settings', error);
      }
    }

    // Otherwise use individual settings
    return {
      enabled: config.get<boolean>('proxyEnabled', false),
      host: config.get<string>('proxyHost', ''),
      port: config.get<number>('proxyPort', 1080),
      protocol: config.get<'http' | 'https' | 'socks4' | 'socks5'>('proxyProtocol', 'socks5'),
      username: config.get<string>('proxyUsername', ''),
      password: config.get<string>('proxyPassword', ''),
    };
  }

  /**
   * Parse proxy URL into configuration
   */
  private parseProxyUrl(proxyUrl: string): ProxyConfig {
    const url = new URL(proxyUrl);
    const protocol = url.protocol.replace(':', '') as 'http' | 'https' | 'socks4' | 'socks5';

    return {
      enabled: true,
      host: url.hostname,
      port: parseInt(url.port) || (protocol === 'https' ? 443 : 80),
      protocol,
      username: url.username ? decodeURIComponent(url.username) : '',
      password: url.password ? decodeURIComponent(url.password) : '',
    };
  }

  /**
   * Validate proxy configuration
   */
  validateProxyConfig(config: ProxyConfig): { valid: boolean; message: string } {
    if (!config.enabled) {
      return { valid: true, message: 'Proxy is disabled' };
    }

    if (!config.host || config.host.trim().length === 0) {
      return { valid: false, message: 'Proxy host is required' };
    }

    if (config.port < 1 || config.port > 65535) {
      return { valid: false, message: 'Proxy port must be between 1 and 65535' };
    }

    if (!['http', 'https', 'socks4', 'socks5'].includes(config.protocol)) {
      return { valid: false, message: 'Invalid proxy protocol' };
    }

    if (config.username && !config.password) {
      return { valid: false, message: 'Proxy password is required when username is provided' };
    }

    return { valid: true, message: 'Proxy configuration is valid' };
  }

  /**
   * Test proxy connection
   */
  async testProxyConnection(config: ProxyConfig): Promise<{ success: boolean; message: string }> {
    if (!config.enabled) {
      return { success: true, message: 'Proxy is disabled, skipping test' };
    }

    try {
      const validation = this.validateProxyConfig(config);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      const proxyUrl = this.buildProxyUrl(config);
      this.logger.info(`Testing proxy connection: ${this.maskProxyUrl(proxyUrl)}`);

      // Test connection using a simple HTTP request
      const testUrl = 'https://api.telegram.org/botTest/getMe';
      
      const agent = this.createProxyAgent(config);
      if (!agent) {
        return { success: false, message: 'Failed to create proxy agent' };
      }

      // Use Node.js https module to test
      const https = require('https');
      
      return new Promise((resolve) => {
        const req = https.get(testUrl, { agent, timeout: 10000 }, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => data += chunk);
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.ok) {
                resolve({ success: true, message: 'Proxy connection successful' });
              } else {
                resolve({ 
                  success: false, 
                  message: `Proxy works but Telegram API error: ${response.description}` 
                });
              }
            } catch {
              resolve({ success: true, message: 'Proxy connection successful (non-JSON response)' });
            }
          });
        });

        req.on('error', (error: Error) => {
          resolve({ 
            success: false, 
            message: `Proxy connection failed: ${error.message}` 
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ 
            success: false, 
            message: 'Proxy connection timed out (10s)' 
          });
        });

        req.setTimeout(10000);
        req.end();
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Proxy test error: ${errorMessage}` };
    }
  }

  /**
   * Update current proxy configuration
   */
  updateConfig(config: ProxyConfig): void {
    this.currentConfig = config;
    this.logger.info('Proxy configuration updated');
  }

  /**
   * Get current proxy configuration
   */
  getCurrentConfig(): ProxyConfig | null {
    return this.currentConfig;
  }

  /**
   * Check if proxy is enabled
   */
  isProxyEnabled(): boolean {
    return this.currentConfig?.enabled || false;
  }

  /**
   * Format proxy configuration for display
   */
  formatProxyDisplay(config: ProxyConfig): string {
    if (!config.enabled) {
      return 'Proxy: Disabled';
    }

    const url = this.buildProxyUrl(config);
    const masked = this.maskProxyUrl(url);
    
    return `Proxy: ${config.protocol.toUpperCase()} via ${masked}`;
  }
}
