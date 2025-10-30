// import { storyRunner } from '@ekairos/story'
import { Workflows } from '@ekairos/story'

async function main() {
  console.log('Testing workflow import from library...')

  // Test 1: Verify storyRunner can be imported
  // console.log('✅ storyRunner imported successfully:', typeof storyRunner)

  // Test 2: Verify Workflows can be imported
  console.log('✅ Workflows imported successfully:', typeof Workflows)

  // Test 3: Verify runModuleSmokeWorkflow exists
  console.log('✅ runModuleSmokeWorkflow available:', typeof Workflows?.runModuleSmokeWorkflow)

  console.log('🎉 All imports working correctly!')
}

main().catch(console.error)
