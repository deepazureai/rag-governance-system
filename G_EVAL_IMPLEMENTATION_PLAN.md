# G-EVAL IMPLEMENTATION TECHNICAL PLAN

## Overview
This document provides the complete technical roadmap for integrating G-EVAL as the fourth evaluation framework alongside RAGAS, BLEU/ROUGE, and LLAMAIndex.

---

## Architecture & Integration Points

### Current Framework Structure
```
backend/src/frameworks/
├── types.ts                    # IEvaluationFramework interface
├── registry.ts                 # Framework registry
├── ragas.ts                    # RAGAS implementation
├── microsoft.ts                # BLEU/ROUGE implementation
└── [llamaindex.ts]             # LLAMAIndex implementation

backend/src/services/
├── MultiFrameworkEvaluator.ts  # Orchestrates all frameworks
└── DataProcessingService.ts    # Calls MultiFrameworkEvaluator
```

### Adding G-EVAL

```
backend/src/frameworks/
├── types.ts                    # ← Update interfaces (add safety metrics)
├── registry.ts                 # ← Register GEvalFramework
├── ragas.ts                    
├── microsoft.ts                
├── llamaindex.ts              
└── geval.ts                    # ← NEW: G-EVAL implementation

backend/src/services/
├── GEvalCustomCriteriaService.ts  # ← NEW: Custom criteria mgmt
├── GEvalSafetyRulesService.ts     # ← NEW: Safety rules engine
├── MultiFrameworkEvaluator.ts     # ← Update to include G-EVAL
└── DataProcessingService.ts
```

---

## Phase 1: Framework Foundation

### 1.1 Update Framework Types

**File**: `backend/src/frameworks/types.ts`

Add new interfaces:
```typescript
// Add to DetailedMetrics interface
export interface DetailedMetrics {
  // ... existing metrics ...
  
  // G-EVAL Safety Metrics
  safety?: number;              // 0-100: Overall safety score
  piiLeakage?: number;          // 0-100: PII exposure risk
  toxicity?: number;            // 0-100: Harmful content detection
  bias?: number;                // 0-100: Bias detection (gender/race/religion)
  fairness?: number;            // 0-100: Response fairness
  regulatory?: number;          // 0-100: Regulatory compliance
  
  // Custom criteria (dynamic)
  customCriteria?: Record<string, number>;
  
  // Risk flags
  riskFlags?: string[];         // ['PII_DETECTED', 'BIAS_WARNING', 'OFF_TOPIC']
}

// Add new interface for G-EVAL reasoning
export interface GEvalReasoningChain {
  criteria: string;
  analysis: string;             // LLM's analysis of the response
  reasoning: string;            // Chain-of-thought reasoning
  riskFactors: string[];        // Identified risks
  score: number;                // 0-100 score
  confidence: number;           // 0-100 confidence level
}

// Add to EvaluationResult
export interface EvaluationResult {
  // ... existing fields ...
  gEvalReasoning?: GEvalReasoningChain[];  // G-EVAL reasoning traces
  safetyAlerts?: Array<{
    severity: 'critical' | 'warning' | 'info';
    type: string;
    message: string;
  }>;
}
```

### 1.2 Create G-EVAL Framework Adapter

**File**: `backend/src/frameworks/geval.ts`

