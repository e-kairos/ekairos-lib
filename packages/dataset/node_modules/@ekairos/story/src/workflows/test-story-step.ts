export async function testStory(storyId: string) {
  'use step'
  return {
    test: `Hello step, ${storyId}!`,
  }
}
