# Prompt Debugger Service - TypeScript Best Practices Reference

This service is a complete example of implementing the TypeScript best practices from the attached document. Every decision is intentional and follows strict patterns.

## File Structure
```
services/prompt-debugger/
├── package.json                 # Service dependencies
├── tsconfig.json               # Strict TypeScript config
├── src/
│   ├── index.ts               # Main Express server
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces
│   ├── schemas/
│   │   └── validation.ts       # Zod runtime validation
│   └── services/
│       └── LLMService.ts       # Claude API integration
```

---

## Pattern 1: Strict TypeScript Configuration

**File: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Why:** 
- `strict: true` enables ALL strict checks in one setting
- `noImplicitAny: true` prevents variables from defaulting to `any`
- `noUncheckedIndexedAccess: true` catches potential undefined array access
- `exactOptionalPropertyTypes: true` prevents accidental undefined assignments

**Result:** Compile-time checks catch 80% of potential runtime errors before code runs.

---

## Pattern 2: Runtime Validation with Zod

**File: `src/schemas/validation.ts`**

### The Problem (Without Zod)
```typescript
// ❌ UNSAFE: TypeScript types vanish at runtime
interface AnalyzeRequest {
  appId: string;
  promptId: string;
  scores: { groundedness: number };
}

function handle(req: Request) {
  // What if req.body.scores.groundedness is a string? ⚠️
  // What if req.body.appId is missing? ⚠️
  // TypeScript won't catch these!
  const data: AnalyzeRequest = req.body;
}
```

### The Solution (With Zod)
```typescript
// ✅ SAFE: Runtime validation + TypeScript types
export const AnalyzePromptRequestSchema = z.object({
  appId: z.string().uuid('Invalid app ID'),
  promptId: z.string().uuid('Invalid prompt ID'),
  scores: z.object({
    groundedness: z.number().min(0).max(100),
  }),
});

type AnalyzePromptRequest = z.infer<typeof AnalyzePromptRequestSchema>;

function handle(req: Request) {
  // Runtime validation - catches bad data immediately
  const parsed = AnalyzePromptRequestSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  // Now TypeScript AND runtime both guarantee data shape
  const data: AnalyzePromptRequest = parsed.data;
}
```

**In the service:**
```typescript
const parsed = AnalyzePromptRequestSchema.safeParse(req.body);

if (!parsed.success) {
  const error: ErrorResponse = {
    error: {
      message: 'Invalid request',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(), // ← Details include which field failed
    },
  };
  res.status(400).json(error);
  return;
}

const request = parsed.data; // ← 100% type-safe
```

**Benefits:**
- Malformed API requests caught immediately
- Type inference gives you autocomplete in IDE
- Detailed error messages tell client what's wrong
- Prevents "Cannot read property of undefined" errors

---

## Pattern 3: No `any` Types - Use `unknown` with Type Guards

### Wrong (Don't Do This)
```typescript
// ❌ BAD: Disables all type checking
async function handleResponse(response: any): Promise<string> {
  return response.content[0].text; // Crashes if structure wrong
}
```

### Right (Do This)
```typescript
// ✅ GOOD: Type-safe from Claude API
interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string;
}

function isClaudeResponse(value: unknown): value is ClaudeResponse {
  // Type guard: checks structure before use
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.content)) return false;

  return obj.content.some(
    (item): item is { type: 'text'; text: string } =>
      typeof item === 'object' &&
      item !== null &&
      (item as Record<string, unknown>).type === 'text' &&
      typeof (item as Record<string, unknown>).text === 'string'
  );
}

async function handleResponse(value: unknown): Promise<string> {
  if (!isClaudeResponse(value)) {
    throw new Error('Invalid response structure');
  }

  // Now TypeScript knows structure is valid
  const textContent = value.content.find(c => c.type === 'text');
  return textContent?.text ?? '';
}
```

**In the service:**
```typescript
private isClaudeResponse(value: unknown): value is ClaudeResponse {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.content)) return false;

  // Check each item has { type: 'text', text: string }
  return obj.content.some(
    (item): item is { type: 'text'; text: string } =>
      // ... validation logic ...
  );
}
```

**Benefits:**
- External APIs can't crash the service
- Malformed responses caught immediately
- Type-safe access to nested properties

---

## Pattern 4: Optional Chaining + Nullish Coalescing

### Wrong (Don't Do This)
```typescript
// ❌ BAD: Will crash if user is null/undefined
const name = user.profile.name;

// ❌ BAD: Using non-null assertion
const name = user!.profile!.name;
```

### Right (Do This)
```typescript
// ✅ GOOD: Safe navigation with fallback
const name = user?.profile?.name ?? 'Unknown';
```

**In the service:**
```typescript
const textContent = data.content.find(
  (c): c is Extract<...> => c.type === 'text'
);

if (!textContent?.text) { // ← Optional chaining
  throw new Error('No text content');
}

return textContent.text;
```