```typescript
import { BaseEvaluationFramework, EvaluationRequest, EvaluationResult, DetailedMetrics, GEvalReasoningChain } from './types';
import { logger } from '../utils/logger.js';

export class GEvalFramework extends BaseEvaluationFramework {
  private evaluatorModel: string = 'gpt-4-turbo'; // Configurable
  private customCriteria: Map<string, string> = new Map();
  
  getMetadata() {
    return {
      name: 'G-EVAL',
      version: '1.0.0',
      description: 'LLM-as-Judge evaluation framework for safety, ethics, and custom criteria',
      supportedMetrics: [
        'safety',
        'piiLeakage',
        'toxicity',
        'bias',
        'fairness',
        'regulatory',
        ...Array.from(this.customCriteria.keys()), // Dynamic custom criteria
      ],
    };
  }
  
  async initialize(): Promise<void> {
    try {
      logger.info('[G-EVAL] Initializing G-EVAL framework');
      
      // Load custom criteria from database
      await this.loadCustomCriteria();
      
      // Verify LLM API connectivity
      await this.verifySafetyEvaluatorConnectivity();
      
      this.initialized = true;
      logger.info('[G-EVAL] Framework initialized successfully');
    } catch (error) {
      logger.error('[G-EVAL] Initialization failed:', error);
      throw error;
    }
  }
  
  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    
    try {
      logger.info(`[G-EVAL] Evaluating query: ${request.id}`);
      
      // Generate safety evaluation prompts
      const prompts = this.generateSafetyEvaluationPrompts(request);
      
      // Run safety evaluations in parallel
      const reasoningChains: GEvalReasoningChain[] = [];
      for (const prompt of prompts) {
        const reasoning = await this.evaluateWithLLMAsJudge(prompt, request);
        reasoningChains.push(reasoning);
      }
      
      // Aggregate results
      const metrics = this.aggregateMetrics(reasoningChains);
      const riskFlags = this.extractRiskFlags(reasoningChains);
      const safetyAlerts = this.generateSafetyAlerts(reasoningChains);
      
      return {
        id: request.id,
        frameworkName: 'G-EVAL',
        frameworkVersion: '1.0.0',
        query: request.query,
        response: request.response,
        metrics,
        overallScore: metrics.safety || 50,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        gEvalReasoning: reasoningChains,
        safetyAlerts,
        rawData: { riskFlags },
      };
    } catch (error: any) {
      logger.error('[G-EVAL] Evaluation failed:', error);
      return {
        id: request.id,
        frameworkName: 'G-EVAL',
        frameworkVersion: '1.0.0',
        query: request.query,
        response: request.response,
        metrics: {},
        overallScore: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }
  
  private generateSafetyEvaluationPrompts(request: EvaluationRequest) {
    return [
      {
        name: 'safety',
        prompt: `Evaluate the safety of this response on a scale of 0-100...`,
      },
      {
        name: 'piiLeakage',
        prompt: `Check for PII exposure (SSN, credit card, email, phone)...`,
      },
      {
        name: 'toxicity',
        prompt: `Evaluate for toxic, harmful, or inappropriate content...`,
      },
      {
        name: 'bias',
        prompt: `Detect any gender, race, religion, or other biases...`,
      },
      ...Array.from(this.customCriteria.entries()).map(([name, criteria]) => ({
        name,
        prompt: `Evaluate based on this criterion: ${criteria}`,
      })),
    ];
  }
  
  private async evaluateWithLLMAsJudge(evaluation: any, request: EvaluationRequest): Promise<GEvalReasoningChain> {
    // Call LLM (OpenAI, Claude, etc.) with chain-of-thought prompt
    // Returns reasoning chain with score
    
    // Pseudo-code:
    // 1. Build prompt with context, query, response, evaluation criterion
    // 2. Call LLM with temperature=0 for consistent results
    // 3. Parse response for reasoning, score, risk factors
    // 4. Return GEvalReasoningChain
    
    return {
      criteria: evaluation.name,
      analysis: '...LLM analysis...',
      reasoning: '...LLM chain-of-thought...',
      riskFactors: [],
      score: 85,
      confidence: 0.92,
    };
  }
  
  private aggregateMetrics(reasoningChains: GEvalReasoningChain[]): DetailedMetrics {
    const metrics: DetailedMetrics = {};
    
    for (const chain of reasoningChains) {
      metrics[chain.criteria as keyof DetailedMetrics] = chain.score;
    }
    
    return metrics;
  }
  
  private extractRiskFlags(reasoningChains: GEvalReasoningChain[]): string[] {
    const flags: Set<string> = new Set();
    
    for (const chain of reasoningChains) {
      flags.add(...chain.riskFactors);
    }
    
    return Array.from(flags);
  }
  
  private generateSafetyAlerts(reasoningChains: GEvalReasoningChain[]) {
    return reasoningChains
      .filter(chain => chain.score < 80) // Threshold
      .map(chain => ({
        severity: chain.score < 50 ? 'critical' : 'warning',
        type: chain.criteria,
        message: `${chain.criteria} score: ${chain.score}. ${chain.analysis}`,
      }));
  }
  
  private async loadCustomCriteria(): Promise<void> {
    // Load from database or configuration
  }
  
  private async verifySafetyEvaluatorConnectivity(): Promise<void> {
    // Test LLM API connectivity
  }
}
```

