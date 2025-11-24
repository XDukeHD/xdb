/**
 * Type definitions and interfaces for the backup system
 */

export interface BackupMetadata {
  backupId: string;
  createdAt: string; // ISO 8601
  modifiedAt: string; // ISO 8601
  version: string; // Engine version at backup time
  fileCount: number;
  totalSize: number;
  checksums: Record<string, string>; // filename -> SHA-256
}

export interface BackupOverviewXdbInfo {
  // Header and format version
  format: 'xdbInfo_v1';
  
  // Security credentials (from environment at backup time)
  authKey: string;
  encryptionKey: string;
  
  // Timestamps
  createdAt: string; // ISO 8601
  modifiedAt: string; // ISO 8601
  
  // Version info
  engineVersion: string;
  systemVersion: string;
  
  // File registry
  files: Array<{
    filename: string;
    size: number;
    checksum: string; // SHA-256
    compressed: boolean;
  }>;
  
  // Metadata
  totalFiles: number;
  totalSize: number;
  backupId: string;
}

export interface SystemBackupRecord {
  backupId: string;
  createdAt: string;
  modifiedAt: string;
  password: string; // Encrypted with XDB_ENCRYPTION_KEY
  fileCount: number;
  totalSize: number;
  checksums: Record<string, string>;
  version: string;
  status: 'success' | 'partial' | 'failed';
  failureLog?: string;
}

export interface SystemXdbCore {
  // Format version
  format: 'xdbCore_v1';
  
  // Backup registry
  backups: SystemBackupRecord[];
  
  // Restoration history
  restorations: Array<{
    backupId: string;
    restoredAt: string;
    status: 'success' | 'partial' | 'failed';
    failureLog?: string;
  }>;
  
  // Configuration
  maxBackups: number;
  lastBackupId?: string;
  lastRestorationId?: string;
}

export interface RestorationReport {
  status: 'success' | 'partial' | 'failed';
  message: string;
  restoredCount: number;
  failedCount: number;
  totalCount: number;
  failures: Array<{
    filename: string;
    reason: string;
  }>;
  timestamp: string;
}
