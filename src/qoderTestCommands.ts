import * as vscode from 'vscode';
import { QoderIntegration } from './qoderIntegration';

/**
 * Qoder Test Commands
 * Commands to test Qoder integration with Telegram
 */
export class QoderTestCommands {
  private disposables: vscode.Disposable[] = [];

  registerAll(): void {
    // Test 1: Forward prompt
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.qoderPrompt',
        () => this.testQoderPrompt()
      )
    );

    // Test 2: Forward agent task
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.qoderAgentTask',
        () => this.testQoderAgentTask()
      )
    );

    // Test 3: Forward completion
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.qoderCompletion',
        () => this.testQoderCompletion()
      )
    );

    // Test 4: Forward error
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.qoderError',
        () => this.testQoderError()
      )
    );

    // Test 5: Forward progress
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.qoderProgress',
        () => this.testQoderProgress()
      )
    );

    // Test 6: Sequential Qoder notifications
    this.disposables.push(
      vscode.commands.registerCommand(
        'telegram-notify.test.qoderSequential',
        () => this.testQoderSequential()
      )
    );

    console.log('Qoder test commands registered');
  }

  private async testQoderPrompt(): Promise<void> {
    await QoderIntegration.forwardQoderNotification(
      'Refactor the authentication module to use JWT tokens instead of session-based authentication',
      'prompt'
    );
    vscode.window.showInformationMessage('Test: Qoder prompt sent');
  }

  private async testQoderAgentTask(): Promise<void> {
    await QoderIntegration.forwardQoderNotification(
      'Running build with production optimizations...',
      'task',
      'Target: production\nOptimizations: minification, tree-shaking, code-splitting\nEstimated time: 2-3 minutes'
    );
    vscode.window.showInformationMessage('Test: Qoder agent task sent');
  }

  private async testQoderCompletion(): Promise<void> {
    await QoderIntegration.forwardQoderNotification(
      'All tests passed successfully! 142/142 tests completed in 8.5 seconds',
      'response',
      'Test coverage: 87%\nFiles tested: 45\nAssertions: 523'
    );
    vscode.window.showInformationMessage('Test: Qoder completion sent');
  }

  private async testQoderError(): Promise<void> {
    await QoderIntegration.forwardQoderNotification(
      'Build failed: Cannot resolve dependency "react-dom" in module "ui-components"',
      'error',
      'Error code: MODULE_NOT_FOUND\nFile: src/ui/App.tsx\nLine: 15\nSuggestion: Run "npm install react-dom"'
    );
    vscode.window.showInformationMessage('Test: Qoder error sent');
  }

  private async testQoderProgress(): Promise<void> {
    await QoderIntegration.forwardQoderNotification(
      'Processing code analysis... Step 3 of 5 completed',
      'progress',
      'Completed:\n✅ Syntax check\n✅ Type validation\n✅ Dependency analysis\n\nIn progress:\n⏳ Performance optimization\n\nETA: 45 seconds'
    );
    vscode.window.showInformationMessage('Test: Qoder progress sent');
  }

  private async testQoderSequential(): Promise<void> {
    // Step 1: Start task
    await QoderIntegration.forwardQoderNotification(
      'Starting Quest: Refactor authentication system',
      'task',
      'Steps: 5\nEstimated time: 15 minutes'
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Progress
    await QoderIntegration.forwardQoderNotification(
      'Step 1/5 completed: Analyzed current authentication flow',
      'progress',
      'Found 3 modules to refactor'
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Progress
    await QoderIntegration.forwardQoderNotification(
      'Step 2/5 completed: Updated database schema',
      'progress',
      'Progress: 40%'
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Progress
    await QoderIntegration.forwardQoderNotification(
      'Step 3/5 completed: Implemented JWT token generation',
      'progress',
      'Progress: 60%'
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Completion
    await QoderIntegration.forwardQoderNotification(
      'Quest completed successfully! All 5 steps finished',
      'response',
      '✅ Authentication refactored\n✅ JWT tokens implemented\n✅ Tests passing\n✅ Documentation updated'
    );

    vscode.window.showInformationMessage('Test: Qoder sequential notifications sent');
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
