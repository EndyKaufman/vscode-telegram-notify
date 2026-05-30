import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from './logger';

/**
 * File-based mutex to ensure only one VS Code instance runs the Telegram bot polling.
 * This prevents the "409 Conflict: terminated by other getUpdates request" error.
 */
export class BotMutex {
  private lockFilePath: string;
  private logger: Logger;
  private lockAcquired: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    // Use a global location that persists across VS Code instances
    this.lockFilePath = path.join(os.tmpdir(), 'vscode-telegram-bot.lock');
  }

  /**
   * Try to acquire the lock for bot polling
   * @returns true if lock was acquired, false if another instance already has it
   */
  async tryAcquire(): Promise<boolean> {
    try {
      // Check if lock file exists and is recent
      if (fs.existsSync(this.lockFilePath)) {
        const lockContent = fs.readFileSync(this.lockFilePath, 'utf-8');
        const lockData = JSON.parse(lockContent);
        const lockTime = new Date(lockData.timestamp);
        const now = new Date();
        const ageMs = now.getTime() - lockTime.getTime();

        // If lock is older than 5 minutes, consider it stale and take over
        if (ageMs > 5 * 60 * 1000) {
          this.logger.warn(`Found stale lock (age: ${Math.round(ageMs / 1000)}s), taking over`);
          return this.acquireLock();
        }

        this.logger.info('Another VS Code instance already has the bot polling lock');
        return false;
      }

      // No lock exists, try to acquire it
      return this.acquireLock();
    } catch (error) {
      this.logger.error('Error trying to acquire bot mutex', error);
      return false;
    }
  }

  /**
   * Acquire the lock by creating the lock file
   */
  private acquireLock(): boolean {
    try {
      const lockData = {
        pid: process.pid,
        timestamp: new Date().toISOString(),
        path: __dirname
      };

      fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2), 'utf-8');
      this.lockAcquired = true;

      // Start cleanup interval to remove lock if process dies
      this.startCleanupInterval();

      this.logger.info(`Bot polling lock acquired (PID: ${process.pid})`);
      return true;
    } catch (error) {
      this.logger.error('Failed to acquire bot mutex', error);
      return false;
    }
  }

  /**
   * Release the lock by removing the lock file
   */
  release(): void {
    if (!this.lockAcquired) {
      return;
    }

    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
        this.logger.info('Bot polling lock released');
      }
      this.lockAcquired = false;

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    } catch (error) {
      this.logger.error('Error releasing bot mutex', error);
    }
  }

  /**
   * Start periodic cleanup to remove stale locks
   * This handles the case where VS Code crashes without releasing the lock
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      try {
        if (fs.existsSync(this.lockFilePath)) {
          const lockContent = fs.readFileSync(this.lockFilePath, 'utf-8');
          const lockData = JSON.parse(lockContent);

          // Verify this is still our lock
          if (lockData.pid === process.pid) {
            // Update timestamp to show we're still alive
            lockData.timestamp = new Date().toISOString();
            fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2), 'utf-8');
          }
        }
      } catch (error) {
        this.logger.debug('Mutex cleanup check failed', error);
      }
    }, 60 * 1000); // Every minute
  }

  /**
   * Check if this instance has acquired the lock
   */
  isAcquired(): boolean {
    return this.lockAcquired;
  }

  /**
   * Clean up the mutex (should be called on extension deactivation)
   */
  dispose(): void {
    this.release();
  }
}
