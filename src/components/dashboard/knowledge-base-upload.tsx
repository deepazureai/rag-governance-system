'use client';

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Clock, AlertTriangle, Download } from 'lucide-react';
import { 
  uploadDocumentToKB, 
  deleteDocumentFromKB, 
  listKBDocuments,
  type KBConfig,
} from '@/api/kb-services-client';
import { useKnowledgeBase } from '@/hooks/use-knowledge-base';

/**
 * KnowledgeBaseUpload Component
 *
 * Manages document upload and embedding creation for the knowledge base.
 * Does NOT save KB configuration - that's done in Settings→KB tab.
 *
 * Uses the embeddings provider configuration (Azure OpenAI endpoint, API key, model) 
 * saved in Settings→KB tab to create vector embeddings from uploaded documents.
 *
 * Workflow:
 * 1. User uploads document (PDF, DOCX, TXT, MD)
 * 2. Backend fetches KB config from MongoDB (embeddings provider)
 * 3. Document is chunked and embedded using the configured embeddings model
 * 4. Vector embeddings stored in vector database
 * 5. Documents list updated in UI
 */

interface UploadedDocument {
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  totalChunks: number;
  status: 'processing' | 'success' | 'error' | 'complete' | 'indexed' | 'failed';
}

interface UploadingFile {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  startTime: Date;
  uploadSpeed: number; // bytes/sec
}

interface KnowledgeBaseUploadProps {
  applicationId: string;
}