### 1.3 Update Framework Registry

**File**: `backend/src/frameworks/registry.ts`

```typescript
import { GEvalFramework } from './geval.js';

export const FrameworkRegistry = {
  ragas: new RagasFramework(),
  bleu_rouge: new BLEUROUGEFramework(),
  llamaindex: new LLAMAIndexFramework(),
  geval: new GEvalFramework(),  // ← NEW
};

export const getAllFrameworks = () => Object.values(FrameworkRegistry);
```

---

## Phase 2: Custom Criteria Management

### 2.1 Custom Criteria Service

**File**: `backend/src/services/GEvalCustomCriteriaService.ts`

```typescript
export class GEvalCustomCriteriaService {
  /**
   * Save custom evaluation criterion for an application
   */
  static async saveCustomCriterion(applicationId: string, criterion: {
    name: string;
    description: string;
    evaluationGuide: string;  // How to evaluate this criterion
    targetScore: number;      // 0-100 target
    weight: number;           // Importance weight
  }): Promise<void> {
    const CustomCriteriaCollection = mongoose.connection.collection('customcriteria');
    
    await CustomCriteriaCollection.updateOne(
      { applicationId, 'criteria.name': criterion.name },
      {
        $set: {
          'criteria.$': criterion,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  
  /**
   * Get all custom criteria for an application
   */
  static async getApplicationCriteria(applicationId: string): Promise<any[]> {
    const CustomCriteriaCollection = mongoose.connection.collection('customcriteria');
    
    const doc = await CustomCriteriaCollection.findOne({ applicationId });
    return doc?.criteria || [];
  }
  
  /**
   * Delete custom criterion
   */
  static async deleteCustomCriterion(applicationId: string, criterionName: string): Promise<void> {
    const CustomCriteriaCollection = mongoose.connection.collection('customcriteria');
    
    await CustomCriteriaCollection.updateOne(
      { applicationId },
      { $pull: { criteria: { name: criterionName } } }
    );
  }
}
```

### 2.2 Safety Rules Service

**File**: `backend/src/services/GEvalSafetyRulesService.ts`

```typescript
export class GEvalSafetyRulesService {
  private static DEFAULT_SAFETY_RULES = {
    piiCheck: {
      enabled: true,
      patterns: [/\d{3}-\d{2}-\d{4}/, /\d{16}/], // SSN, credit card
    },
    toxicityThreshold: 0.8,
    biasDetection: true,
    regulatoryCompliance: {
      financial: false,
      healthcare: false,
      government: false,
    },
  };
  
  /**
   * Get safety rules for application
   */
  static async getApplicationSafetyRules(applicationId: string): Promise<any> {
    const SafetyRulesCollection = mongoose.connection.collection('safetyrules');
    
    const rules = await SafetyRulesCollection.findOne({ applicationId });
    return rules?.rules || this.DEFAULT_SAFETY_RULES;
  }
  
  /**
   * Update safety rules for application
   */
  static async updateSafetyRules(applicationId: string, rules: any): Promise<void> {
    const SafetyRulesCollection = mongoose.connection.collection('safetyrules');
    
    await SafetyRulesCollection.updateOne(
      { applicationId },
      { $set: { rules, updatedAt: new Date() } },
      { upsert: true }
    );
  }
}
```

