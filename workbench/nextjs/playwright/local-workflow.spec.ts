import { test, expect } from '@playwright/test';

test.describe('Local Workflow Test', () => {
  test('ejecuta el workflow local exponiendo el resultado', async ({ request }) => {
    const response = await request.post('/api/local-test', {
      data: {
        input: 'local-test-input'
      }
    });

    expect(response.status()).toBe(200);
    
    const result = await response.json();
    console.log('Local workflow result:', result);
    
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.workflowId).toBe('local-workflow');
    expect(result.result.status).toBe('completed');
    expect(result.result.processed).toBe(true);
    expect(result.result.message).toContain('Local step processed: local-test-input');
  });
});
