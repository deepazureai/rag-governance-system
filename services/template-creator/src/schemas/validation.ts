/**
 * Zod validation schemas for Template Creator Service
 * Runtime validation for all request/response types
 */

import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  appId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  promptText: z.string().min(10),
  expectedOutput: z.string().optional(),
  tags: z.array(z.string()).max(10),
  category: z.string().min(2).max(50),
  analysis: z.object({
    rootCauses: z.array(z.object({
      metric: z.string(),
      score: z.number().min(0).max(100),
      issue: z.string(),
    })).optional(),
    recommendations: z.array(z.object({
      title: z.string(),
      description: z.string(),
      expectedImprovement: z.number().min(0).max(30),
    })).optional(),
  }).optional(),
  metrics: z.object({
    framework: z.string(),
    scores: z.record(z.string(), z.number()),
    averageScore: z.number().min(0).max(100),
  }).optional(),
  isPublic: z.boolean().default(false),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  promptText: z.string().min(10).optional(),
  expectedOutput: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  category: z.string().min(2).max(50).optional(),
  isPublic: z.boolean().optional(),
  changes: z.string().optional(),
});

export const CloneTemplateSchema = z.object({
  templateId: z.string().uuid(),
  newName: z.string().min(3).max(100),
  appId: z.string().uuid(),
});

export const ForkTemplateSchema = z.object({
  templateId: z.string().uuid(),
  newName: z.string().min(3).max(100),
  appId: z.string().uuid(),
  customizations: z.array(z.string()).optional(),
});

export const ShareTemplateSchema = z.object({
  templateIds: z.array(z.string().uuid()).min(1),
  sharedWith: z.array(z.string().email()).min(1),
  permissions: z.enum(['view', 'clone', 'edit']),
  expiresIn: z.number().optional(),
});

export const SearchTemplatesSchema = z.object({
  appId: z.string().uuid().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  createdBy: z.string().optional(),
  minScore: z.number().min(0).max(100).optional(),
  sortBy: z.enum(['created', 'usage', 'score', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export type CreateTemplateRequest = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateSchema>;
export type CloneTemplateRequest = z.infer<typeof CloneTemplateSchema>;
export type ForkTemplateRequest = z.infer<typeof ForkTemplateSchema>;
export type ShareTemplateRequest = z.infer<typeof ShareTemplateSchema>;
export type SearchTemplatesRequest = z.infer<typeof SearchTemplatesSchema>;
