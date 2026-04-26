let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Ensure /api is appended if not already present
if (!apiUrl.endsWith('/api')) {
  apiUrl = apiUrl + '/api';
}

const API_BASE_URL = apiUrl;

export const dataIngestionClient = {
  async ingestFromLocalFolder(applicationId: string, applicationName: string, folderPath: string, fileName: string) {
    const response = await fetch(`${API_BASE_URL}/data/ingest/local-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, applicationName, folderPath, fileName }),
    });

    if (!response.ok) {
      throw new Error(`Local folder ingestion failed: ${response.statusText}`);
    }

    return response.json();
  },

  async ingestFromAzureBlob(
    applicationId: string,
    applicationName: string,
    storageAccount: string,
    containerName: string,
    blobName: string,
    connectionString: string
  ) {
    const response = await fetch(`${API_BASE_URL}/data/ingest/azure-blob`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        applicationName,
        storageAccount,
        containerName,
        blobName,
        connectionString,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure Blob ingestion failed: ${response.statusText}`);
    }

    return response.json();
  },

  async ingestFromDatabase(applicationId: string, applicationName: string, dbConfig: any) {
    const response = await fetch(`${API_BASE_URL}/data/ingest/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, applicationName, dbConfig }),
    });

    if (!response.ok) {
      throw new Error(`Database ingestion failed: ${response.statusText}`);
    }

    return response.json();
  },

  async getIngestionStatus(jobId: string) {
    const response = await fetch(`${API_BASE_URL}/data/ingest/${jobId}/status`);

    if (!response.ok) {
      throw new Error(`Failed to fetch ingestion status: ${response.statusText}`);
    }

    return response.json();
  },
};
