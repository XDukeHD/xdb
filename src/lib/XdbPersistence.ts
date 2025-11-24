/**
 * XdbPersistence - Manages loading and persisting XdbEngine state to encrypted files
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { XdbEngine } from './XdbEngine';
import { XdbFile } from './XdbFile';

export class XdbPersistence {
  private engine: XdbEngine;
  private files: Map<string, XdbFile>;
  private dataDir: string;
  private encryptionKey: string;
  private maxDatabaseSize: number;

  constructor(
    engine: XdbEngine,
    dataDir: string,
    encryptionKey: string,
    maxDatabaseSize: number = 100 * 1024 * 1024,
  ) {
    this.engine = engine;
    this.dataDir = dataDir;
    this.encryptionKey = encryptionKey;
    this.files = new Map();
    this.maxDatabaseSize = maxDatabaseSize;
  }

  /**
   * Initialize data directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize data directory: ${error}`);
    }
  }

  /**
   * Get or create XdbFile for a database
   */
  private getXdbFile(databaseName: string): XdbFile {
    if (!this.files.has(databaseName)) {
      const filePath = join(this.dataDir, `${databaseName}.xdb`);
      this.files.set(databaseName, new XdbFile(filePath, this.encryptionKey));
    }
    return this.files.get(databaseName)!;
  }

  /**
   * Load database from disk
   */
  async loadDatabase(databaseName: string): Promise<void> {
    const file = this.getXdbFile(databaseName);

    try {
      const content = await file.read();
      const dbJson = JSON.parse(content);

      if (dbJson && dbJson[databaseName]) {
        this.engine.loadFromJson(content);
      } else {
        // File exists but is empty or doesn't contain this DB
        if (content && content !== '{}') {
          this.engine.loadFromJson(content);
        }
      }
    } catch (error) {
      throw new Error(`Failed to load database '${databaseName}': ${error}`);
    }
  }

  /**
   * Save database to disk
   */
  async saveDatabase(databaseName: string): Promise<void> {
    const file = this.getXdbFile(databaseName);

    try {
      const json = this.engine.exportToJson();

      // Check size limit
      if (Buffer.byteLength(json, 'utf-8') > this.maxDatabaseSize) {
        throw new Error(
          `Database size exceeds limit of ${this.maxDatabaseSize} bytes`,
        );
      }

      await file.write(json);
    } catch (error) {
      throw new Error(`Failed to save database '${databaseName}': ${error}`);
    }
  }

  /**
   * List existing databases on disk
   */
  async listDatabasesOnDisk(): Promise<string[]> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      const files = await fs.readdir(this.dataDir);

      return files
        .filter((f) => f.endsWith('.xdb'))
        .map((f) => f.replace('.xdb', ''));
    } catch (error) {
      throw new Error(`Failed to list databases: ${error}`);
    }
  }

  /**
   * Delete database file
   */
  async deleteDatabase(databaseName: string): Promise<void> {
    const file = this.getXdbFile(databaseName);

    try {
      await file.delete();
      this.files.delete(databaseName);
    } catch (error) {
      throw new Error(`Failed to delete database '${databaseName}': ${error}`);
    }
  }

  /**
   * Backup database file
   */
  async backupDatabase(databaseName: string, backupPath: string): Promise<void> {
    const file = this.getXdbFile(databaseName);

    try {
      await file.backup(backupPath);
    } catch (error) {
      throw new Error(`Failed to backup database '${databaseName}': ${error}`);
    }
  }

  /**
   * Export database (encrypted)
   */
  async exportDatabase(databaseName: string): Promise<string> {
    const file = this.getXdbFile(databaseName);

    try {
      return await file.read();
    } catch (error) {
      throw new Error(`Failed to export database '${databaseName}': ${error}`);
    }
  }

  /**
   * Import database (encrypted)
   */
  async importDatabase(databaseName: string, encryptedContent: string): Promise<void> {
    const file = this.getXdbFile(databaseName);

    try {
      await file.write(encryptedContent);
    } catch (error) {
      throw new Error(`Failed to import database '${databaseName}': ${error}`);
    }
  }

  /**
   * Get database file size
   */
  async getDatabaseFileSize(databaseName: string): Promise<number> {
    const file = this.getXdbFile(databaseName);

    try {
      return await file.getSize();
    } catch (error) {
      throw new Error(`Failed to get database size: ${error}`);
    }
  }

  /**
   * Check if database exists on disk
   */
  async databaseExistsOnDisk(databaseName: string): Promise<boolean> {
    const file = this.getXdbFile(databaseName);

    try {
      return await file.exists();
    } catch (error) {
      throw new Error(`Failed to check database existence: ${error}`);
    }
  }
}
