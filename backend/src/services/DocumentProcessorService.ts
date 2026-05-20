import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'pdf-parse';
import { logger } from '../utils/logger.js';

interface ParsedDocument {
  filename: string;
  text: string;
  pageCount?: number;
  metadata: {
    source: string;
    uploadedAt: string;
    fileType: string;
    fileSize: number;
  };
}

interface DocumentChunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
  };
}

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks for context

export class DocumentProcessorService {
  /**
   * Parse various document formats
   */
  static async parseDocument(filePath: string): Promise<ParsedDocument> {
    const filename = path.basename(filePath);
    const fileExt = path.extname(filename).toLowerCase();
    const fileSize = fs.statSync(filePath).size;

    let text = '';
    let pageCount = undefined;

    try {
      switch (fileExt) {
        case '.pdf':
          ({ text, pageCount } = await this.parsePDF(filePath));
          break;
        case '.txt':
          text = await this.parseText(filePath);
          break;
        case '.json':
          text = await this.parseJSON(filePath);
          break;
        case '.csv':
          text = await this.parseCSV(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExt}`);
      }

      if (!text.trim()) {
        throw new Error('Document appears to be empty');
      }

      logger.info(`[DocumentProcessor] Parsed ${filename} (${text.length} chars, ${pageCount || 'N/A'} pages)`);

      return {
        filename,
        text,
        pageCount,
        metadata: {
          source: filename,
          uploadedAt: new Date().toISOString(),
          fileType: fileExt.slice(1),
          fileSize,
        },
      };
    } catch (error) {
      logger.error(`[DocumentProcessor] Failed to parse ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Parse PDF files
   */
  private static async parsePDF(filePath: string): Promise<{ text: string; pageCount: number }> {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdf(fileBuffer);
    return {
      text: data.text,
      pageCount: data.numpages,
    };
  }

  /**
   * Parse plain text files
   */
  private static async parseText(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Parse JSON files
   */
  private static async parseJSON(filePath: string): Promise<string> {
    const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return JSON.stringify(jsonContent, null, 2);
  }

  /**
   * Parse CSV files
   */
  private static async parseCSV(filePath: string): Promise<string> {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    // Convert CSV to readable text format
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    let text = `CSV Document: ${path.basename(filePath)}\n\n`;

    for (let i = 1; i < Math.min(lines.length, 1000); i++) {
      // Limit to first 1000 rows for performance
      const values = lines[i].split(',');
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() || '';
      });
      text += `\nRow ${i}:\n${JSON.stringify(row, null, 2)}\n`;
    }

    return text;
  }

  /**
   * Chunk document into smaller pieces for embedding
   */
  static chunkDocument(doc: ParsedDocument, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const text = doc.text;
    let startChar = 0;

    while (startChar < text.length) {
      const endChar = Math.min(startChar + chunkSize, text.length);
      const content = text.substring(startChar, endChar);

      chunks.push({
        content,
        metadata: {
          source: doc.filename,
          chunkIndex: chunks.length,
          totalChunks: Math.ceil(text.length / (chunkSize - overlap)),
          startChar,
          endChar,
        },
      });

      // Move to next chunk with overlap
      startChar = endChar - overlap;

      // Avoid infinite loop for very small text
      if (endChar === text.length) break;
    }

    logger.info(`[DocumentProcessor] Chunked ${doc.filename} into ${chunks.length} chunks (size: ${chunkSize}, overlap: ${overlap})`);
    return chunks;
  }

  /**
   * Smart chunking: respects sentence and paragraph boundaries
   */
  static smartChunk(
    doc: ParsedDocument,
    targetChunkSize: number = CHUNK_SIZE,
    overlap: number = CHUNK_OVERLAP
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const text = doc.text;

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';
    let startChar = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length < targetChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        // Current chunk is large enough, save it
        if (currentChunk) {
          const endChar = startChar + currentChunk.length;
          chunks.push({
            content: currentChunk,
            metadata: {
              source: doc.filename,
              chunkIndex,
              totalChunks: Math.ceil(text.length / (targetChunkSize - overlap)),
              startChar,
              endChar,
            },
          });
          chunkIndex++;
          startChar = endChar - overlap;
        }
        currentChunk = paragraph;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        metadata: {
          source: doc.filename,
          chunkIndex,
          totalChunks: chunkIndex + 1,
          startChar,
          endChar: startChar + currentChunk.length,
        },
      });
    }

    logger.info(
      `[DocumentProcessor] Smart-chunked ${doc.filename} into ${chunks.length} chunks (respecting paragraph boundaries)`
    );
    return chunks;
  }

  /**
   * Clean and normalize document text
   */
  static cleanText(text: string): string {
    return (
      text
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove special characters but keep basic punctuation
        .replace(/[^\w\s.,!?;:\-()[\]"']/g, '')
        // Trim leading/trailing whitespace
        .trim()
    );
  }

  /**
   * Extract key terms from document (for metadata/tagging)
   */
  static extractKeyTerms(text: string, count: number = 10): string[] {
    // Simple keyword extraction: split by words, filter stopwords, count frequency
    const stopwords = new Set<string>([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'is',
      'was',
      'be',
      'been',
      'being',
    ]);

    const matches = text.toLowerCase().match(/\b\w+\b/g);
    const words: string[] = matches ?? [];
    const frequency: Record<string, number> = {};

    for (const word of words) {
      if (word.length > 3 && !stopwords.has(word)) {
        frequency[word] = (frequency[word] ?? 0) + 1;
      }
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([word]) => word);
  }
}
