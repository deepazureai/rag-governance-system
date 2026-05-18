/**
 * Document Chunking Service
 * Implements recursive character splitting with overlapping windows
 * Supports token-based and semantic chunking strategies
 */

import { DocumentChunk, ChunkingConfig } from '../types/index.js';

export class ChunkingService {
  private config: ChunkingConfig;

  constructor(config: ChunkingConfig = this.getDefaultConfig()) {
    this.validateConfig(config);
    this.config = config;
  }

  private validateConfig(config: ChunkingConfig): void {
    if (config.chunkSize < 100) {
      throw new Error('Chunk size must be at least 100 characters');
    }
    if (config.chunkOverlap < 0 || config.chunkOverlap > 50) {
      throw new Error('Chunk overlap must be between 0 and 50 percent');
    }
    if (!['recursive-character', 'token-based', 'semantic'].includes(config.method)) {
      throw new Error(`Invalid chunking method: ${config.method}`);
    }
  }

  private getDefaultConfig(): ChunkingConfig {
    return {
      method: 'recursive-character',
      chunkSize: 1024,
      chunkOverlap: 20,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    };
  }

  /**
   * Split document into chunks using recursive character splitting
   * Prioritizes semantic boundaries (paragraphs > lines > words > characters)
   */
  chunkDocument(
    documentId: string,
    appId: string,
    content: string,
  ): DocumentChunk[] {
    if (this.config.method === 'recursive-character') {
      return this.recursiveCharacterSplit(documentId, appId, content);
    } else if (this.config.method === 'token-based') {
      return this.tokenBasedSplit(documentId, appId, content);
    } else {
      return this.semanticSplit(documentId, appId, content);
    }
  }

