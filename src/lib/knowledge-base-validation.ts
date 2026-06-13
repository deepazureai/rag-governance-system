import { z } from 'zod';

/**
 * Validation schemas for Knowledge Base API responses
 */

// Upload result for a single file
const UploadResultSchema = z.object({
  filename: z.string(),
  status: z.enum(['success', 'error']),
  chunksCreated: z.number().optional(),
  keyTerms: z.array(z.string()).optional(),
  error: z.string().optional(),
});

// Upload response from backend
export const UploadResponseSchema = z.object({
  uploadedAt: z.string(),
  applicationId: z.string(),
  namespace: z.string(),
  results: z.array(UploadResultSchema),
  totalChunksCreated: z.number(),
  success: z.boolean(),
  message: z.string(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// Delete response from backend
export const DeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedCount: z.number().optional(),
});

export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

// Chat response from backend
export const ChatResponseSchema = z.object({
  threadId: z.string(),
  messageId: z.string(),
  content: z.string(),
  timestamp: z.string(),
  sources: z.array(z.object({
    documentId: z.string(),
    relevanceScore: z.number(),
    content: z.string().optional(),
  })).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// Generic response wrapper
const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean().optional(),
    data: dataSchema,
    error: z.string().optional(),
    message: z.string().optional(),
  });

/**
 * Validate API response against a schema
 * Throws descriptive error if validation fails
 */
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Invalid API response: ${issues}`);
    }
    throw error;
  }
}