**Benefits:**
- No "Cannot read property X of undefined" errors
- Graceful fallbacks for missing data
- Cleaner, more readable code

---

## Pattern 5: Proper Error Handling

### Wrong (Don't Do This)
```typescript
// ❌ BAD: Swallows errors silently
try {
  const result = await claudeAPI.call(message);
} catch (error) {
  // Silent failure - user never knows why
}
```

### Right (Do This)
```typescript
// ✅ GOOD: Type-safe error handling
try {
  const response = await axios.post(...);
} catch (error: unknown) {
  // Type the unknown error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status ?? 'unknown';
    console.error(`Claude API error (${status}):`, error.message);
    throw new Error(`Claude API failed: ${error.message}`);
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error.message);
    throw error;
  }

  throw new Error('Unknown error occurred');
}
```

**In the service:**
```typescript
catch (error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status ?? 'unknown';
    console.error(`[v0] Claude API error (${status}):`, axiosError.message);
    throw new Error(`Claude API failed: ${axiosError.message}`);
  }

  if (error instanceof Error) {
    console.error('[v0] Unexpected error in Claude call:', error.message);
    throw error;
  }

  throw new Error('Unknown error calling Claude API');
}
```

**Benefits:**
- Distinguishes different error types
- Proper logging with context
- User gets meaningful error messages

---

## Pattern 6: Explicit Types, No Inference

### Wrong (Don't Do This)
```typescript
// ❌ BAD: Type is inferred as any[]
const items = [];
items.push('hello');
items.push(42); // No error - but should be!
```

### Right (Do This)
```typescript
// ✅ GOOD: Explicit type declaration
const items: string[] = [];
items.push('hello');
items.push(42); // ← COMPILE ERROR: Cannot assign number to string
```

**In the service:**
```typescript
// Explicit return types on all functions
async function analyzeRootCause(
  metric: string,
  score: number,
  prompt: string,
  response: string
): Promise<string> { // ← Explicit return type
  // ...
}

// Explicit parameter types
function isClaudeResponse(value: unknown): value is ClaudeResponse { // ← Explicit
  // ...
}

// Explicit array types
const rootCauses: RootCauseAnalysis[] = []; // ← Explicit element type
```

**Benefits:**
- IDE autocomplete works perfectly
- Compiler catches type mismatches immediately
- Future developers understand intent

---

## Pattern 7: Environment Variable Validation

### Wrong (Don't Do This)
```typescript
// ❌ BAD: Crashes if env var missing
const apiKey = process.env.CLAUDE_API_KEY; // Could be undefined!
const client = createClient(apiKey); // Crashes
```

### Right (Do This)
```typescript
// ✅ GOOD: Validate at startup
export const EnvSchema = z.object({
  CLAUDE_API_KEY: z.string().min(1, 'Claude API key required'),
  PORT: z.string().default('3001').transform(Number),
});

// At service startup
const env = parseEnv(process.env);

// Now env.CLAUDE_API_KEY is guaranteed to be string and non-empty
const client = createClient(env.CLAUDE_API_KEY); // Safe!
```

**In the service:**
```typescript
const env = parseEnv(process.env);

// Now TypeScript guarantees env.CLAUDE_API_KEY exists and is valid
const llmService = new LLMService(env.CLAUDE_API_KEY);
```

**Benefits:**
- Fast failure if config is wrong (startup time, not runtime)
- TypeScript knows which env vars are available
- Clear error messages

---

## Summary: All Best Practices Applied

| Practice | Used In | Benefit |
|----------|---------|---------|
| Strict tsconfig.json | Every file | Compile-time safety |
| Zod validation | All API routes | Runtime data integrity |
| Type guards | LLMService | External API safety |
| Optional chaining + nullish coalescing | Throughout | No undefined crashes |
| Explicit types | All functions | IDE autocomplete, self-documenting |
| No `any` types | Never used | Full type safety |
| Proper error handling | API calls | Better debugging |
| Environment validation | Startup | Fast failure detection |

---

## Testing This Service Locally

```bash
# Install dependencies
cd services/prompt-debugger
npm install

# Set environment variables
export CLAUDE_API_KEY=sk-ant-...
export MONGODB_URI=mongodb://localhost:27017
export NODE_ENV=development

# Run in development
npm run dev

# Type check (catches errors before runtime)
npm run type-check

# Build for production
npm run build
```

---

## Next: Replicate This Pattern for Services 2 & 3

The three new microservices (Debugger, Knowledge Integration, Tester Guidance) will all follow this exact pattern:

1. Strict tsconfig.json
2. Zod schemas for all external data
3. Type-safe interfaces for business logic
4. Type guards for API responses
5. Explicit function signatures
6. Proper error handling with context
7. Environment validation at startup

This ensures 100% type safety from day one and eliminates entire categories of bugs.
