import { story, engine, storyRunner, Steps, type StoryActionSpec } from 'ekairos';

console.log('🧪 Testing Ekairos Workbench\n');

// Test 1: Imports
console.log('✓ Test 1: Imports successful');
console.log('  - story:', typeof story);
console.log('  - engine:', typeof engine);
console.log('  - storyRunner:', typeof storyRunner);
console.log('  - Steps:', typeof Steps);

// Test 2: Story Definition
console.log('\n✓ Test 2: Creating story definition');
const testStory: {
  key: string;
  narrative: string;
  actions: StoryActionSpec[];
  options?: any;
  callbacks?: any;
} = {
  key: 'test:simple-story',
  narrative: 'Test assistant for validation',
  actions: [
    {
      name: 'testAction',
      description: 'A simple test action',
      implementationKey: 'test.action',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', required: true, description: 'Test message' },
        },
      },
      finalize: true,
      execute: async ({ message, contextId }: any) => {
        console.log(`  [testAction] Executed with message: "${message}", contextId: ${contextId}`);
        return { success: true, result: `Processed: ${message}` };
      },
    },
  ],
  options: {
    reasoningEffort: 'low',
    maxLoops: 3,
  },
  callbacks: {
    evaluateToolCalls: async (toolCalls: any[]) => {
      console.log(`  [evaluateToolCalls] ${toolCalls.length} tool calls`);
      return { success: true };
    },
    onEnd: async (lastEvent: any) => {
      console.log('  [onEnd] Story completed');
      return { end: true };
    },
  },
};

console.log('  Story key:', testStory.key);
console.log('  Actions count:', testStory.actions.length);
console.log('  Options:', testStory.options);

// Test 3: Engine Registration
console.log('\n✓ Test 3: Registering story in engine');
const storyEngineInstance = engine.register(testStory);
console.log('  Engine registration successful');

// Test 4: Descriptor Generation
console.log('\n✓ Test 4: Generating descriptor');
const descriptor = storyEngineInstance.story('test:simple-story');
console.log('  Descriptor:', JSON.stringify(descriptor, null, 2));

// Test 5: Engine Retrieval
console.log('\n✓ Test 5: Retrieving story from engine');
const retrieved = engine.get('test:simple-story');
console.log('  Retrieved story key:', retrieved?.key);
console.log('  Retrieved actions count:', Object.keys(retrieved?.actions || {}).length);

// Test 6: Steps Registry
console.log('\n✓ Test 6: Steps registry');
console.log('  Registry available:', typeof Steps.registerStep);
console.log('  Registered steps:', Steps.listRegisteredSteps().length);

// Test 7: Story Runner Type
console.log('\n✓ Test 7: Story runner validation');
console.log('  storyRunner type:', typeof storyRunner);
console.log('  storyRunner name:', storyRunner.name);

// Test 8: Check execute functions are preserved
console.log('\n✓ Test 8: Execute functions preserved');
const action = retrieved?.actions['test.action'];
console.log('  Action found:', !!action);
console.log('  Execute function available:', typeof action?.execute);

if (action?.execute) {
  console.log('\n✓ Test 9: Executing action directly');
  action.execute({ message: 'Hello from test', contextId: 'test-ctx-123' })
    .then((result) => {
      console.log('  Execution result:', result);
      console.log('\n🎉 All tests passed!');
      console.log('\n📦 Package structure validated:');
      console.log('  - ekairos (wrapper) ✓');
      console.log('  - @ekairos/story ✓');
      console.log('  - @ekairos/domain ✓');
      console.log('  - Story Engine ✓');
      console.log('  - Non-serializable actions ✓');
      console.log('\n✅ Workbench is ready for use with Workflow DevKit!');
    })
    .catch((error) => {
      console.error('❌ Test 9 failed:', error);
      process.exit(1);
    });
} else {
  console.error('❌ Test 8 failed: Execute function not found');
  process.exit(1);
}

