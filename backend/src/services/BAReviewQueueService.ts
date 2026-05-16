import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface RawDataRecord {
  _id: string;
  applicationId: string;
  userPrompt: string;
  llmResponse: string;
  evaluationScores?: Array<{
    framework: string;
    scores: Record<string, number>;
  }>;
  userFeedback?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    comment?: string;
  };
  totalLatency?: number;
  baReview?: {
    reviewStatus: string;
  };
}

interface BAReviewQueueItem {
  applicationId: string;
  rawDataRecordId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number;
  priorityReason: string;
  userPrompt: string;
  llmResponse: string;
  averageScore?: number;
  userFeedback?: string;
  latency?: number;
  status: 'pending' | 'in_progress' | 'reviewed';
  queuedAt: Date;
  similarRecordIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class BAReviewQueueService {
  /**
   * Analyze raw data records and populate BA review queue with prioritized items
   */
  async populateReviewQueue(applicationId: string, limit: number = 50): Promise<any> {
    const queueId = uuidv4();
    logger.info(`[BAReviewQueueService] Starting queue population ${queueId} for app ${applicationId}`);

    try {
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');
      const BAReviewQueueCollection = mongoose.connection.collection('bareviewqueue');

      // Find raw data records that need review (not yet reviewed or with low scores)
      const recordsToReview = await RawDataCollection.find({
        applicationId,
        $or: [
          { 'baReview.reviewStatus': { $in: ['pending', null] } },
          { 'evaluationScores.scores.faithfulness': { $lt: 0.7 } },
          { 'userFeedback.sentiment': 'negative' },
          { totalLatency: { $gt: 3000 } }, // > 3 seconds
        ],
      })
        .sort({ totalLatency: -1, '_id': -1 })
        .limit(limit * 2) // Get more to calculate priorities
        .toArray();

      logger.info(`[BAReviewQueueService] Found ${recordsToReview.length} records needing review`);

      if (recordsToReview.length === 0) {
        logger.info(`[BAReviewQueueService] No records need review for app ${applicationId}`);
        return { queueId, itemsAdded: 0, totalItems: 0 };
      }

      // Calculate priority scores for each record
      const queueItems: BAReviewQueueItem[] = [];
      const processedRecordIds = new Set<string>();

      for (const record of recordsToReview) {
        if (processedRecordIds.has(record._id.toString())) continue;

        const typedRecord = record as unknown as RawDataRecord;
        const { priorityScore, priorityReason } = this.calculatePriority(typedRecord);
        const averageScore = this.calculateAverageScore(typedRecord);

        const queueItem: BAReviewQueueItem = {
          applicationId,
          rawDataRecordId: record._id.toString(),
          priority: this.getPriorityLevel(priorityScore),
          priorityScore,
          priorityReason,
          userPrompt: typedRecord.userPrompt,
          llmResponse: typedRecord.llmResponse,
          averageScore,
          userFeedback: typedRecord.userFeedback?.sentiment,
          latency: typedRecord.totalLatency,
          status: 'pending',
          queuedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        queueItems.push(queueItem);
        processedRecordIds.add(record._id.toString());

        if (queueItems.length >= limit) break;
      }

      // Sort by priority score (descending)
      queueItems.sort((a, b) => b.priorityScore - a.priorityScore);

      // Insert into queue
      if (queueItems.length > 0) {
        const insertResult = await BAReviewQueueCollection.insertMany(queueItems);
        const insertedCount = Object.keys(insertResult.insertedIds).length;
        logger.info(`[BAReviewQueueService] Added ${insertedCount} items to review queue`);
      }

      return {
        queueId,
        itemsAdded: queueItems.length,
        totalItems: queueItems.length,
        items: queueItems.slice(0, 10), // Return top 10
      };
    } catch (error: any) {
      logger.error(`[BAReviewQueueService] Error populating queue:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate priority score (0-100) based on multiple factors
   */
  private calculatePriority(record: RawDataRecord): { priorityScore: number; priorityReason: string } {
    let priorityScore = 0;
    const reasons: string[] = [];

    // 1. Low evaluation scores (weight: 40%)
    if (record.evaluationScores && record.evaluationScores.length > 0) {
      const avgScore = this.calculateAverageScore(record);
      if (avgScore < 0.6) {
        priorityScore += 40;
        reasons.push('low_score');
      } else if (avgScore < 0.75) {
        priorityScore += 25;
        reasons.push('fair_score');
      }
    }

    // 2. Negative user feedback (weight: 30%)
    if (record.userFeedback?.sentiment === 'negative') {
      priorityScore += 30;
      reasons.push('negative_feedback');
    } else if (record.userFeedback?.sentiment === 'neutral') {
      priorityScore += 10;
    }

    // 3. High latency (weight: 20%)
    if (record.totalLatency && record.totalLatency > 3000) {
      priorityScore += 20;
      reasons.push('high_latency');
    } else if (record.totalLatency && record.totalLatency > 2000) {
      priorityScore += 10;
    }

    // 4. Not yet reviewed (weight: 10%)
    if (!record.baReview || record.baReview.reviewStatus === 'pending') {
      priorityScore += 10;
      reasons.push('not_reviewed');
    }

    return {
      priorityScore: Math.min(priorityScore, 100),
      priorityReason: reasons.join(','),
    };
  }

  /**
   * Calculate average evaluation score across all frameworks
   */
  private calculateAverageScore(record: RawDataRecord): number {
    if (!record.evaluationScores || record.evaluationScores.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let scoreCount = 0;

    for (const evaluation of record.evaluationScores) {
      for (const [, value] of Object.entries(evaluation.scores)) {
        if (typeof value === 'number') {
          totalScore += value;
          scoreCount++;
        }
      }
    }

    return scoreCount > 0 ? totalScore / scoreCount : 0;
  }

  /**
   * Convert priority score to priority level
   */
  private getPriorityLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Get BA's review queue - paginated and prioritized
   */
  async getReviewQueue(
    applicationId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<any> {
    try {
      const BAReviewQueueCollection = mongoose.connection.collection('bareviewqueue');

      const skip = (page - 1) * pageSize;

      // Get total count
      const total = await BAReviewQueueCollection.countDocuments({
        applicationId,
        status: { $in: ['pending', 'in_progress'] },
      });

      // Get paginated items sorted by priority
      const items = await BAReviewQueueCollection.find({
        applicationId,
        status: { $in: ['pending', 'in_progress'] },
      })
        .sort({ priorityScore: -1, queuedAt: 1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();

      logger.info(`[BAReviewQueueService] Retrieved page ${page} of review queue for app ${applicationId}`);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error: any) {
      logger.error(`[BAReviewQueueService] Error getting review queue:`, error.message);
      throw error;
    }
  }

  /**
   * Update review status and add BA improvement
   */
  async addPromptImprovement(
    queueItemId: string,
    rawDataRecordId: string,
    improvedPrompt: string,
    reason: string,
    baName: string,
    baEmail: string,
    estimatedScoreImpact?: number
  ): Promise<any> {
    try {
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');
      const BAReviewQueueCollection = mongoose.connection.collection('bareviewqueue');

      // Add improvement to raw data record
      const improvement = {
        originalPrompt: '', // Will fetch from record
        improvedPrompt,
        reason,
        baName,
        baEmail,
        estimatedScoreImpact,
        createdAt: new Date(),
      };

      const rawRecord = await RawDataCollection.findOne({ _id: new mongoose.Types.ObjectId(rawDataRecordId) });
      if (!rawRecord) {
        throw new Error(`Raw data record not found: ${rawDataRecordId}`);
      }

      improvement.originalPrompt = rawRecord.userPrompt;

      await RawDataCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(rawDataRecordId) },
        {
          $push: {
            'baReview.promptImprovements': improvement,
          },
          $set: {
            'baReview.reviewStatus': 'improved',
            'baReview.reviewedAt': new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Update queue item status
      await BAReviewQueueCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(queueItemId) },
        {
          $set: {
            status: 'reviewed',
            'reviewCompletedAt': new Date(),
            updatedAt: new Date(),
          },
        }
      );

      logger.info(`[BAReviewQueueService] Added prompt improvement for record ${rawDataRecordId}`);

      return {
        success: true,
        message: 'Prompt improvement added successfully',
      };
    } catch (error: any) {
      logger.error(`[BAReviewQueueService] Error adding improvement:`, error.message);
      throw error;
    }
  }

  /**
   * Find similar records for template creation
   */
  async findSimilarRecords(
    applicationId: string,
    userPrompt: string,
    similarityThreshold: number = 0.7,
    limit: number = 10
  ): Promise<any> {
    try {
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');

      // Simple similarity using text search (word overlap)
      const promptWords = userPrompt.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

      const similarRecords = await RawDataCollection.find({
        applicationId,
        userPrompt: {
          $regex: promptWords.map((w) => `(?=.*${w})`).join(''),
          $options: 'i',
        },
      })
        .limit(limit)
        .toArray();

      logger.info(`[BAReviewQueueService] Found ${similarRecords.length} similar records`);

      return {
        records: similarRecords,
        count: similarRecords.length,
      };
    } catch (error: any) {
      logger.error(`[BAReviewQueueService] Error finding similar records:`, error.message);
      throw error;
    }
  }
}

export const baReviewQueueService = new BAReviewQueueService();
