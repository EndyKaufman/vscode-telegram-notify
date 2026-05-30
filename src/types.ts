import * as vscode from 'vscode';

// Define message type enum since VS Code doesn't export it
export enum MessageType {
  Error = 1,
  Warning = 2,
  Information = 3
}

// Define extended message item with command support
export interface ExtendedMessageItem extends vscode.MessageItem {
  command?: {
    id: string;
    arguments?: any[];
  };
}
