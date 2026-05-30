import * as vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(extensionName: string) {
    this.outputChannel = vscode.window.createOutputChannel(extensionName);
  }

  info(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[INFO] [${timestamp}] ${message}`;
    this.outputChannel.appendLine(logMessage);
    console.log(logMessage, ...args);
  }

  warn(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[WARN] [${timestamp}] ${message}`;
    this.outputChannel.appendLine(logMessage);
    console.warn(logMessage, ...args);
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[ERROR] [${timestamp}] ${message}`;
    
    let errorMessage = logMessage;
    if (error) {
      if (error instanceof Error) {
        errorMessage += `\n  Message: ${error.message}`;
        errorMessage += `\n  Stack: ${error.stack}`;
      } else {
        errorMessage += `\n  ${JSON.stringify(error)}`;
      }
    }
    
    this.outputChannel.appendLine(errorMessage);
    console.error(errorMessage, ...args);
  }

  debug(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[DEBUG] [${timestamp}] ${message}`;
    this.outputChannel.appendLine(logMessage);
    console.debug(logMessage, ...args);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
