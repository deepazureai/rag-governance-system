import crypto from 'crypto';
import { NotificationPayload } from '../../src/types/index';
import { logger } from '../utils/logger';

interface WebhookConfig {
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout: number;
}

export class WebhookService {
  private config: WebhookConfig;
  private readonly MAX_RETRIES = 4;
  private readonly RETRY_DELAYS = [5000, 30000, 300000, 1800000]; // 5s, 30s, 5m, 30m
  private readonly HMAC_ALGORITHM = 'sha256';

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * Allows receiving endpoint to verify authenticity
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac(this.HMAC_ALGORITHM, secret).update(payload).digest('hex');
  }

  /**
   * Prepare webhook payload with signature
   */
  private preparePayload(payload: NotificationPayload): {
    body: string;
    signature: string;
    timestamp: string;
  } {
    const timestamp = new Date().toISOString();
    const payloadWithTimestamp = {
      ...payload,
      webhookTimestamp: timestamp,
    };

    const body = JSON.stringify(payloadWithTimestamp);
    const signature = this.config.apiKey
      ? this.generateSignature(body, this.config.apiKey)
      : '';

    return { body, signature, timestamp };
  }

  /**
   * Send webhook with exponential backoff retry
   */
  async send(payload: NotificationPayload): Promise<{
    success: boolean;
    error?: string;
    attempts: number;
    lastStatusCode?: number;
  }> {
    const { body, signature, timestamp } = this.preparePayload(payload);
    let lastError: Error | null = null;
    let lastStatusCode: number | undefined;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        logger.info(
          `[WebhookService] Sending webhook attempt ${attempt + 1}/${this.MAX_RETRIES}`,
          { url: this.config.url }
        );

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Version': '1.0',
          ...(this.config.headers || {}),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastStatusCode = response.status;

        if (!response.ok) {
          const responseBody = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${responseBody.substring(0, 200)}`
          );
        }

        logger.info('[WebhookService] Webhook sent successfully', { 
          url: this.config.url,
          statusCode: response.status 
        });

        return { success: true, attempts: attempt + 1, lastStatusCode };
      } catch (error) {
        lastError = error as Error;
        logger.error(
          `[WebhookService] Webhook send failed (attempt ${attempt + 1}/${this.MAX_RETRIES}):`,
          lastError
        );

        // Exponential backoff before retry
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAYS[attempt];
          logger.info(
            `[WebhookService] Retrying in ${delay}ms...`,
            { nextAttempt: attempt + 2 }
          );
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to send webhook after retries',
      attempts: this.MAX_RETRIES,
      lastStatusCode,
    };
  }

  /**
   * Verify webhook signature from incoming request
   * Use this to validate webhooks from external systems
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Utility: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
