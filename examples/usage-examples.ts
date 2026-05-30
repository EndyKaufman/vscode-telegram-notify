// Example: How to use Telegram Notify Extension
// This file demonstrates different ways to send notifications

import * as vscode from 'vscode';

// Example 1: Simple information notification
export function sendSimpleNotification() {
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    'Build completed successfully!',
    3 // MessageType.Information
  );
}

// Example 2: Warning notification
export function sendWarningNotification() {
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    'Deprecated API usage detected in your code',
    2 // MessageType.Warning
  );
}

// Example 3: Error notification with action buttons
export function sendErrorWithButtons() {
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    'Build failed with 3 errors',
    1, // MessageType.Error
    [
      {
        title: '🔨 Rebuild',
        command: { id: 'workbench.action.tasks.rebuild' }
      },
      {
        title: '📋 Show Errors',
        command: { id: 'workbench.action.showErrorsWarnings' }
      },
      {
        title: '❌ Dismiss',
        // No command - just acknowledges the click
      }
    ]
  );
}

// Example 4: Deploy notification with multiple actions
export function sendDeployNotification() {
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    '🚀 Deployment to production completed!\n\n' +
    'Service: my-app\n' +
    'Version: 1.2.3\n' +
    'Status: Healthy\n' +
    'Response Time: 45ms',
    3, // MessageType.Information
    [
      {
        title: '📊 View Dashboard',
        command: { 
          id: 'vscode.open', 
          arguments: [vscode.Uri.parse('https://dashboard.example.com')] 
        }
      },
      {
        title: '📝 View Logs',
        command: { id: 'myextension.showLogs' }
      },
      {
        title: '🔄 Restart Service',
        command: { id: 'myextension.restartService' }
      }
    ]
  );
}

// Example 5: Test completion notification
export function sendTestCompletionNotification(passed: number, failed: number) {
  const message = failed === 0
    ? `✅ All tests passed! (${passed} tests)`
    : `❌ ${failed} test(s) failed out of ${passed} tests`;

  const severity = failed === 0 ? 3 : 1; // Information or Error

  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    message,
    severity,
    failed > 0 ? [
      {
        title: '🔍 Show Failed Tests',
        command: { id: 'workbench.action.showErrorsWarnings' }
      },
      {
        title: '🔁 Rerun Tests',
        command: { id: 'myextension.rerunTests' }
      }
    ] : undefined
  );
}

// Example 6: Git operation notification
export function sendGitOperationNotification(operation: string, success: boolean) {
  const emoji = success ? '✅' : '❌';
  const severity = success ? 3 : 1;

  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    `${emoji} Git ${operation} ${success ? 'completed' : 'failed'}`,
    severity,
    !success ? [
      {
        title: '📋 View Output',
        command: { id: 'git.showOutput' }
      },
      {
        title: '🔁 Retry',
        command: { id: `git.${operation.toLowerCase()}` }
      }
    ] : undefined
  );
}

// Example 7: Long-running task notification
export function sendTaskStartNotification(taskName: string) {
  vscode.commands.executeCommand(
    'telegram-notify.sendNotification',
    `⏳ Starting task: ${taskName}\n\nThis may take a while...`,
    3 // MessageType.Information
  );
}

// Example 8: Integration with VS Code tasks
export function registerTaskListener(context: vscode.ExtensionContext) {
  vscode.tasks.onDidEndTaskProcess((e) => {
    const exitCode = e.exitCode;
    const taskName = e.execution.task.name;

    if (exitCode === 0) {
      vscode.commands.executeCommand(
        'telegram-notify.sendNotification',
        `✅ Task "${taskName}" completed successfully`,
        3 // MessageType.Information
      );
    } else {
      vscode.commands.executeCommand(
        'telegram-notify.sendNotification',
        `❌ Task "${taskName}" failed with exit code ${exitCode}`,
        1, // MessageType.Error
        [
          {
            title: '🔁 Rerun Task',
            command: { 
              id: 'workbench.action.tasks.runTask', 
              arguments: [taskName] 
            }
          }
        ]
      );
    }
  });
}

// Example 9: File watcher notification
export function registerFileWatcher(context: vscode.ExtensionContext) {
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.ts');

  watcher.onDidCreate((uri) => {
    vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      `📄 New TypeScript file created: ${uri.fsPath}`,
      3 // MessageType.Information
    );
  });

  watcher.onDidDelete((uri) => {
    vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      `🗑️ File deleted: ${uri.fsPath}`,
      2 // MessageType.Warning
    );
  });

  context.subscriptions.push(watcher);
}

// Example 10: Custom extension integration
export class MyExtensionNotifier {
  static notifyBuildSuccess(version: string) {
    vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      `🎉 Build ${version} completed!\n\n` +
      `All checks passed.\n` +
      `Ready for deployment.`,
      3, // MessageType.Information
      [
        {
          title: '🚀 Deploy',
          command: { 
            id: 'myextension.deploy', 
            arguments: [version] 
          }
        },
        {
          title: '📦 Package',
          command: { 
            id: 'myextension.package', 
            arguments: [version] 
          }
        }
      ]
    );
  }

  static notifyBuildError(errors: string[]) {
    const errorList = errors.slice(0, 3).join('\n');
    const moreText = errors.length > 3 ? `\n... and ${errors.length - 3} more` : '';

    vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      `❌ Build failed with ${errors.length} error(s):\n\n${errorList}${moreText}`,
      1, // MessageType.Error
      [
        {
          title: '🔨 Rebuild',
          command: { id: 'myextension.rebuild' }
        },
        {
          title: '🐛 Debug',
          command: { id: 'myextension.debugBuild' }
        }
      ]
    );
  }
}

// Usage in your extension:
// MyExtensionNotifier.notifyBuildSuccess('1.2.3');
// MyExtensionNotifier.notifyBuildError(['Error 1', 'Error 2']);
