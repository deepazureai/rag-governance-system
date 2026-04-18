import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface FileAccessError {
  code: string;
  message: string;
  phase: string;
  timestamp: Date;
}

export interface ParsedRecord {
  lineNumber: number;
  data: Record<string, any>;
  validationErrors: string[];
}

export class LocalFolderConnector extends EventEmitter {
  private fileCheckInterval = 1000; // 1 second
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  async readDataFile(
    folderPath: string,
    fileName: string,
    applicationId: string
  ): Promise<{
    records: ParsedRecord[];
    metadata: { totalRecords: number; duplicates: number; errors: number };
    error?: FileAccessError;
  }> {
    const filePath = path.join(folderPath, fileName);

    try {
      logger.info(`[LocalFolderConnector] Starting file read: ${filePath}`);

      // Step 1: Validate folder exists
      if (!fs.existsSync(folderPath)) {
        const error: FileAccessError = {
          code: 'FOLDER_NOT_FOUND',
          message: `Folder does not exist: ${folderPath}`,
          phase: 'validation',
          timestamp: new Date(),
        };
        logger.error(`[LocalFolderConnector] ${error.message}`);
        return { records: [], metadata: { totalRecords: 0, duplicates: 0, errors: 0 }, error };
      }

      // Step 2: Validate file exists
      if (!fs.existsSync(filePath)) {
        const error: FileAccessError = {
          code: 'FILE_NOT_FOUND',
          message: `File does not exist: ${filePath}`,
          phase: 'validation',
          timestamp: new Date(),
        };
        logger.error(`[LocalFolderConnector] ${error.message}`);
        return { records: [], metadata: { totalRecords: 0, duplicates: 0, errors: 0 }, error };
      }

      // Step 3: Wait for exclusive access (no other process writing)
      const hasExclusiveAccess = await this.waitForExclusiveAccess(filePath);
      if (!hasExclusiveAccess) {
        const error: FileAccessError = {
          code: 'FILE_LOCKED',
          message: `File is being accessed by another process after ${this.maxRetries} retries`,
          phase: 'access_control',
          timestamp: new Date(),
        };
        logger.error(`[LocalFolderConnector] ${error.message}`);
        return { records: [], metadata: { totalRecords: 0, duplicates: 0, errors: 0 }, error };
      }

      // Step 4: Read file content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      logger.info(`[LocalFolderConnector] File read successfully, size: ${fileContent.length} bytes`);

      // Step 5: Parse records
      const { records, duplicates, errors } = this.parseRecords(fileContent, applicationId);

      return {
        records,
        metadata: {
          totalRecords: records.length,
          duplicates,
          errors,
        },
      };
    } catch (error: any) {
      logger.error(`[LocalFolderConnector] Unexpected error:`, error);
      return {
        records: [],
        metadata: { totalRecords: 0, duplicates: 0, errors: 1 },
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error.message,
          phase: 'reading',
          timestamp: new Date(),
        },
      };
    }
  }

  private async waitForExclusiveAccess(filePath: string): Promise<boolean> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Try to open file in exclusive mode
        const fd = fs.openSync(filePath, 'r');
        fs.closeSync(fd);
        logger.debug(`[LocalFolderConnector] Exclusive access acquired on attempt ${attempt + 1}`);
        return true;
      } catch (error: any) {
        if (attempt < this.maxRetries - 1) {
          logger.debug(
            `[LocalFolderConnector] File still locked, retrying... (${attempt + 1}/${this.maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    return false;
  }

  private parseRecords(
    fileContent: string,
    applicationId: string
  ): {
    records: ParsedRecord[];
    duplicates: number;
    errors: number;
  } {
    const records: ParsedRecord[] = [];
    const seenKeys = new Set<string>();
    let duplicateCount = 0;
    let errorCount = 0;

    // Split by semicolon to get individual records
    const rawRecords = fileContent.split(';').filter((r) => r.trim());

    rawRecords.forEach((rawRecord, index) => {
      const lineNumber = index + 1;
      const validationErrors: string[] = [];

      try {
        const record = this.parseNameValuePairs(rawRecord.trim());

        // Generate composite key for duplicate detection
        const recordKey = JSON.stringify(record);
        if (seenKeys.has(recordKey)) {
          duplicateCount++;
          validationErrors.push('Duplicate record detected and will be ignored');
          return;
        }
        seenKeys.add(recordKey);

        records.push({
          lineNumber,
          data: record,
          validationErrors,
        });
      } catch (error: any) {
        errorCount++;
        logger.warn(`[LocalFolderConnector] Parse error at line ${lineNumber}: ${error.message}`);
        validationErrors.push(`Parse error: ${error.message}`);
      }
    });

    logger.info(
      `[LocalFolderConnector] Parsed ${records.length} valid records, ${duplicateCount} duplicates, ${errorCount} errors`
    );

    return { records, duplicates: duplicateCount, errors: errorCount };
  }

  private parseNameValuePairs(recordString: string): Record<string, any> {
    const record: Record<string, any> = {};

    // Match pattern: key="value" or key='value'
    const pattern = /(\w+)=["']([^"']*?)["']/g;
    let match;

    while ((match = pattern.exec(recordString)) !== null) {
      const key = match[1];
      let value = match[2];

      // Try to parse as JSON if it looks like a number or boolean
      if (value === 'true') value = true as any;
      else if (value === 'false') value = false as any;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value) as any;

      record[key] = value;
    }

    if (Object.keys(record).length === 0) {
      throw new Error('No valid key-value pairs found in record');
    }

    return record;
  }

  async pollForFile(
    folderPath: string,
    fileName: string,
    applicationId: string,
    timeoutSeconds: number = 300
  ): Promise<boolean> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const filePath = path.join(folderPath, fileName);
      if (fs.existsSync(filePath)) {
        logger.info(
          `[LocalFolderConnector] File found after ${(Date.now() - startTime) / 1000}s: ${fileName}`
        );
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, this.fileCheckInterval));
    }

    logger.warn(
      `[LocalFolderConnector] File not found within ${timeoutSeconds}s timeout: ${fileName}`
    );
    return false;
  }

  getFileSize(folderPath: string, fileName: string): number | null {
    try {
      const filePath = path.join(folderPath, fileName);
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`[LocalFolderConnector] Cannot get file size:`, error);
      return null;
    }
  }
}

export const localFolderConnector = new LocalFolderConnector();
