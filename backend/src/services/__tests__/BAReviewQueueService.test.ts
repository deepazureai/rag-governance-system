import { BAReviewQueueService } from '../BAReviewQueueService';

describe('BAReviewQueueService', () => {
  describe('calculatePriority', () => {
    it('should assign critical priority for low score below 0.5', () => {
      const priority = BAReviewQueueService.calculatePriority(0.3, 'low_score', false);
      expect(priority).toEqual({ level: 'critical', score: expect.any(Number) });
    });

    it('should assign high priority for negative feedback', () => {
      const priority = BAReviewQueueService.calculatePriority(0.7, 'negative_feedback', false);
      expect(priority.level).toBe('high');
    });

    it('should assign medium priority for high latency', () => {
      const priority = BAReviewQueueService.calculatePriority(0.6, 'high_latency', false);
      expect(priority.level).toBe('medium');
    });

    it('should boost priority if not yet reviewed', () => {
      const reviewedPriority = BAReviewQueueService.calculatePriority(0.6, 'low_score', false);
      const unreviewedPriority = BAReviewQueueService.calculatePriority(0.6, 'low_score', true);
      expect(unreviewedPriority.score).toBeGreaterThan(reviewedPriority.score);
    });
  });

  describe('priorityScoreBreakdown', () => {
    it('should allocate 40% weight to low scores', () => {
      const breakdown = BAReviewQueueService.priorityScoreBreakdown(0.4, 'low_score', false);
      expect(breakdown.lowScoreContribution).toBe(40); // 100 * 0.4 * 0.4
    });

    it('should allocate 30% weight to negative feedback', () => {
      const breakdown = BAReviewQueueService.priorityScoreBreakdown(0.8, 'negative_feedback', false);
      expect(breakdown.negativeHapticContribution).toBe(30); // 100 * 0.8 * 0.3 + bonus
    });

    it('should include 10% boost for unreviewed items', () => {
      const breakdown = BAReviewQueueService.priorityScoreBreakdown(0.7, 'manual_flag', true);
      expect(breakdown.unreviewedBonus).toBe(10);
    });
  });
});
