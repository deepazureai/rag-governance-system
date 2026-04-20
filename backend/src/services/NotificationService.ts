import {
  NotificationChannel,
  NotificationRule,
  NotificationLog,
  NotificationPayload,
  NotificationChannelType,
} from '../types';
import { EmailService } from './EmailService';
import { WebhookService } from './WebhookService';
import { logger } from '../utils/logger';

export class NotificationService {
  private emailService?: EmailService;
  private webhookService?: WebhookService;

  /**
   * Initialize notification service with channels
   */
  initialize(channels: NotificationChannel[]): void {
    for (const channel of channels) {
      if (channel.type === 'email' && channel.emailConfig) {
        this.emailService = new EmailService(channel.emailConfig);
      } else if (channel.type === 'webhook' && channel.webhookConfig) {
        this.webhookService = new WebhookService(channel.webhookConfig);
      }
    }

    logger.info('[NotificationService] Initialized with channels', {
      emailEnabled: !!this.emailService,
      webhookEnabled: !!this.webhookService,
    });
  }

  /**
   * Process alert and send notifications based on rules
   */
  async handleAlert(
    alert: any,
    channels: NotificationChannel[],
    rules: NotificationRule[]
  ): Promise<NotificationLog[]> {
    const logs: NotificationLog[] = [];

    try {
      // Get applicable rules for this alert
      const applicableRules = this.getApplicableRules(alert, rules);

      if (applicableRules.length === 0) {
        logger.info('[NotificationService] No notification rules apply for alert', {
          alertId: alert.id,
        });
        return logs;
      }

      // Prepare notification payload
      const payload = this.buildNotificationPayload(alert);

      // Send to each applicable channel
      for (const rule of applicableRules) {
        for (const channelId of rule.channelIds) {
          const channel = channels.find((c) => c.id === channelId);
          if (!channel || !channel.enabled) continue;

          const log = await this.sendToChannel(channel, payload, alert);
          logs.push(log);
        }
      }

      logger.info('[NotificationService] Alert notifications queued', {
        alertId: alert.id,
        notificationCount: logs.length,
      });
    } catch (error) {
      logger.error('[NotificationService] Error handling alert:', error);
    }

    return logs;
  }

  /**
   * Get notification rules that apply to this alert
   */
  private getApplicableRules(alert: any, rules: NotificationRule[]): NotificationRule[] {
    return rules.filter((rule) => {
      if (!rule.enabled) return false;
      if (rule.appId !== alert.appId && rule.appId !== '*') return false;

      // Check severity match
      if (
        rule.triggerOn === 'critical' &&
        alert.severity !== 'critical'
      ) {
        return false;
      }

      if (rule.triggerOn === 'warning' && alert.severity === 'healthy') {
        return false;
      }

      // Check metric match (if specific metrics configured)
      if (rule.metricNames && rule.metricNames.length > 0) {
        if (!rule.metricNames.includes(alert.metricName)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Build notification payload from alert
   */
  private buildNotificationPayload(alert: any): NotificationPayload {
    // TODO: Get app name from ApplicationMaster when database connected
    const appName = `App-${alert.appId}`;
    const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?alert=${alert.id}`;

    return {
      alertId: alert.id,
      appId: alert.appId,
      appName,
      metricName: alert.metricName,
      severity: alert.severity,
      metricValue: alert.metricValue,
      threshold: alert.threshold,
      message: alert.message,
      timestamp: alert.timestamp,
      dashboardLink,
    };
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    alert: any
  ): Promise<NotificationLog> {
    const log: NotificationLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      alertId: alert.id,
      appId: alert.appId,
      channelType: channel.type,
      channelId: channel.id,
      message: payload.message,
      subject: `[${alert.severity.toUpperCase()}] Alert: ${alert.metricName}`,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (channel.type === 'email' && channel.emailConfig && this.emailService) {
        const result = await this.emailService.send(
          payload,
          channel.emailConfig.recipientEmails
        );

        log.status = result.success ? 'sent' : 'failed';
        log.attempts = result.attempts;
        if (result.error) {
          log.errorMessage = result.error;
          log.errorCode = 'EMAIL_SEND_FAILED';
        }
      } else if (
        channel.type === 'webhook' &&
        channel.webhookConfig &&
        this.webhookService
      ) {
        const result = await this.webhookService.send(payload);

        log.status = result.success ? 'sent' : 'failed';
        log.attempts = result.attempts;
        log.webhookResponse = {
          statusCode: result.lastStatusCode,
        };
        if (result.error) {
          log.errorMessage = result.error;
          log.errorCode = 'WEBHOOK_SEND_FAILED';
        }
      }

      if (log.status === 'sent') {
        log.sentAt = new Date().toISOString();
      }

      log.updatedAt = new Date().toISOString();
    } catch (error) {
      log.status = 'failed';
      log.errorMessage = (error as Error).message;
      log.errorCode = 'UNEXPECTED_ERROR';
      log.updatedAt = new Date().toISOString();
    }

    return log;
  }

  /**
   * Test channel connectivity
   */
  async testChannel(channel: NotificationChannel): Promise<{
    success: boolean;
    error?: string;
    message: string;
  }> {
    try {
      const testPayload: NotificationPayload = {
        alertId: 'test-alert',
        appId: 'test-app',
        appName: 'Test Application',
        metricName: 'Test Metric',
        severity: 'warning',
        metricValue: 75,
        threshold: 80,
        message: 'This is a test notification from RAG Evaluation Platform',
        timestamp: new Date().toISOString(),
        dashboardLink: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      if (channel.type === 'email' && channel.emailConfig) {
        if (!this.emailService) {
          this.emailService = new EmailService(channel.emailConfig);
        }

        const result = await this.emailService.send(
          testPayload,
          channel.emailConfig.recipientEmails
        );

        if (result.success) {
          return {
            success: true,
            message: `Test email sent successfully to ${channel.emailConfig.recipientEmails.join(', ')}`,
          };
        } else {
          return {
            success: false,
            error: result.error,
            message: `Failed to send test email: ${result.error}`,
          };
        }
      } else if (channel.type === 'webhook' && channel.webhookConfig) {
        if (!this.webhookService) {
          this.webhookService = new WebhookService(channel.webhookConfig);
        }

        const result = await this.webhookService.send(testPayload);

        if (result.success) {
          return {
            success: true,
            message: `Webhook test succeeded (Status: ${result.lastStatusCode || 200})`,
          };
        } else {
          return {
            success: false,
            error: result.error,
            message: `Webhook test failed: ${result.error}`,
          };
        }
      }

      return {
        success: false,
        error: 'Unsupported channel type',
        message: 'Cannot test unsupported channel type',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        message: `Error testing channel: ${(error as Error).message}`,
      };
    }
  }
}
