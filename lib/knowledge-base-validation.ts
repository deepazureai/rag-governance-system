import { z } from 'zod';

/**
 * Runtime validation schemas for Knowledge Base API responses
 * These ensure type safety even when API returns unexpected data
 */

// Upload Response Validation
export const UploadResponseSchema = z.object({
  documentId: z.string().min(1, 'Document ID must not be empty'),
  chunksCreated: z.number().int().positive('Chunks created must be positive'),
  success: z.boolean(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// Chat Response Validation
export const ContextSourceSchema = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  content: z.string(),
  relevanceScore: z.number().min(0).max(1),
});

export const ChatResponseSchema = z.object({
  messageId: z.string(),
  assistantMessage: z.string(),
  contextUsed: z.array(ContextSourceSchema).optional(),
  success: z.boolean(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// Delete Response Validation
export const DeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

// Chat Threads Response Validation
export const ChatThreadResponseSchema = z.object({
  threadId: z.string(),
  topic: z.string(),
  createdAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
  usedInTemplate: z.boolean(),
});

export const ChatThreadsListSchema = z.object({
  threads: z.array(ChatThreadResponseSchema),
  totalThreads: z.number().int().nonnegative(),
});

export type ChatThreadsResponse = z.infer<typeof ChatThreadsListSchema>;

// Utility function for safe parsing
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[v0] Validation error:', error.errors);
      throw new Error(`Invalid API response: ${error.errors[0]?.message || 'Unknown error'}`);
    }
    throw error;
  }
}
