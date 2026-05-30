import * as vscode from 'vscode';
import { Logger } from './logger';
import { ConfigManager } from './configManager';
import { TelegramBotService } from './telegramBot';
import { MessageFormatter } from './messageFormatter';
import { NotificationInterceptor } from './notificationInterceptor';
import { CommandManager } from './commands';
import { MessageType, ExtendedMessageItem } from './types';
import { TestCommands } from './testCommands';
import { QoderIntegration } from './qoderIntegration';
import { QoderTestCommands } from './qoderTestCommands';
import { ProxyManager } from './proxyManager';

let logger: Logger;
let configManager: ConfigManager;
let telegramBot: TelegramBotService;
let messageFormatter: MessageFormatter;
let notificationInterceptor: NotificationInterceptor;
let commandManager: CommandManager;
let testCommands: TestCommands;
let qoderIntegration: QoderIntegration;
let qoderTestCommands: QoderTestCommands;
let proxyManager: ProxyManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Telegram Notify extension is now active');

  // Initialize logger
  logger = new Logger('Telegram Notify');
  logger.info('Extension activated');

  // Initialize configuration manager
  configManager = new ConfigManager(logger);

  // Initialize proxy manager
  proxyManager = new ProxyManager(logger);

  // Initialize message formatter
  const config = configManager.getConfig();
  messageFormatter = new MessageFormatter(config.maxMessageLength);

  // Initialize Telegram Bot service
  telegramBot = new TelegramBotService(logger, messageFormatter);

  // Initialize notification interceptor
  notificationInterceptor = new NotificationInterceptor(
    logger,
    telegramBot,
    configManager
  );
  notificationInterceptor.initialize();

  // Initialize command manager
  commandManager = new CommandManager(
    logger,
    configManager,
    telegramBot,
    notificationInterceptor
  );
  commandManager.registerCommands();
  commandManager.updateStatusBar();

  // Initialize test commands
  testCommands = new TestCommands();
  testCommands.registerAll();

  // Initialize Qoder integration
  qoderIntegration = new QoderIntegration(
    logger,
    telegramBot,
    configManager,
    notificationInterceptor
  );
  qoderIntegration.initialize();

  // Initialize Qoder test commands
  qoderTestCommands = new QoderTestCommands();
  qoderTestCommands.registerAll();

  // Try to initialize bot if configured
  const validation = configManager.validateConfig();
  if (validation.valid) {
    await commandManager.initializeBot();
  } else {
    logger.info(`Bot not initialized: ${validation.message}`);
  }

  // Listen for configuration changes
  context.subscriptions.push(
    configManager.onDidChangeConfiguration(() => {
      logger.info('Configuration changed');
      commandManager.updateStatusBar();
      
      // Reinitialize bot if token or chat ID changed
      const config = configManager.getConfig();
      if (config.botToken && config.chatId) {
        commandManager.initializeBot();
      }
    })
  );

  // Register a sample notification command for testing
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'telegram-notify.sendNotification',
      async (message: string, severity?: number, buttons?: ExtendedMessageItem[]) => {
        await notificationInterceptor.forwardNotification(
          message,
          severity || MessageType.Information,
          'Telegram Notify Extension',
          buttons
        );
      }
    )
  );

  // Show welcome message on first activation
  const isFirstActivation = context.globalState.get<boolean>('isFirstActivation', true);
  if (isFirstActivation) {
    await context.globalState.update('isFirstActivation', false);

    const action = await vscode.window.showInformationMessage(
      '🔔 Telegram Notify installed! Would you like to set it up now?',
      'Setup Bot',
      'View Documentation',
      'Later'
    );

    if (action === 'Setup Bot') {
      vscode.commands.executeCommand('telegram-notify.setup');
    } else if (action === 'View Documentation') {
      vscode.commands.executeCommand('workbench.action.openWalkthrough', 'vscode-telegram-notify#welcome');
    }
  }

  logger.info('Extension setup complete');
}

export function deactivate() {
  console.log('Telegram Notify extension is deactivating');
  
  if (logger) {
    logger.info('Extension deactivating');
  }

  if (qoderIntegration) {
    qoderIntegration.dispose();
  }

  if (qoderTestCommands) {
    qoderTestCommands.dispose();
  }

  if (testCommands) {
    testCommands.dispose();
  }

  if (telegramBot) {
    telegramBot.shutdown();
  }

  if (notificationInterceptor) {
    notificationInterceptor.dispose();
  }

  if (commandManager) {
    commandManager.dispose();
  }

  if (logger) {
    logger.dispose();
  }
}

// Export services for other parts of the extension
export {
  logger,
  configManager,
  telegramBot,
  messageFormatter,
  notificationInterceptor,
  commandManager
};