export function KnowledgeBaseUpload({ applicationId }: KnowledgeBaseUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch KB configuration from Settings→KB tab for this application
  // This includes: embeddings provider (Azure endpoint, API key, model)
  // Backend handles decryption of sensitive credentials transparently
  const { config, isLoadingConfig, configError } = useKnowledgeBase(applicationId);

  // Load documents on component mount and when applicationId changes
  useEffect(() => {
    const loadDocuments = async () => {
      if (!applicationId) return;
      
      setIsLoadingDocs(true);
      try {
        console.log('[v0] Loading KB documents for app:', applicationId);
        const docs = await listKBDocuments(applicationId);
        
        // Convert from backend format to UI format
        setDocuments(
          docs.map((doc) => ({
            documentId: doc.documentId,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadDate: new Date(doc.uploadDate),
            totalChunks: doc.totalChunks || 0,
            status: (doc.status as any) || 'processing',
          }))
        );
        console.log('[v0] Loaded', docs.length, 'documents');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load documents';
        console.warn('[v0] Failed to load documents:', message);
        // Don't show error to user - just start with empty list
        setDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    loadDocuments();
  }, [applicationId]);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        handleFile(file);
      });
    }
  };

  const handleFile = async (file: File) => {
    // Reset error
    setError(null);

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Supported formats: PDF, DOCX, TXT, and Markdown (.md) files.');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError(`File too large (${formatFileSize(file.size)}). Maximum size is 50MB.`);
      return;
    }

    // Validate file name
    if (!file.name || file.name.trim().length === 0) {
      setError('Invalid file name. Please select a file with a valid name.');
      return;
    }

    // Call upload function with validated file
    await handleUploadFile(file);
  };

  const handleUploadFile = async (file: File) => {
    // Create upload tracking entry
    const uploadId = `upload-${Date.now()}-${Math.random()}`;
    const startTime = new Date();
    
    setUploadingFiles((prev) => [
      ...prev,
      {
        id: uploadId,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        startTime,
        uploadSpeed: 0,
      },
    ]);

    try {
      if (!applicationId || applicationId.trim().length === 0) {
        throw new Error('Application ID is missing. Please refresh the page.');
      }

      // Use centralized kb-services-client for upload
      // Handles config fetching, embeddings provider setup, and error handling
      const result = await uploadDocumentToKB(applicationId, file, (progress: number) => {
        setUploadingFiles((prev) =>
          prev.map((uf) =>
            uf.id === uploadId
              ? { ...uf, progress: Math.min(progress, 99) } // Cap at 99% until completion
              : uf
          )
        );
      });

      // Calculate upload speed
      const endTime = new Date();
      const durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
      const uploadSpeed = durationSec > 0 ? file.size / durationSec : 0;

      // Add document to list with 'success' status since backend has already vectorized it
      setDocuments((prev) => [
        ...prev,
        {
          documentId: result.documentId,
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date(),
          totalChunks: result.totalChunks,
          status: 'success', // Backend returned successfully - embeddings are in Chroma
        },
      ]);

      // Update upload progress to 100%
      setUploadingFiles((prev) =>
        prev.map((uf) =>
          uf.id === uploadId
            ? { ...uf, progress: 100, uploadSpeed }
            : uf
        )
      );

      // Remove from uploading after delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((uf) => uf.id !== uploadId));
      }, 2000);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(errorMessage);
      
      // Mark as failed
      setUploadingFiles((prev) =>
        prev.map((uf) =>
          uf.id === uploadId
            ? { ...uf, progress: -1 } // -1 indicates failure
            : uf
        )
      );

      console.error('[v0] Upload error:', err);

      // Remove after delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((uf) => uf.id !== uploadId));
      }, 5000);
    }
  };

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone and will remove all related embeddings.`)) {
      return;
    }

    try {
      // Use centralized kb-services-client for delete
      await deleteDocumentFromKB(applicationId, documentId);

      // Remove from UI
      setDocuments((prev) => prev.filter((doc) => doc.documentId !== documentId));
      console.log('[v0] Document deleted:', documentId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(`${errorMessage}`);
      console.error('[v0] Delete error:', err);
    }
  };

  const exportDocumentsList = () => {
    if (documents.length === 0) {
      alert('No documents to export');
      return;
    }

    const exportData = documents.map((doc) => ({
      documentId: doc.documentId,
      fileName: doc.fileName,
      fileSizeBytes: doc.fileSize,
      fileSizeMB: (doc.fileSize / (1024 * 1024)).toFixed(2),
      uploadDate: doc.uploadDate,
      totalChunks: doc.totalChunks,
      status: doc.status,
    }));

    const csv = [
      ['Document ID', 'File Name', 'File Size (MB)', 'Upload Date', 'Total Chunks', 'Status'].join(','),
      ...exportData.map((doc) =>
        [
          doc.documentId,
          `"${doc.fileName}"`,
          doc.fileSizeMB,
          typeof doc.uploadDate === 'string' 
            ? new Date(doc.uploadDate).toLocaleString() 
            : (doc.uploadDate instanceof Date 
                ? doc.uploadDate.toLocaleString() 
                : new Date(doc.uploadDate).toLocaleString()),
          doc.totalChunks,
          doc.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kb-documents-${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[v0] Documents list exported as CSV');
  };

  const handleDeleteAllKnowledge = async () => {
    if (
      !confirm(
        'Delete ALL knowledge base data? This will remove all documents and chat history (except the finalized template chat). This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      const response = await fetch(`${apiUrl}/api/knowledge-base/all`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete knowledge base');
      }

      setDocuments([]);
      console.log('[v0] All knowledge base data deleted');
      setShowDeleteConfirm(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      console.error('[v0] Delete all error:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      console.warn('[v0] Invalid date in formatDate:', date, error);
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed':
      case 'success':
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const totalChunks = documents.reduce((sum, doc) => sum + doc.totalChunks, 0);
  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

  return (
    <div className="space-y-6">
      {/* Loading Config */}
      {isLoadingConfig && (
        <Card className="bg-blue-50 border border-blue-200 p-4 flex gap-3 items-center">
          <Spinner className="w-5 h-5" />
          <p className="text-sm text-blue-700">Loading KB configuration...</p>
        </Card>
      )}

      {/* KB Config Error Alert */}
      {configError && (
        <Card className="bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">KB Configuration Required</h3>
            <p className="text-sm text-yellow-700 mt-1">{configError}</p>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-50 border border-red-200 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </Card>
      )}

      {/* Upload Section */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50 p-8">
        <div className="text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Knowledge Documents</h3>
          <p className="text-sm text-gray-600 mb-4">
            Supported formats: PDF, DOCX, TXT, MD (max 50MB each)
          </p>

          <div
            className={`
              border-2 border-dashed rounded-lg p-8 mb-4 transition-colors cursor-pointer
              ${dragActive ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-white'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium text-gray-900">Drag documents here or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">Uploads will create chunks and embeddings automatically</p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInput}
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              disabled={uploadingFiles.length > 0 || isLoadingConfig || !!configError}
            />
          </div>
        </div>

        {/* Upload Progress - Batch */}
        {uploadingFiles.length > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Uploading Files ({uploadingFiles.length})</h3>
          <div className="space-y-3">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900 truncate">{file.fileName}</span>
                  <span className="text-xs text-blue-700">
                    {file.progress === -1
                      ? 'Failed'
                      : file.progress === 100
                        ? 'Complete'
                        : `${Math.round(file.progress)}%`}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      file.progress === -1 ? 'bg-red-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.max(0, file.progress)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600">{formatFileSize(file.fileSize)}</span>
                  {file.uploadSpeed > 0 && file.progress > 0 && file.progress < 100 && (
                    <span className="text-xs text-blue-600">
                      {formatFileSize(file.uploadSpeed)}/s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      </Card>

      {/* Statistics */}
      {documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-2xl font-bold text-blue-900">{documents.length}</p>
            <p className="text-xs text-blue-700 mt-1">Documents Uploaded</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-2xl font-bold text-green-900">{totalChunks}</p>
            <p className="text-xs text-green-700 mt-1">Chunks Created</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <p className="text-2xl font-bold text-purple-900">{formatFileSize(totalSize)}</p>
            <p className="text-xs text-purple-700 mt-1">Total Size</p>
          </Card>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.documentId} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{doc.fileName}</h4>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.totalChunks} chunks</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploadDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status)}
                      <Badge
                        variant="outline"
                        className={`
                          ${(doc.status === 'indexed' || doc.status === 'success' || doc.status === 'complete') && 'bg-green-50 text-green-700 border-green-200'}
                          ${doc.status === 'processing' && 'bg-blue-50 text-blue-700 border-blue-200'}
                          ${(doc.status === 'failed' || doc.status === 'error') && 'bg-red-50 text-red-700 border-red-200'}
                        `}
                      >
                        {(doc.status === 'indexed' || doc.status === 'complete' || doc.status === 'success') && 'Complete'}
                        {doc.status === 'processing' && 'Processing'}
                        {(doc.status === 'failed' || doc.status === 'error') && 'Error'}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.documentId, doc.fileName)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {documents.length === 0 && uploadingFiles.length === 0 && (
        <Card className="p-12 text-center bg-gray-50 border-gray-200">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-sm text-gray-600 mb-4">Upload your first document to get started with the knowledge base</p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </Card>
      )}

      {/* Append Mode Info */}
      {documents.length > 0 && (
        <Card className="bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>Append Mode Enabled:</strong> New document uploads will be added to your existing knowledge base. All documents will be indexed and searchable together.
          </p>
        </Card>
      )}

      {/* Delete All Button */}
      {documents.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={exportDocumentsList}
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Documents List
          </Button>

          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Knowledge Data
          </Button>

          {showDeleteConfirm && (
            <Card className="mt-4 bg-red-50 border border-red-200 p-4">
              <h4 className="font-medium text-red-900 mb-3">Confirm Deletion</h4>
              <p className="text-sm text-red-800 mb-4">
                This will permanently delete all documents and chat history. The finalized template chat (if any) will be preserved for reference.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllKnowledge}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
