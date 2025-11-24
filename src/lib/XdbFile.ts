/**
 * XdbFile - Handles file I/O with encryption and atomic writes
 */

import { promises as fs } from 'fs';
import { encrypt, decrypt, EncryptedData } from './crypto';

export class XdbFile {
  private filePath: string;
  private encryptionKey: string;
  private writeInProgress: boolean;
  private tempFilePath: string;

  constructor(filePath: string, encryptionKey: string) {
    this.filePath = filePath;
    this.encryptionKey = encryptionKey;
    this.writeInProgress = false;
    this.tempFilePath = `${filePath}.tmp`;
  }

  /**
   * Read and decrypt database file
   */
  async read(): Promise<string> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const encryptedData = JSON.parse(data) as EncryptedData;
      const decrypted = await decrypt(encryptedData, this.encryptionKey);
      return decrypted;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet
        return '{}';
      }
      throw new Error(`Failed to read database file: ${error}`);
    }
  }

  /**
   * Write and encrypt database file atomically
   */
  async write(content: string): Promise<void> {
    if (this.writeInProgress) {
      throw new Error('Another write operation is in progress');
    }

    this.writeInProgress = true;

    try {
      // Encrypt the content
      const encryptedData = await encrypt(content, this.encryptionKey);

      // Write to temporary file
      await fs.writeFile(this.tempFilePath, JSON.stringify(encryptedData), 'utf-8');

      // Atomic rename
      await fs.rename(this.tempFilePath, this.filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(this.tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to write database file: ${error}`);
    } finally {
      this.writeInProgress = false;
    }
  }

  /**
   * Check if file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getSize(): Promise<number> {
    try {
      const stats = await fs.stat(this.filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Delete file
   */
  async delete(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Backup file to a new location
   */
  async backup(backupPath: string): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath);
      await fs.writeFile(backupPath, content);
    } catch (error) {
      throw new Error(`Failed to backup database file: ${error}`);
    }
  }
}
