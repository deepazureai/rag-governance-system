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

      console.log('[v0] addPromptImprovement - rawDataRecordId:', rawDataRecordId);
      console.log('[v0] addPromptImprovement - rawDataRecordId length:', rawDataRecordId?.length);
      console.log('[v0] addPromptImprovement - rawDataRecordId type:', typeof rawDataRecordId);

      // Validate the record ID
      if (!rawDataRecordId || rawDataRecordId.trim().length === 0) {
        throw new Error('rawDataRecordId is required and cannot be empty');
      }

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

      // Try multiple lookup strategies
      let rawRecord = null;

      // Strategy 1: Try as MongoDB ObjectId
      if (rawDataRecordId.length === 24) {
        try {
          const objectId = new mongoose.Types.ObjectId(rawDataRecordId);
          rawRecord = await RawDataCollection.findOne({ _id: objectId });
          if (rawRecord) {
            console.log('[v0] Found record by _id ObjectId');
          }
        } catch (e) {
          console.log('[v0] ObjectId parsing failed for 24-char ID');
        }
      }

      // Strategy 2: Try as string _id
      if (!rawRecord) {
        try {
          rawRecord = await RawDataCollection.findOne({ _id: rawDataRecordId } as any);
          if (rawRecord) {
            console.log('[v0] Found record by _id string');
          }
        } catch (e) {
          console.log('[v0] String _id lookup failed');
        }
      }

      // Strategy 3: Try as recordId field
      if (!rawRecord) {
        try {
          rawRecord = await RawDataCollection.findOne({ recordId: rawDataRecordId });
          if (rawRecord) {
            console.log('[v0] Found record by recordId field');
          }
        } catch (e) {
          console.log('[v0] recordId field lookup failed');
        }
      }

      // Strategy 4: Try fuzzy match (in case ID is truncated or corrupted)
      if (!rawRecord && rawDataRecordId.length > 10) {
        try {
          const pattern = new RegExp(`^${rawDataRecordId}`);
          rawRecord = await RawDataCollection.findOne({
            $or: [
              { _id: pattern },
              { recordId: pattern },
            ],
          } as any);
          if (rawRecord) {
            console.log('[v0] Found record by fuzzy match');
          }
        } catch (e) {
          console.log('[v0] Fuzzy match lookup failed');
        }
      }

      if (!rawRecord) {
        console.error('[v0] Raw data record lookup failed with all strategies');
        console.error('[v0] rawDataRecordId provided:', rawDataRecordId);
        
        // Debug: show what records exist
        const sampleRecords = await RawDataCollection.find({}).limit(3).toArray();
        console.log('[v0] Sample records in database:');
        sampleRecords.forEach((rec: any, idx: number) => {
          console.log(`  [${idx}] _id:${rec._id?.toString()?.substring(0, 20)}... recordId:${rec.recordId}`);
        });
        
        throw new Error(`Raw data record not found: ${rawDataRecordId} (tried ObjectId, string _id, recordId field, fuzzy match)`);
      }

      console.log('[v0] Found raw record:', rawRecord._id?.toString?.()?.substring(0, 20));

      improvement.originalPrompt = rawRecord.userPrompt || rawRecord.prompt || '';

      await RawDataCollection.updateOne(
        { _id: rawRecord._id },
        [
          {
            $set: {
              'baReview.promptImprovements': {
                $concatArrays: [
                  { $ifNull: ['$baReview.promptImprovements', []] },
                  [improvement],
                ],
              },
              'baReview.reviewStatus': 'pending_approval',
              'baReview.reviewedAt': new Date(),
              updatedAt: new Date(),
            },
          },
        ]
      );

      console.log('[v0] Updated raw record with improvement');

      // Update queue item status (if queueItemId is provided)
      if (queueItemId && queueItemId.trim()) {
        try {
          await BAReviewQueueCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(queueItemId) },
            {
              $set: {
                status: 'pending_review',
                'reviewCompletedAt': new Date(),
                updatedAt: new Date(),
              },
            }
          );
          console.log('[v0] Updated queue item to pending_review');
        } catch (queueError: any) {
          logger.warn(`[BAReviewQueueService] Warning: Could not update queue item ${queueItemId}: ${queueError.message}`);
          // Don't throw - queue update is optional, record update is what matters
        }
      }

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
   * Get queue statistics: critical count, pending count, average priority
   * Uses MongoDB aggregation pipeline for efficiency
   */
  async getQueueStats(applicationId: string): Promise<{
    criticalCount: number;
    pendingCount: number;
    totalItems: number;
    averagePriorityScore: number;
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  }> {
    try {
      const BAReviewQueueCollection = mongoose.connection.collection('bareviewqueue');

      // Use aggregation pipeline for efficient stat calculation
      const stats = await BAReviewQueueCollection.aggregate([
        {
          $match: { applicationId },
        },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            inProgressCount: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
            },
            reviewedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] },
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
            archivedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] },
            },
            highCount: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] },
            },
            mediumCount: {
              $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] },
            },
            lowCount: {
              $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] },
            },
            totalPriorityScore: { $sum: '$priorityScore' },
            averagePriority: { $avg: '$priorityScore' },
          },
        },
      ]).toArray();

      if (!stats || stats.length === 0) {
        logger.info(`[BAReviewQueueService] No queue items found for app ${applicationId}`);
        return {
          criticalCount: 0,
          pendingCount: 0,
          totalItems: 0,
          averagePriorityScore: 0,
          statusBreakdown: {},
          priorityBreakdown: {},
        };
      }

      const result = stats[0] as Record<string, number>;

      logger.info(
        `[BAReviewQueueService] Queue stats for app ${applicationId}: ` +
        `critical=${result.criticalCount}, pending=${result.pendingCount}, total=${result.totalItems}`
      );

      return {
        criticalCount: result.criticalCount || 0,
        pendingCount: result.pendingCount || 0,
        totalItems: result.totalItems || 0,
        averagePriorityScore: result.averagePriority ? Math.round(result.averagePriority) : 0,
        statusBreakdown: {
          pending: result.pendingCount || 0,
          in_progress: result.inProgressCount || 0,
          reviewed: result.reviewedCount || 0,
          approved: result.approvedCount || 0,
          rejected: result.rejectedCount || 0,
          archived: result.archivedCount || 0,
        },
        priorityBreakdown: {
          critical: result.criticalCount || 0,
          high: result.highCount || 0,
          medium: result.mediumCount || 0,
          low: result.lowCount || 0,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[BAReviewQueueService] Error getting queue stats:`, message);
      throw new Error(`Failed to get queue stats: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[BAReviewQueueService] Error finding similar records:`, message);
      throw error;
    }
  }
}

export const baReviewQueueService = new BAReviewQueueService();
