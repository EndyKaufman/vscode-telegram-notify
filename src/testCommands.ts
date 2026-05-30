import * as vscode from 'vscode';
import { MessageType, ExtendedMessageItem } from './types';

/**
 * Test Commands for Telegram Notify Extension
 * Register these commands to test different notification scenarios
 */
export class TestCommands {
  private disposables: vscode.Disposable[] = [];

  constructor() {}

  registerAll(): void {
    // Test 1: Simple notifications
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.simpleInfo',
        () => this.testSimpleInfo()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.simpleWarning',
        () => this.testSimpleWarning()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.simpleError',
        () => this.testSimpleError()
      )
    );

    // Test 2: Notifications with buttons
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.errorWithButtons',
        () => this.testErrorWithButtons()
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.warningWithMultipleButtons',
        () => this.testWarningWithMultipleButtons()
      )
    );

    // Test 3: Long messages
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.longMessage',
        () => this.testLongMessage()
      )
    );

    // Test 4: Special characters
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.specialCharacters',
        () => this.testSpecialCharacters()
      )
    );

    // Test 5: Multi-line messages
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.multilineMessage',
        () => this.testMultilineMessage()
      )
    );

    // Test 6: Batch notifications
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.batchNotifications',
        () => this.testBatchNotifications()
      )
    );

    // Test 7: Sequential notifications
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.sequentialNotifications',
        () => this.testSequentialNotifications()
      )
    );

    // Test 8: Button timeout test
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.buttonTimeout',
        () => this.testButtonTimeout()
      )
    );

    // Test 9: All button types
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.allButtonTypes',
        () => this.testAllButtonTypes()
      )
    );

    // Test 10: HTML/Markdown formatting
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.markdownFormatting',
        () => this.testMarkdownFormatting()
      )
    );

    console.log('Test commands registered');
  }

  // Test 1: Simple notifications
  private async testSimpleInfo(): Promise<void> {
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      'This is a simple information notification',
      MessageType.Information
    );
    vscode.window.showInformationMessage('Sent simple info notification');
  }

  private async testSimpleWarning(): Promise<void> {
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      'This is a simple warning notification',
      MessageType.Warning
    );
    vscode.window.showInformationMessage('Sent simple warning notification');
  }

  private async testSimpleError(): Promise<void> {
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      'This is a simple error notification',
      MessageType.Error
    );
    vscode.window.showInformationMessage('Sent simple error notification');
  }

  // Test 2: Notifications with buttons
  private async testErrorWithButtons(): Promise<void> {
    const buttons: ExtendedMessageItem[] = [
      {
        title: '🔨 Rebuild',
        command: { id: 'workbench.action.tasks.rebuild' }
      },
      {
        title: '📋 Show Errors',
        command: { id: 'workbench.action.showErrorsWarnings' }
      },
      {
        title: '❌ Dismiss'
      }
    ];

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      'Build failed with 3 errors in module XYZ.\n\nError: Cannot find module "abc"\nError: Syntax error in line 42\nError: Type mismatch',
      MessageType.Error,
      buttons
    );
    vscode.window.showInformationMessage('Sent error with buttons');
  }

  private async testWarningWithMultipleButtons(): Promise<void> {
    const buttons: ExtendedMessageItem[] = [
      {
        title: '🔍 View Details',
        command: { id: 'workbench.action.output.toggleOutput' }
      },
      {
        title: '🔧 Fix Issue',
        command: { id: 'editor.action.quickFix' }
      },
      {
        title: '📖 Documentation',
        command: { 
          id: 'vscode.open', 
          arguments: [vscode.Uri.parse('https://code.visualstudio.com/docs')] 
        }
      },
      {
        title: '⏰ Remind Later'
      }
    ];

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '⚠️ Deprecated API usage detected\n\nThe extension is using deprecated methods that will be removed in future versions.',
      MessageType.Warning,
      buttons
    );
    vscode.window.showInformationMessage('Sent warning with multiple buttons');
  }

  // Test 3: Long messages
  private async testLongMessage(): Promise<void> {
    const longMessage = `
This is a very long notification message to test how the extension handles large amounts of text. 

In software engineering, a build failure can occur for many reasons:

1. **Compilation Errors**: Syntax errors, type mismatches, missing imports
2. **Dependency Issues**: Missing packages, version conflicts
3. **Configuration Problems**: Incorrect build settings, environment variables
4. **Resource Limitations**: Out of memory, disk space issues
5. **External Service Failures**: API timeouts, network issues

When a build fails, it's important to:
- Check the error logs carefully
- Identify the root cause
- Fix the issue systematically
- Test the changes thoroughly
- Rebuild to verify the fix

This message is intentionally long to test message truncation and formatting in Telegram. 
The extension should handle this gracefully by truncating the message if it exceeds 
the maximum length limit configured in the settings.

Additional debugging information:
- Timestamp: ${new Date().toISOString()}
- Workspace: ${vscode.workspace.name || 'No workspace'}
- Active editor: ${vscode.window.activeTextEditor?.document.fileName || 'None'}
- VS Code version: ${vscode.version}
    `.trim();

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      longMessage,
      MessageType.Error,
      [
        { title: '📊 View Full Log', command: { id: 'workbench.action.output.toggleOutput' } },
        { title: '🔍 Search Errors', command: { id: 'workbench.action.findInFiles' } }
      ]
    );
    vscode.window.showInformationMessage('Sent long message');
  }

  // Test 4: Special characters
  private async testSpecialCharacters(): Promise<void> {
    const specialCharsMessage = `
Special characters test:

- Asterisks: ***bold*** and *italic*
- Underscores: __bold__ and _italic_
- Tildes: ~~strikethrough~~
- Backticks: \`inline code\`
- Brackets: [text](url)
- Hash: # Heading
- Plus: + Item
- Minus: - Item
- Equals: ===
- Pipe: | column |
- Braces: {variable}
- Dots: ...ellipsis...
- Exclamation: Warning!

Mathematical symbols:
- Sum: 1 + 2 = 3
- Product: 2 × 3 = 6
- Division: 6 ÷ 2 = 3

Code example:
\`\`\`typescript
const message = "Hello, World!";
console.log(message);
\`\`\`
    `.trim();

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      specialCharsMessage,
      MessageType.Information
    );
    vscode.window.showInformationMessage('Sent special characters test');
  }

  // Test 5: Multi-line messages
  private async testMultilineMessage(): Promise<void> {
    const multilineMessage = 
`📦 Deployment Notification

┌─────────────────────────────────┐
│  Status: ✅ SUCCESS              │
│  Environment: Production         │
│  Version: 2.1.0                  │
└─────────────────────────────────┘

📊 Metrics:
  • Response Time: 45ms
  • Error Rate: 0.01%
  • Uptime: 99.99%

🔗 Links:
  • Dashboard: https://example.com
  • Logs: https://logs.example.com
  • Metrics: https://metrics.example.com

📝 Changes:
  1. Added new feature X
  2. Fixed bug Y
  3. Improved performance by 20%

👥 Team:
  • Deployed by: John Doe
  • Reviewed by: Jane Smith
  • Approved by: Bob Johnson`;

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      multilineMessage,
      MessageType.Information,
      [
        { title: '📊 Dashboard', command: { id: 'vscode.open', arguments: [vscode.Uri.parse('https://example.com')] } },
        { title: '📝 Release Notes', command: { id: 'vscode.open', arguments: [vscode.Uri.parse('https://example.com/releases')] } }
      ]
    );
    vscode.window.showInformationMessage('Sent multiline message');
  }

  // Test 6: Batch notifications
  private async testBatchNotifications(): Promise<void> {
    const notifications = [
      { message: 'Test 1: Building project...', severity: MessageType.Information },
      { message: 'Test 2: Running tests...', severity: MessageType.Information },
      { message: 'Test 3: Tests passed!', severity: MessageType.Information },
      { message: 'Test 4: Deploying to staging...', severity: MessageType.Warning },
      { message: 'Test 5: Deployment complete!', severity: MessageType.Information },
    ];

    for (const notif of notifications) {
      await vscode.commands.executeCommand(
        'telegram-notify.sendNotification',
        notif.message,
        notif.severity
      );
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    vscode.window.showInformationMessage(`Sent ${notifications.length} batch notifications`);
  }

  // Test 7: Sequential notifications
  private async testSequentialNotifications(): Promise<void> {
    // Step 1
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '🚀 Starting deployment process...',
      MessageType.Information
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '📦 Packaging application...',
      MessageType.Information
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '🔍 Running pre-deployment checks...',
      MessageType.Warning
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4 - Final with buttons
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '✅ Deployment completed successfully!\n\nAll checks passed.\nApplication is now live.',
      MessageType.Information,
      [
        { title: '🌐 Open App', command: { id: 'vscode.open', arguments: [vscode.Uri.parse('https://example.com')] } },
        { title: '📊 View Metrics', command: { id: 'vscode.open', arguments: [vscode.Uri.parse('https://metrics.example.com')] } },
        { title: '📋 View Logs', command: { id: 'workbench.action.output.toggleOutput' } }
      ]
    );

    vscode.window.showInformationMessage('Sent sequential notifications');
  }

  // Test 8: Button timeout test
  private async testButtonTimeout(): Promise<void> {
    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '⏰ Button Timeout Test\n\nThese buttons will expire after the configured timeout (default: 5 minutes).\n\nTry clicking them before they expire!',
      MessageType.Warning,
      [
        { 
          title: '✅ I clicked in time!',
          command: { 
            id: 'telegram-notify.test.buttonClicked',
            arguments: ['fast']
          } 
        },
        { 
          title: '⏰ Too slow',
          command: { 
            id: 'telegram-notify.test.buttonClicked',
            arguments: ['slow']
          } 
        }
      ]
    );

    // Register temporary command for button
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.buttonClicked',
        (speed: string) => {
          vscode.window.showInformationMessage(`Button clicked! Speed: ${speed}`);
        }
      )
    );

    vscode.window.showInformationMessage('Sent button timeout test');
  }

  // Test 9: All button types
  private async testAllButtonTypes(): Promise<void> {
    const buttons: ExtendedMessageItem[] = [
      {
        title: '🔨 Execute Command',
        command: { id: 'workbench.action.reloadWindow' }
      },
      {
        title: '🌐 Open URL',
        command: { 
          id: 'vscode.open', 
          arguments: [vscode.Uri.parse('https://code.visualstudio.com')] 
        }
      },
      {
        title: '📁 Open File',
        command: { 
          id: 'vscode.open', 
          arguments: [vscode.Uri.file(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '/tmp')] 
        }
      },
      {
        title: '💾 Save All',
        command: { id: 'workbench.action.files.saveAll' }
      },
      {
        title: '🎨 Change Theme',
        command: { id: 'workbench.action.selectTheme' }
      },
      {
        title: '⚙️ Open Settings',
        command: { id: 'workbench.action.openSettings' }
      },
      {
        title: '📊 Show Output',
        command: { id: 'workbench.action.output.toggleOutput' }
      },
      {
        title: '❌ Just Acknowledge'
        // No command - just acknowledge
      }
    ];

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      '🎯 All Button Types Test\n\nThis notification has 8 different buttons to test various VS Code commands.\n\nTry clicking each button!',
      MessageType.Information,
      buttons
    );
    vscode.window.showInformationMessage('Sent all button types test');
  }

  // Test 10: Markdown formatting
  private async testMarkdownFormatting(): Promise<void> {
    const markdownMessage = `
# 📝 Markdown Formatting Test

## Headers
### H3 Header
#### H4 Header

**Bold text** and *italic text*

~~Strikethrough text~~

\`Inline code: const x = 42;\`

### Lists

**Ordered:**
1. First item
2. Second item
3. Third item

**Unordered:**
- Item A
- Item B
  - Sub-item B1
  - Sub-item B2
- Item C

### Code Block

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const message = greet('World');
console.log(message);
\`\`\`

### Links

[VS Code Documentation](https://code.visualstudio.com/docs)

### Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Notifications | ✅ Done | High |
| Buttons | ✅ Done | High |
| Filters | ✅ Done | Medium |

---

> **Note:** This is a blockquote with important information.

**Variables:** \`message = "Hello"\`, \`count = 42\`
    `.trim();

    await vscode.commands.executeCommand(
      'telegram-notify.sendNotification',
      markdownMessage,
      MessageType.Information,
      [
        { title: '📖 View Docs', command: { id: 'vscode.open', arguments: [vscode.Uri.parse('https://code.visualstudio.com/docs')] } },
        { title: '🧪 Run Tests', command: { id: 'workbench.action.tasks.test' } }
      ]
    );
    vscode.window.showInformationMessage('Sent markdown formatting test');
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
