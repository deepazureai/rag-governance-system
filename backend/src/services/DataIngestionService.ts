import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class DataIngestionService {
  async ingestFromLocalFolder(applicationId: string, folderPath: string, fileName: string) {
    try {
      logger.info(`[v0] Starting data ingestion from local folder for app: ${applicationId}`);
      const filePath = path.join(folderPath, fileName);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = this.parseSemicolonDelimitedRecords(fileContent);
      
      logger.info(`[v0] Parsed ${records.length} records from file`);
      return {
        totalRecords: records.length,
        records,
        fileName,
        fileSize: fs.statSync(filePath).size,
      };
    } catch (error) {
      logger.error(`[v0] Data ingestion error from local folder:`, error);
      throw error;
    }
  }

  private parseSemicolonDelimitedRecords(content: string): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    const recordStrings = content.split(';').filter((r) => r.trim());

    for (const recordStr of recordStrings) {
      try {
        const record: Record<string, unknown> = {};
        const pairs = recordStr.split(',');

        for (const pair of pairs) {
          const [key, value] = pair.split('=').map((s) => s.trim());
          if (key && value) {
            record[key] = this.parseValue(value);
          }
        }

        if (Object.keys(record).length > 0) {
          records.push(record);
        }
      } catch (error) {
        logger.error(`[v0] Error parsing record:`, error);
      }
    }

    return records;
  }

  private parseValue(value: string): unknown {
    const cleaned = value.replace(/^["']|["']$/g, '');
    if (cleaned === 'true') return true;
    if (cleaned === 'false') return false;
    if (!isNaN(Number(cleaned)) && cleaned !== '') return Number(cleaned);
    return cleaned;
  }
}
