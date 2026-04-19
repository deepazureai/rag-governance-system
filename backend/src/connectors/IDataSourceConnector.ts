export interface RawDataRecord {
  query: string;
  response: string;
  context?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface IDataSourceConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  fetchRawData(): Promise<RawDataRecord[]>;
  testConnection(): Promise<boolean>;
  getMetadata(): Promise<{
    recordCount?: number;
    lastModified?: Date;
    sourceInfo: string;
  }>;
}
