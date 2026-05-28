import fetch from 'node-fetch';

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:5001';
const TEST_APP_ID = 'test-app-12345';
const TEST_PROVIDER = process.env.LLM_PROVIDER || 'openai';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper to make API calls
async function apiCall(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const startTime = Date.now();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  const duration = Date.now() - startTime;

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

// Test 1: Template Assistance API
async function testTemplateAssistance() {
  console.log('\n📋 Testing Template Assistance API...');

  try {
    const result = await apiCall('POST', '/api/prompt-templates/assist/combine-prompts', {
      applicationId: TEST_APP_ID,
      selectedPromptIds: ['template-1', 'template-2'],
      userContext: 'Combine these for data validation',
    });

    const passed =
      result.ok &&
      result.data &&
      typeof result.data === 'object' &&
      'data' in result.data &&
      'suggestion' in (result.data as any).data;

    results.push({
      name: 'Template Assistance API',
      passed,
      error: passed ? undefined : `Status: ${result.status}, Response: ${JSON.stringify(result.data)}`,
      duration: 0,
    });

    if (passed) {
      const suggestion = (result.data as any).data.suggestion;
      console.log(`✅ Template suggestion generated (${suggestion.length} chars)`);
    } else {
      console.log(`❌ Template suggestion failed`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Template Assistance API',
      passed: false,
      error: message,
      duration: 0,
    });
    console.log(`❌ Error: ${message}`);
  }
}

// Test 2: Recommendation Refinement API
async function testRecommendationRefinement() {
  console.log('\n📝 Testing Recommendation Refinement API...');

  try {
    const originalRecommendation =
      'This applicant shows good technical skills but communication could be improved. ' +
      'Recommend approval with mentorship on presentation skills.';

    const result = await apiCall('POST', '/api/ba-review/assist/refine-recommendation', {
      applicationId: TEST_APP_ID,
      queueItemId: 'queue-item-123',
      recommendationText: originalRecommendation,
    });

    const passed =
      result.ok &&
      result.data &&
      typeof result.data === 'object' &&
      'data' in result.data &&
      'suggestion' in (result.data as any).data;

    results.push({
      name: 'Recommendation Refinement API',
      passed,
      error: passed ? undefined : `Status: ${result.status}, Response: ${JSON.stringify(result.data)}`,
      duration: 0,
    });

    if (passed) {
      const suggestion = (result.data as any).data.suggestion;
      console.log(`✅ Recommendation refined (${suggestion.length} chars)`);
    } else {
      console.log(`❌ Recommendation refinement failed`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Recommendation Refinement API',
      passed: false,
      error: message,
      duration: 0,
    });
    console.log(`❌ Error: ${message}`);
  }
}

// Test 3: KB Summary Generation API
async function testKBSummary() {
  console.log('\n📚 Testing KB Summary Generation API...');

  try {
    const longContent = `
This comprehensive guide covers advanced techniques in machine learning, including neural networks, 
deep learning, and reinforcement learning. Neural networks are computational models inspired by biological 
neurons that can learn complex patterns from data. Deep learning uses multiple layers of neural networks to 
extract progressively abstract features. Reinforcement learning trains agents to make sequential decisions 
to maximize cumulative rewards. These techniques have applications in computer vision, natural language 
processing, and autonomous systems. The guide includes practical examples, code snippets, and best practices 
for implementing these techniques effectively. Advanced concepts covered include attention mechanisms, 
transformer architectures, and large language models. Performance optimization techniques and deployment 
strategies are also discussed for production environments.
    `.trim();

    const result = await apiCall('POST', '/api/knowledge-base/assist/generate-summary', {
      applicationId: TEST_APP_ID,
      documentId: 'doc-456',
      contentText: longContent,
    });

    const passed =
      result.ok &&
      result.data &&
      typeof result.data === 'object' &&
      'data' in result.data &&
      'suggestion' in (result.data as any).data;

    results.push({
      name: 'KB Summary Generation API',
      passed,
      error: passed ? undefined : `Status: ${result.status}, Response: ${JSON.stringify(result.data)}`,
      duration: 0,
    });

    if (passed) {
      const suggestion = (result.data as any).data.suggestion;
      const compression = ((1 - suggestion.length / longContent.length) * 100).toFixed(1);
      console.log(`✅ Summary generated (${suggestion.length} chars, ${compression}% compression)`);
    } else {
      console.log(`❌ Summary generation failed`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'KB Summary Generation API',
      passed: false,
      error: message,
      duration: 0,
    });
    console.log(`❌ Error: ${message}`);
  }
}

// Test 4: Error Handling - Missing Required Fields
async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling...');

  try {
    // Test missing applicationId
    const result = await apiCall('POST', '/api/prompt-templates/assist/combine-prompts', {
      selectedPromptIds: ['template-1'],
      // applicationId is missing
    });

    const passed = !result.ok && result.status === 400;

    results.push({
      name: 'Error Handling - Missing Fields',
      passed,
      error: passed ? undefined : `Expected 400, got ${result.status}`,
      duration: 0,
    });

    if (passed) {
      console.log('✅ Correctly rejected missing required fields');
    } else {
      console.log(`❌ Error handling failed (got status ${result.status})`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Error Handling - Missing Fields',
      passed: false,
      error: message,
      duration: 0,
    });
    console.log(`❌ Error: ${message}`);
  }
}

// Test 5: Content Validation
async function testContentValidation() {
  console.log('\n🔍 Testing Content Validation...');

  try {
    // Test with very short content (below minimum)
    const result = await apiCall('POST', '/api/ba-review/assist/refine-recommendation', {
      applicationId: TEST_APP_ID,
      recommendationText: 'Too short', // Less than 10 chars minimum
    });

    const passed = !result.ok && result.status === 400;

    results.push({
      name: 'Content Validation - Min Length',
      passed,
      error: passed ? undefined : `Expected 400, got ${result.status}`,
      duration: 0,
    });

    if (passed) {
      console.log('✅ Correctly rejected content below minimum length');
    } else {
      console.log(`❌ Content validation failed`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Content Validation - Min Length',
      passed: false,
      error: message,
      duration: 0,
    });
    console.log(`❌ Error: ${message}`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('====================================');
  console.log('   LLM Assistance API Test Suite');
  console.log('====================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`LLM Provider: ${TEST_PROVIDER}`);
  console.log(`Test App ID: ${TEST_APP_ID}`);

  await testTemplateAssistance();
  await testRecommendationRefinement();
  await testKBSummary();
  await testErrorHandling();
  await testContentValidation();

  // Print summary
  console.log('\n====================================');
  console.log('              Test Results');
  console.log('====================================');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('\n====================================');
  console.log(`Total: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log('====================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
