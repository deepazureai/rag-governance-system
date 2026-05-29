import { Types } from 'mongoose';
import { PromptTemplate, IPromptTemplate, IDistributionTarget } from '../models/PromptTemplate';
import { logger } from '../utils/logger';
import { DistributeTemplateRequest } from '../utils/validation/templates-validation';

/**
 * Template Distribution Service
 * Manages role-based distribution of prompt templates to users/groups
 * Enforces permission boundaries and tracks distribution
 */
export class TemplateDistributionService {
  private static readonly SYSTEM_ROLES = {
    ADMIN: 'admin',
    BA: 'ba',
    ANALYST: 'analyst',
    QA_TESTER: 'qa_tester',
    BUSINESS_USER: 'business_user',
  } as const;

  /**
   * Distribute template to specified roles/groups/individuals
   */
  async distributeTemplate(
    templateId: string,
    request: DistributeTemplateRequest
  ): Promise<IPromptTemplate> {
    try {
      logger.info(`[TemplateDistributionService] Distributing template ${templateId} to ${request.distributionTargets.length} targets`);

      // Add distributedAt timestamp to each target
      const targetsWithTimestamp: IDistributionTarget[] = request.distributionTargets.map((target) => ({
        ...target,
        distributedAt: new Date(),
      }));

      // Validate distribution targets
      this.validateDistributionTargets(targetsWithTimestamp);

      // Add distribution targets to template
      const template = await PromptTemplate.findByIdAndUpdate(
        templateId,
        {
          $push: {
            distributionTargets: { $each: targetsWithTimestamp },
          },
        },
        { new: true }
      );

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      logger.info(`[TemplateDistributionService] Template distributed successfully: ${templateId}`);

      // TODO: Send notifications to distributed users
      await this.notifyDistributedUsers(template, targetsWithTimestamp);

      return template;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[TemplateDistributionService] Distribution failed: ${errorMessage}`);
      throw new Error(`Template distribution failed: ${errorMessage}`);
    }
  }

  /**
   * Get templates available to a specific role/user
   */
  async getTemplatesForRole(
    applicationId: string,
    userId: string,
    userRole: string,
    filter?: {
      status?: 'draft' | 'published' | 'archived';
      limit?: number;
      offset?: number;
    }
  ): Promise<IPromptTemplate[]> {
    try {
      const limit = filter?.limit || 20;
      const offset = filter?.offset || 0;

      // Build query based on user role and access permissions
      const query: Record<string, any> = {
        applicationId,
        status: filter?.status || { $in: ['published', 'draft'] },
      };

      // Filter templates by role-based distribution
      const roleDistributed = {
        'distributionTargets.roleId': userRole,
        'distributionTargets.type': 'role',
      };

      const userDistributed = {
        'distributionTargets.userId': userId,
        'distributionTargets.type': 'individual',
      };

      // Admins see all templates for their application
      if (userRole === TemplateDistributionService.SYSTEM_ROLES.ADMIN) {
        const templates = await PromptTemplate.find(query).limit(limit).skip(offset).exec();
        return templates;
      }

      // Others see only distributed templates + public templates
      const templates = await PromptTemplate.find({
        applicationId,
        $or: [
          { isPublic: true },
          roleDistributed,
          userDistributed,
        ],
        status: filter?.status || { $in: ['published', 'draft'] },
      })
        .limit(limit)
        .skip(offset)
        .exec();

      logger.info(`[TemplateDistributionService] Retrieved ${templates.length} templates for user ${userId} with role ${userRole}`);

      return templates;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[TemplateDistributionService] Fetch failed: ${errorMessage}`);
      throw new Error(`Failed to fetch templates: ${errorMessage}`);
    }
  }

  /**
   * Check if user has permission to edit template
   */
  canUserEditTemplate(template: IPromptTemplate, userId: string, userRole: string): boolean {
    // Admin can always edit
    if (userRole === TemplateDistributionService.SYSTEM_ROLES.ADMIN) {
      return true;
    }

    // Creator can edit their own templates
    if (template.createdBy === userId) {
      return true;
    }

    // Check distribution permissions
    const userTarget = template.distributionTargets.find((t) => {
      if (t.type === 'individual' && t.userId === userId && t.canEdit) {
        return true;
      }
      if (t.type === 'role' && t.roleId === userRole && t.canEdit) {
        return true;
      }
      return false;
    });

    return !!userTarget;
  }

  /**
   * Check if user has permission to share template
   */
  canUserShareTemplate(template: IPromptTemplate, userId: string, userRole: string): boolean {
    // Admin can always share
    if (userRole === TemplateDistributionService.SYSTEM_ROLES.ADMIN) {
      return true;
    }

    // Creator can share their own templates
    if (template.createdBy === userId) {
      return true;
    }

    // Check distribution permissions
    const userTarget = template.distributionTargets.find((t) => {
      if (t.type === 'individual' && t.userId === userId && t.canShare) {
        return true;
      }
      if (t.type === 'role' && t.roleId === userRole && t.canShare) {
        return true;
      }
      return false;
    });

    return !!userTarget;
  }

  /**
   * Revoke distribution target from template
   */
  async revokeDistribution(templateId: string, targetId: string): Promise<IPromptTemplate> {
    try {
      const template = await PromptTemplate.findByIdAndUpdate(
        templateId,
        {
          $pull: {
            distributionTargets: { _id: new Types.ObjectId(targetId) },
          },
        },
        { new: true }
      );

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      logger.info(`[TemplateDistributionService] Distribution revoked: ${templateId} -> ${targetId}`);

      return template;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[TemplateDistributionService] Revoke failed: ${errorMessage}`);
      throw new Error(`Failed to revoke distribution: ${errorMessage}`);
    }
  }

  /**
   * Validate distribution targets
   */
  private validateDistributionTargets(targets: IDistributionTarget[]): void {
    for (const target of targets) {
      if (target.type === 'role' && !target.roleId) {
        throw new Error('Role type distribution target requires roleId');
      }
      if (target.type === 'group' && !target.groupId) {
        throw new Error('Group type distribution target requires groupId');
      }
      if (target.type === 'individual' && !target.userId) {
        throw new Error('Individual type distribution target requires userId');
      }
    }
  }

  /**
   * Send notifications to distributed users
   */
  private async notifyDistributedUsers(
    template: IPromptTemplate,
    targets: readonly IDistributionTarget[]
  ): Promise<void> {
    try {
      // TODO: Implement notification system
      // Send notifications to:
      // - Users with notifyOnUpdate = true
      // - All members of distributed groups
      // - Users with specified role

      logger.info(`[TemplateDistributionService] Sending notifications for template ${template._id}`);

      // Placeholder for notification logic
      for (const target of targets) {
        if (target.notifyOnUpdate) {
          logger.info(`[TemplateDistributionService] Would notify ${target.type} ${target.roleId || target.groupId || target.userId}`);
        }
      }
    } catch (error: unknown) {
      // Log but don't fail distribution if notifications fail
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`[TemplateDistributionService] Notification failed (non-blocking): ${errorMessage}`);
    }
  }
}

export const templateDistributionService = new TemplateDistributionService();
