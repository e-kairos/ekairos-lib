
import { testStory } from './test-story-step';

export async function runTestStory(storyId: string) {
  'use workflow'
  const result = await testStory(storyId)
  return {
    contextId: `story-${storyId}`,
    status: 'completed',
    ...result
  }
}

