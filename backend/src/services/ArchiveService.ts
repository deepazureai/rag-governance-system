import { v4 as uuidv4 } from 'uuid';
import { Archive, IArchive } from '../models/Archive';
import { RawDataRecord } from '../models/RawDataRecord';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

export class ArchiveService {
  private archivePath = process.env.ARCHIVE_PATH || './archives';

  constructor() {
    // Ensure archive directory exists
    if (!fs.existsSync(this.archivePath)) {
      fs.mkdirSync(this.archivePath, { recursive: true });
    }
  }

  /**
   * Archive all existing records for an application before batch processing
   */
  async archiveExistingRecords(applicationId: string, batchId: string): Promise<string> {
    try {
      const archiveId = uuidv4();
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      logger.info(`[ArchiveService] Starting archive for app ${applicationId}, batch ${batchId}`);

      // Get all existing records
      const existingRecords = await RawDataRecord.find({ applicationId });

      if (existingRecords.length === 0) {
        logger.info(`[ArchiveService] No records to archive for app ${applicationId}`);
        return archiveId;
      }

      // Create archive file name: app-id_batch-id_date_time.json.gz
      const timestamp = today.getTime();
      const fileName = `${applicationId}_${dateStr}_${timestamp}.json.gz`;
      const filePath = path.join(this.archivePath, fileName);

      // Convert records to JSON and compress
      const jsonData = JSON.stringify(existingRecords);
      const compressed = await this.compressData(jsonData);

      // Write compressed file
      fs.writeFileSync(filePath, compressed);

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(jsonData).digest('hex');

      // Save archive metadata to MongoDB
      const archiveRecord = new Archive({
        archiveId,
        applicationId,
        batchId,
        archiveFileName: fileName,
        archiveStoragePath: filePath,
        archiveType: 'daily',
        metadata: {
          recordCount: existingRecords.length,
          compression: 'gzip',
          fileSize: compressed.length,
          checksum,
          dateRange: {
            startDate: existingRecords[0].createdAt,
            endDate: existingRecords[existingRecords.length - 1].createdAt,
          },
        },
        retentionPolicy: {
          expiryDate: this.calculateExpiryDate(90), // 90 days retention
          isLocked: false,
        },
        archivedAt: new Date(),
      });

      await archiveRecord.save();

      logger.info(
        `[ArchiveService] Archive created: ${fileName} (${existingRecords.length} records, ${compressed.length} bytes)`
      );

      return archiveId;
    } catch (error: any) {
      logger.error(`[ArchiveService] Archive failed:`, error);
      throw error;
    }
  }

  /**
   * Retrieve archived records
   */
  async getArchiveData(archiveId: string): Promise<any[] | null> {
    try {
      const archive = await Archive.findOne({ archiveId });

      if (!archive) {
        logger.warn(`[ArchiveService] Archive not found: ${archiveId}`);
        return null;
      }

      if (!fs.existsSync(archive.archiveStoragePath)) {
        logger.warn(`[ArchiveService] Archive file not found: ${archive.archiveStoragePath}`);
        return null;
      }

      const compressed = fs.readFileSync(archive.archiveStoragePath);
      const decompressed = await this.decompressData(compressed);
      const data = JSON.parse(decompressed);

      return data;
    } catch (error: any) {
      logger.error(`[ArchiveService] Failed to retrieve archive:`, error);
      throw error;
    }
  }

  /**
   * Get list of archives for an application
   */
  async getApplicationArchives(
    applicationId: string,
    limit: number = 30
  ): Promise<IArchive[]> {
    return Archive.find({ applicationId }).sort({ archivedAt: -1 }).limit(limit);
  }

  /**
   * Clean up expired archives based on retention policy
   */
  async cleanupExpiredArchives(): Promise<number> {
    try {
      const now = new Date();
      const result = await Archive.updateMany(
        {
          'retentionPolicy.expiryDate': { $lt: now },
          'retentionPolicy.isLocked': false,
        },
        {
          $set: { 'retentionPolicy.isLocked': true },
        }
      );

      logger.info(`[ArchiveService] Marked ${result.modifiedCount} archives for deletion`);

      // Delete marked files
      const archivesToDelete = await Archive.find({
        'retentionPolicy.isLocked': true,
      });

      let deletedCount = 0;
      for (const archive of archivesToDelete) {
        try {
          if (fs.existsSync(archive.archiveStoragePath)) {
            fs.unlinkSync(archive.archiveStoragePath);
            deletedCount++;
          }
          await Archive.deleteOne({ archiveId: archive.archiveId });
        } catch (error) {
          logger.error(`[ArchiveService] Failed to delete archive file:`, error);
        }
      }

      logger.info(`[ArchiveService] Deleted ${deletedCount} expired archive files`);
      return deletedCount;
    } catch (error: any) {
      logger.error(`[ArchiveService] Cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Export archive to external blob storage (Azure Blob)
   */
  async exportArchiveToBlob(archiveId: string, blobConnectionString: string): Promise<boolean> {
    try {
      const archive = await Archive.findOne({ archiveId });

      if (!archive || !fs.existsSync(archive.archiveStoragePath)) {
        logger.warn(`[ArchiveService] Archive not found for export: ${archiveId}`);
        return false;
      }

      // TODO: Implement Azure Blob Storage upload
      logger.info(`[ArchiveService] Archive ${archiveId} would be exported to blob storage`);

      return true;
    } catch (error: any) {
      logger.error(`[ArchiveService] Export to blob failed:`, error);
      throw error;
    }
  }

  private async compressData(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data, 'utf-8'), (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  private async decompressData(data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (error, result) => {
        if (error) reject(error);
        else resolve(result.toString('utf-8'));
      });
    });
  }

  private calculateExpiryDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}

export const archiveService = new ArchiveService();
