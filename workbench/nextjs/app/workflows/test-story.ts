import { Workflows } from '@ekairos/story'

export async function testStoryWorkflow() {
  'use workflow'

  return Workflows.runModuleSmokeWorkflow({ value: 'module-test' })
}