  /**
   * Recursive character splitting with overlap
   * Splits at natural boundaries: paragraphs (\n\n), lines (\n), sentences, words, then characters
   */
  private recursiveCharacterSplit(
    documentId: string,
    appId: string,
    content: string,
  ): DocumentChunk[] {
    const separators = this.config.separators || ['\n\n', '\n', '. ', ' ', ''];
    const chunks: DocumentChunk[] = [];
    let goodSplits: string[] = [];

    // Find the best separator to split by
    for (const separator of separators) {
      if (separator === '') {
        goodSplits = Array.from(content);
        break;
      }

      if (content.includes(separator)) {
        goodSplits = content.split(separator);
        break;
      }
    }

    // Now merge adjacent splits into chunks
    const mergedChunks = this.mergeSplits(goodSplits, separators[0] || '');

    // Create document chunks with overlap
    for (let i = 0; i < mergedChunks.length; i++) {
      const chunkContent = mergedChunks[i];
      const overlapContent = this.getOverlapContent(mergedChunks, i);
      const fullContent = overlapContent + chunkContent;

      const chunk: DocumentChunk = {
        id: `${documentId}-chunk-${i}`,
        documentId,
        appId,
        content: fullContent,
        chunkIndex: i,
        metadata: {
          originalIndex: i,
          hasOverlap: overlapContent.length > 0,
        },
        tokenCount: this.estimateTokenCount(fullContent),
        startPosition: this.getStartPosition(mergedChunks, i, overlapContent),
        endPosition: this.getEndPosition(mergedChunks, i),
      };

      chunks.push(chunk);
    }

    console.log(`[v0] Chunked document ${documentId} into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Token-based splitting using estimated token count
   * More accurate for models with token limits
   */
  private tokenBasedSplit(
    documentId: string,
    appId: string,
    content: string,
  ): DocumentChunk[] {
    const words = content.split(/\s+/);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    const overlapTokens = Math.floor((this.config.chunkSize * this.config.chunkOverlap) / 100);

    for (const word of words) {
      const wordTokens = this.estimateTokenCount(word);

      if (currentTokens + wordTokens > this.config.chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunkContent = currentChunk.join(' ');
        const chunk: DocumentChunk = {
          id: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          appId,
          content: chunkContent,
          chunkIndex,
          metadata: { method: 'token-based' },
          tokenCount: currentTokens,
          startPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition : 0,
          endPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition + chunkContent.length : chunkContent.length,
        };

        chunks.push(chunk);

        // Keep overlap
        const overlapWords = currentChunk.slice(-Math.ceil((overlapTokens * currentChunk.length) / currentTokens));
        currentChunk = overlapWords;
        currentTokens = this.estimateTokenCount(currentChunk.join(' '));
        chunkIndex++;
      }

      currentChunk.push(word);
      currentTokens += wordTokens;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      const chunk: DocumentChunk = {
        id: `${documentId}-chunk-${chunkIndex}`,
        documentId,
        appId,
        content: chunkContent,
        chunkIndex,
        metadata: { method: 'token-based' },
        tokenCount: currentTokens,
        startPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition : 0,
        endPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition + chunkContent.length : chunkContent.length,
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Semantic chunking - splits at topic boundaries using sentence distance
   * This is a simplified version; advanced version would use embeddings
   */
  private semanticSplit(
    documentId: string,
    appId: string,
    content: string,
  ): DocumentChunk[] {
    // For now, fall back to recursive character split with paragraph priority
    // In production, this would use embeddings to detect topic boundaries
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > this.config.chunkSize && currentChunk.length > 0) {
        const chunk: DocumentChunk = {
          id: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          appId,
          content: currentChunk,
          chunkIndex,
          metadata: { method: 'semantic' },
          tokenCount: this.estimateTokenCount(currentChunk),
          startPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition : 0,
          endPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition + currentChunk.length : currentChunk.length,
        };

        chunks.push(chunk);
        currentChunk = '';
        chunkIndex++;
      }

      currentChunk += sentence;
    }

    if (currentChunk.length > 0) {
      const chunk: DocumentChunk = {
        id: `${documentId}-chunk-${chunkIndex}`,
        documentId,
        appId,
        content: currentChunk,
        chunkIndex,
        metadata: { method: 'semantic' },
        tokenCount: this.estimateTokenCount(currentChunk),
        startPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition : 0,
        endPosition: chunks.length > 0 ? chunks[chunks.length - 1].endPosition + currentChunk.length : currentChunk.length,
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Merge splits into appropriately sized chunks
   */
  private mergeSplits(splits: string[], separator: string): string[] {
    const merged: string[] = [];
    let goodMerges: string[] = [];

    for (const split of splits) {
      if (split.length < this.config.chunkSize) {
        goodMerges.push(split);
      } else {
        if (goodMerges.length > 0) {
          merged.push(goodMerges.join(separator));
          goodMerges = [];
        }
        merged.push(split);
      }
    }

    if (goodMerges.length > 0) {
      merged.push(goodMerges.join(separator));
    }

    return merged;
  }

  /**
   * Get overlapping content from previous chunk
   */
  private getOverlapContent(chunks: string[], currentIndex: number): string {
    if (currentIndex === 0) return '';

    const overlapSize = Math.floor((this.config.chunkSize * this.config.chunkOverlap) / 100);
    const prevChunk = chunks[currentIndex - 1];

    return prevChunk.length > overlapSize ? prevChunk.slice(-overlapSize) : prevChunk;
  }

  /**
   * Estimate start position in original document
   */
  private getStartPosition(chunks: string[], currentIndex: number, overlapContent: string): number {
    if (currentIndex === 0) return 0;

    let position = 0;
    for (let i = 0; i < currentIndex; i++) {
      position += chunks[i].length;
    }

    return Math.max(0, position - overlapContent.length);
  }

  /**
   * Estimate end position in original document
   */
  private getEndPosition(chunks: string[], currentIndex: number): number {
    let position = 0;
    for (let i = 0; i <= currentIndex; i++) {
      position += chunks[i].length;
    }

    return position;
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
