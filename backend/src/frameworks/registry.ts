/**
 * Framework Registry & Manager
 * Manages available frameworks and handles framework switching
 */

import { IEvaluationFramework } from './types.js';
import { RagasFramework } from './ragas.js';
import { MicrosoftEvaluationFramework } from './microsoft.js';

export enum FrameworkType {
  RAGAS = 'ragas',
  MICROSOFT = 'microsoft',
}

export class FrameworkRegistry {
  private frameworks: Map<FrameworkType, IEvaluationFramework> = new Map();
  private activeFramework: FrameworkType = FrameworkType.RAGAS;

  constructor() {
    this.registerFrameworks();
  }

  private registerFrameworks(): void {
    // Register RAGAS
    if (process.env.RAGAS_ENABLED !== 'false') {
      const ragas = new RagasFramework();
      this.frameworks.set(FrameworkType.RAGAS, ragas);
      console.log('[Registry] RAGAS framework registered');
    }

    // Register Microsoft SDK
    if (process.env.MICROSOFT_SDK_ENABLED !== 'false') {
      const microsoft = new MicrosoftEvaluationFramework();
      this.frameworks.set(FrameworkType.MICROSOFT, microsoft);
      console.log('[Registry] Microsoft Evaluation SDK registered');
    }
  }

  /**
   * Get all available frameworks
   */
  getAvailableFrameworks(): Array<{
    type: FrameworkType;
    metadata: ReturnType<IEvaluationFramework['getMetadata']>;
  }> {
    return Array.from(this.frameworks.entries()).map(([type, framework]) => ({
      type,
      metadata: framework.getMetadata(),
    }));
  }

  /**
   * Get a specific framework
   */
  getFramework(type: FrameworkType): IEvaluationFramework {
    const framework = this.frameworks.get(type);
    if (!framework) {
      throw new Error(
        `Framework '${type}' not found. Available: ${Array.from(this.frameworks.keys()).join(', ')}`
      );
    }
    return framework;
  }

  /**
   * Get the currently active framework
   */
  getActiveFramework(): IEvaluationFramework {
    return this.getFramework(this.activeFramework);
  }

  /**
   * Switch to a different framework
   */
  async switchFramework(type: FrameworkType): Promise<void> {
    if (!this.frameworks.has(type)) {
      throw new Error(`Framework '${type}' not available`);
    }

    console.log(`[Registry] Switching framework from ${this.activeFramework} to ${type}`);

    const newFramework = this.frameworks.get(type)!;

    // Initialize if not already initialized
    if (!(newFramework as any).initialized) {
      await newFramework.initialize();
    }

    this.activeFramework = type;
    console.log(`[Registry] Framework switched successfully to ${type}`);
  }

  /**
   * Set active framework
   */
  setActiveFramework(type: FrameworkType): void {
    if (!this.frameworks.has(type)) {
      throw new Error(`Framework '${type}' not available`);
    }
    this.activeFramework = type;
  }

  /**
   * Initialize all frameworks
   */
  async initializeAll(): Promise<void> {
    console.log('[Registry] Initializing all frameworks...');
    const promises = Array.from(this.frameworks.values()).map((framework) =>
      framework.initialize().catch((error) => {
        console.error(
          `[Registry] Failed to initialize ${framework.getMetadata().name}:`,
          error
        );
      })
    );

    await Promise.all(promises);
    console.log('[Registry] All available frameworks initialized');
  }

  /**
   * Shutdown all frameworks
   */
  async shutdownAll(): Promise<void> {
    console.log('[Registry] Shutting down all frameworks...');
    const promises = Array.from(this.frameworks.values()).map((framework) =>
      framework.shutdown().catch((error) => {
        console.error(
          `[Registry] Failed to shutdown ${framework.getMetadata().name}:`,
          error
        );
      })
    );

    await Promise.all(promises);
    console.log('[Registry] All frameworks shut down');
  }

  /**
   * Health check for all frameworks
   */
  async healthCheckAll(): Promise<
    Record<FrameworkType, { name: string; healthy: boolean }>
  > {
    const results: Record<FrameworkType, { name: string; healthy: boolean }> = {} as any;

    for (const [type, framework] of this.frameworks.entries()) {
      try {
        const healthy = await framework.healthCheck();
        results[type] = {
          name: framework.getMetadata().name,
          healthy,
        };
      } catch (error) {
        console.error(`[Registry] Health check failed for ${type}:`, error);
        results[type] = {
          name: framework.getMetadata().name,
          healthy: false,
        };
      }
    }

    return results;
  }
}

// Singleton instance
let registryInstance: FrameworkRegistry | null = null;

export function getFrameworkRegistry(): FrameworkRegistry {
  if (!registryInstance) {
    registryInstance = new FrameworkRegistry();
  }
  return registryInstance;
}

export function resetFrameworkRegistry(): void {
  registryInstance = null;
}
