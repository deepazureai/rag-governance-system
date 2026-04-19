import { logger } from '../utils/logger';
import { ApplicationMetric } from '../models/database';

export class DataProcessingService {
  async processRawData(
    applicationId: string,
    applicationName: string,
    records: Record<string, unknown>[],
    sourceType: string,
    sourceFile?: string
  ): Promise<ApplicationMetric[]> {
    try {
      logger.info(`[v0] Processing ${records.length} records for application: ${applicationName}`);
      
      const processedMetrics: ApplicationMetric[] = [];
      const duplicateSet = new Set<string>();

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // Create checksum for duplicate detection
        const checksum = this.createChecksum(JSON.stringify(record));
        if (duplicateSet.has(checksum)) {
          logger.info(`[v0] Duplicate record detected at index ${i}`);
          continue;
        }
        duplicateSet.add(checksum);

        const metric: ApplicationMetric = {
          id: `metric_${applicationId}_${Date.now()}_${i}`,
          applicationId,
          applicationName,
          recordIndex: i,
          rawData: record,
          processedMetrics: this.extractMetricsFromRecord(record),
          dataQuality: this.assessDataQuality(record),
          metadata: {
            ingestionDate: new Date(),
            sourceType: sourceType as any,
            checksum,
            isDuplicate: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        processedMetrics.push(metric);
      }

      logger.info(`[v0] Processed ${processedMetrics.length} unique metrics (removed ${records.length - processedMetrics.length} duplicates)`);
      return processedMetrics;
    } catch (error) {
      logger.error(`[v0] Error processing data:`, error);
      throw error;
    }
  }

  private extractMetricsFromRecord(record: Record<string, unknown>) {
    return {
      userPrompt: record.user_prompt || record.userPrompt,
      context: record.context,
      response: record.response,
      userId: record.user_id || record.userId,
      relevanceScore: this.parseScore(record.relevance_score),
      coherenceScore: this.parseScore(record.coherence_score),
      similarityScore: this.parseScore(record.similarity_score),
      summaryScore: this.parseScore(record.summary_score),
    };
  }

  private parseScore(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return !isNaN(num) ? num : undefined;
    }
    return undefined;
  }

  private assessDataQuality(record: Record<string, unknown>) {
    const requiredFields = ['user_prompt', 'context', 'response'];
    const completeFields: string[] = [];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (record[field] || record[field.replace('_', '')]) {
        completeFields.push(field);
      } else {
        missingFields.push(field);
      }
    }

    return {
      completeFields,
      missingFields,
      validationStatus: missingFields.length === 0 ? 'valid' : missingFields.length < 2 ? 'partial' : 'invalid',
    };
  }

  private createChecksum(data: string): string {
    // Simple checksum - in production use crypto.createHash
    return data.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0).toString(16);
  }
}
