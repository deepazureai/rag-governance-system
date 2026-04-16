const appInsights = require('applicationinsights');

class AppInsightsClient {
  constructor() {
    this.initialized = false;
    this.client = null;
  }

  initialize() {
    if (this.initialized) return;

    const instrumentationKey = process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_KEY;
    if (!instrumentationKey) {
      console.warn('Application Insights not configured - skipping initialization');
      return;
    }

    appInsights
      .setup(instrumentationKey)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .start();

    this.client = appInsights.defaultClient;
    this.initialized = true;
  }

  trackEvent(name, properties = {}, measurements = {}) {
    if (!this.client) return;
    this.client.trackEvent({ name, properties, measurements });
  }

  trackException(error, properties = {}) {
    if (!this.client) return;
    this.client.trackException({
      exception: error,
      properties,
      severity: appInsights.Contracts.SeverityLevel.Error,
    });
  }

  trackTrace(message, severity = appInsights.Contracts.SeverityLevel.Information, properties = {}) {
    if (!this.client) return;
    this.client.trackTrace({ message, severity, properties });
  }

  trackDependency(name, duration, success = true, resultCode = 200, properties = {}) {
    if (!this.client) return;
    this.client.trackDependency({
      name,
      duration,
      success,
      resultCode,
      dependencyTypeName: 'http',
      properties,
    });
  }

  trackCustomMetric(name, value, properties = {}) {
    if (!this.client) return;
    this.client.trackEvent({
      name: `metric_${name}`,
      properties: {
        value,
        ...properties,
      },
    });
  }
}

module.exports = new AppInsightsClient();
