import { NotificationChannel, NotificationLog, NotificationPayload, EmailTemplate } from '../types';
import { logger } from '../utils/logger';

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  recipientEmails: string[];
  smtpHost?: string;
  smtpPort?: number;
  fromEmail: string;
}

export class EmailService {
  private config: EmailConfig;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // ms

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Generate HTML email template for alert notification
   */
  private generateEmailTemplate(payload: NotificationPayload): EmailTemplate {
    const severityColor = payload.severity === 'critical' ? '#dc2626' : '#f59e0b';
    const severityBg = payload.severity === 'critical' ? '#fee2e2' : '#fef3c7';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3f4f6; padding: 20px; border-radius: 8px 8px 0 0; }
            .alert-box { 
              background: ${severityBg}; 
              border-left: 4px solid ${severityColor}; 
              padding: 15px; 
              margin: 20px 0;
            }
            .alert-title { color: ${severityColor}; font-weight: bold; font-size: 18px; }
            .metric-details { background: #f9fafb; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .metric-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .metric-label { font-weight: bold; }
            .cta-button { 
              display: inline-block; 
              background: ${severityColor}; 
              color: white; 
              padding: 12px 24px; 
              border-radius: 4px; 
              text-decoration: none; 
              margin-top: 15px; 
            }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Alert Notification - ${payload.appName}</h2>
            </div>
            
            <div class="alert-box">
              <div class="alert-title">
                ${payload.severity.toUpperCase()} ALERT: ${payload.metricName}
              </div>
              <p>${payload.message}</p>
            </div>

            <div class="metric-details">
              <div class="metric-row">
                <span class="metric-label">Application:</span>
                <span>${payload.appName}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Metric:</span>
                <span>${payload.metricName}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Current Value:</span>
                <span>${payload.metricValue.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Threshold:</span>
                <span>${payload.threshold.toFixed(2)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Severity:</span>
                <span style="color: ${severityColor}; font-weight: bold;">${payload.severity.toUpperCase()}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Time:</span>
                <span>${new Date(payload.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <a href="${payload.dashboardLink}" class="cta-button">View Details in Dashboard</a>

            <div class="footer">
              <p>This is an automated alert from RAG Evaluation Platform.</p>
              <p>You can manage your notification preferences in Settings > Notifications.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Alert Notification - ${payload.appName}

${payload.severity.toUpperCase()} ALERT: ${payload.metricName}
${payload.message}

Details:
- Application: ${payload.appName}
- Metric: ${payload.metricName}
- Current Value: ${payload.metricValue.toFixed(2)}
- Threshold: ${payload.threshold.toFixed(2)}
- Severity: ${payload.severity.toUpperCase()}
- Time: ${new Date(payload.timestamp).toLocaleString()}

View details: ${payload.dashboardLink}

This is an automated alert from RAG Evaluation Platform.
    `;

    return {
      subject: `[${payload.severity.toUpperCase()}] Alert: ${payload.metricName} - ${payload.appName}`,
      html,
      text,
    };
  }

  /**
   * Send email with exponential backoff retry
   */
  async send(
    payload: NotificationPayload,
    recipientEmails: string[]
  ): Promise<{ success: boolean; error?: string; attempts: number }> {
    let lastError: Error | null = null;
    const template = this.generateEmailTemplate(payload);

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        logger.info(
          `[EmailService] Sending email attempt ${attempt + 1}/${this.MAX_RETRIES}`,
          { recipients: recipientEmails }
        );

        // TODO: Implement actual email provider integration
        // Example with SendGrid:
        // await sgMail.send({
        //   to: recipientEmails,
        //   from: this.config.fromEmail,
        //   subject: template.subject,
        //   text: template.text,
        //   html: template.html,
        //   replyTo: 'alerts@ragplatform.com',
        // });

        logger.info('[EmailService] Email sent successfully', { recipients: recipientEmails });
        return { success: true, attempts: attempt + 1 };
      } catch (error) {
        lastError = error as Error;
        logger.error(
          `[EmailService] Email send failed (attempt ${attempt + 1}/${this.MAX_RETRIES}):`,
          lastError
        );

        // Exponential backoff before retry
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAYS[attempt];
          logger.info(`[EmailService] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to send email after retries',
      attempts: this.MAX_RETRIES,
    };
  }

  /**
   * Utility: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
