-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('rag', 'agent', 'hybrid')),
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Connections Table
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('database', 'azure-logs', 'azure-blob', 'splunk', 'datadog')),
  name TEXT NOT NULL,
  credentials JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'error')) DEFAULT 'inactive',
  last_tested TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE,
  UNIQUE(app_id, name)
);

-- Indexes
CREATE INDEX idx_connections_app_id ON connections(app_id);
CREATE INDEX idx_connections_type ON connections(type);
CREATE INDEX idx_connections_app_type ON connections(app_id, type);
CREATE INDEX idx_applications_status ON applications(status);

-- Audit Log Table (optional but recommended)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  user_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