---

## Phase 3: Database Schema Updates

### 3.1 New Collections

```javascript
// customcriteria collection
{
  _id: ObjectId,
  applicationId: "app-123",
  criteria: [
    {
      name: "professionalism",
      description: "Response maintains professional tone",
      evaluationGuide: "Score 0-100 based on formality, politeness, and appropriateness",
      targetScore: 85,
      weight: 0.7
    },
    {
      name: "conciseness",
      description: "Response is concise and not verbose",
      evaluationGuide: "Score 0-100 based on word economy and directness",
      targetScore: 80,
      weight: 0.5
    }
  ],
  createdAt: ISODate,
  updatedAt: ISODate
}

// safetyrules collection
{
  _id: ObjectId,
  applicationId: "app-123",
  rules: {
    piiCheck: { enabled: true, patterns: [...] },
    toxicityThreshold: 0.8,
    biasDetection: true,
    regulatoryCompliance: { financial: true, healthcare: false }
  },
  createdAt: ISODate,
  updatedAt: ISODate
}

// evaluationrecords updates (add G-EVAL fields)
{
  ...existing fields...,
  geval: {
    safety: 0.85,
    piiLeakage: 0.95,
    toxicity: 0.98,
    bias: 0.82,
    customCriteria: {
      professionalism: 0.88,
      conciseness: 0.75
    },
    reasoningChains: [...],
    riskFlags: ['BIAS_WARNING'],
    safetyAlerts: [...]
  }
}
```

---

## Phase 4: MultiFrameworkEvaluator Updates

**File**: `backend/src/services/MultiFrameworkEvaluator.ts`

```typescript
static async evaluateMultiFramework(
  query: string,
  response: string,
  retrievedDocuments: any[]
): Promise<{ frameworkResults: FrameworkResult[]; mappedMetrics: EvaluationMetrics }> {
  const frameworkResults: FrameworkResult[] = [];
  
  try {
    // Run all 4 frameworks in parallel
    const [ragasResult, bleuRougeResult, llamaResult, gEvalResult] = await Promise.allSettled([
      this.evaluateRAGAS(query, response, retrievedDocuments),
      this.evaluateBLEUROUGE(query, response, retrievedDocuments),
      this.evaluateLLAMAIndex(query, response, retrievedDocuments),
      this.evaluateGEval(query, response, retrievedDocuments),  // ← NEW
    ]);
    
    // Process results...
    
    // Combine metrics
    const mappedMetrics: EvaluationMetrics = {
      // Quality metrics (avg of 3)
      groundedness: (ragas.groundedness + llama.correctness) / 2,
      coherence: (ragas.coherence + llama.correctness) / 2,
      relevance: (ragas.relevance + llama.relevancy) / 2,
      
      // Safety metrics (G-EVAL specific)
      safety: geval.safety,
      piiLeakage: geval.piiLeakage,
      toxicity: geval.toxicity,
      bias: geval.bias,
      
      // Overall compliance
      overallScore: this.calculateOverallScore(results),
    };
    
    return { frameworkResults, mappedMetrics };
  } catch (error) {
    logger.error('[MultiFrameworkEvaluator] Evaluation failed:', error);
    throw error;
  }
}

private static async evaluateGEval(query: string, response: string, retrievedDocuments: any[]) {
  const gEvalFramework = FrameworkRegistry.geval;
  
  return await gEvalFramework.evaluate({
    id: uuidv4(),
    query,
    response,
    retrievedDocuments,
  });
}
```

---

## Phase 5: API Routes

### 5.1 Custom Criteria Management API

**File**: `backend/src/api/gEvalRoutes.ts` (NEW)

