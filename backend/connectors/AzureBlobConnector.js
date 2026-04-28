const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const retry = require('../common/retry');

class AzureBlobConnector {
  constructor(config) {
    this.config = config;
    this.client = null;
  }

  async _getClient() {
    if (this.client) {
      return this.client;
    }

    const credential = new DefaultAzureCredential();
    this.client = new BlobServiceClient(
      this.config.accountUrl,
      credential
    );

    return this.client;
  }

  async testConnection() {
    try {
      const client = await retry(() => this._getClient());
      const containers = client.listContainers();
      for await (const container of containers) {
        return { success: true, message: 'Connection successful' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async listContainers() {
    try {
      const client = await this._getClient();
      const containers = [];
      for await (const container of client.listContainers()) {
        containers.push(container.name);
      }
      return containers;
    } catch (err) {
      throw new Error(`Failed to list containers: ${err.message}`);
    }
  }

  async listBlobs(containerName) {
    try {
      const client = await this._getClient();
      const containerClient = client.getContainerClient(containerName);
      const blobs = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        blobs.push(blob.name);
      }
      return blobs;
    } catch (err) {
      throw new Error(`Failed to list blobs: ${err.message}`);
    }
  }

  async fetchBlobData(containerName, blobName) {
    try {
      const client = await this._getClient();
      const containerClient = client.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      const downloadBlockBlobResponse = await blobClient.download(0);
      const content = await streamToString(downloadBlockBlobResponse.readableStreamBody);
      
      // Parse JSON if applicable
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    } catch (err) {
      throw new Error(`Failed to fetch blob data: ${err.message}`);
    }
  }
}

async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString('utf8'));
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

module.exports = AzureBlobConnector;
