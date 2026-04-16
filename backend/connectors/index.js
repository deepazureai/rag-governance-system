const SqlConnector = require('./SqlConnector');
const PostgresConnector = require('./PostgresConnector');
const AzureMonitorConnector = require('./AzureMonitorConnector');
const AzureBlobConnector = require('./AzureBlobConnector');
const SplunkConnector = require('./SplunkConnector');
const DatadogConnector = require('./DatadogConnector');

const CONNECTOR_MAP = {
  'database': SqlConnector,
  'postgres': PostgresConnector,
  'azure-logs': AzureMonitorConnector,
  'azure-blob': AzureBlobConnector,
  'splunk': SplunkConnector,
  'datadog': DatadogConnector,
};

function getConnectorInstance(type) {
  const ConnectorClass = CONNECTOR_MAP[type];
  
  if (!ConnectorClass) {
    throw new Error(`Unknown connector type: ${type}`);
  }
  
  return new ConnectorClass();
}

function getAvailableConnectors() {
  return Object.keys(CONNECTOR_MAP);
}

module.exports = {
  getConnectorInstance,
  getAvailableConnectors,
  CONNECTOR_MAP,
};