```typescript
const gEvalRouter = express.Router();

/**
 * GET /api/geval/criteria/:appId
 * Get custom criteria for application
 */
gEvalRouter.get('/criteria/:appId', async (req, res) => {
  try {
    const criteria = await GEvalCustomCriteriaService.getApplicationCriteria(req.params.appId);
    res.json({ success: true, data: criteria });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/geval/criteria/:appId
 * Add custom criterion
 */
gEvalRouter.post('/criteria/:appId', async (req, res) => {
  try {
    await GEvalCustomCriteriaService.saveCustomCriterion(req.params.appId, req.body);
    res.json({ success: true, message: 'Criterion saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/geval/safety-rules/:appId
 * Get safety rules
 */
gEvalRouter.get('/safety-rules/:appId', async (req, res) => {
  try {
    const rules = await GEvalSafetyRulesService.getApplicationSafetyRules(req.params.appId);
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/geval/safety-rules/:appId
 * Update safety rules
 */
gEvalRouter.post('/safety-rules/:appId', async (req, res) => {
  try {
    await GEvalSafetyRulesService.updateSafetyRules(req.params.appId, req.body);
    res.json({ success: true, message: 'Safety rules updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default gEvalRouter;
```

---

## Phase 6: Frontend Updates

### 6.1 Safety Dashboard Component

**File**: `src/components/dashboard/safety-dashboard.tsx` (NEW)

```typescript
'use client';

export function SafetyDashboard({ applicationId }: { applicationId: string }) {
  const [safetyMetrics, setSafetyMetrics] = useState(null);
  const [riskFlags, setRiskFlags] = useState([]);
  const [customCriteria, setCustomCriteria] = useState([]);
  
  useEffect(() => {
    // Fetch safety metrics and custom criteria
  }, [applicationId]);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Safety & Compliance</h2>
        <p className="text-gray-600">G-EVAL powered safety evaluation</p>
      </div>
      
      {/* Safety Score Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Safety Score</p>
            <p className="text-4xl font-bold">{safetyMetrics?.safety}%</p>
          </div>
          <div className="w-20 h-20">
            {/* Circular progress */}
          </div>
        </div>
      </Card>
      
      {/* Risk Flags */}
      {riskFlags.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">⚠️ Detected Risks</h3>
          <div className="space-y-2">
            {riskFlags.map(flag => (
              <div key={flag} className="p-3 bg-red-50 border border-red-200 rounded">
                {flag}
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Custom Criteria */}
      <Card>
        <h3 className="font-semibold mb-4">Custom Evaluation Criteria</h3>
        <div className="space-y-4">
          {customCriteria.map(criterion => (
            <div key={criterion.name} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{criterion.name}</p>
                <p className="text-sm text-gray-600">{criterion.description}</p>
              </div>
              <div className="text-2xl font-bold">{criterion.score}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

---

## Cost & Performance Considerations

### Cost Impact
- RAGAS: Free (open-source)
- BLEU/ROUGE: Free (algorithm-based)
- LLAMAIndex: Free (open-source)
- G-EVAL: **$0.002-0.01 per evaluation** (LLM API calls)
  - Using GPT-4: ~$0.01/evaluation
  - Using Claude 3: ~$0.01/evaluation
  - Using Llama 2: ~$0.001/evaluation

**Recommendation**: Offer G-EVAL as premium feature or include in enterprise plans

### Latency Impact
- RAGAS: 200-500ms
- BLEU/ROUGE: 50-100ms
- LLAMAIndex: 100-300ms
- G-EVAL: **500-1000ms per evaluation** (LLM inference)

**Optimization**: Run G-EVAL asynchronously with callback notifications

---

## Success Criteria

- [ ] All 4 frameworks run in parallel with <2s total latency
- [ ] Custom criteria definition UX enables non-technical users to define rules
- [ ] Safety metrics captured in all existing evaluation records
- [ ] Risk flags trigger alerts via existing alert system
- [ ] Compliance reports auto-generated with audit trail
- [ ] Enterprise customers adopt G-EVAL for new deployments

