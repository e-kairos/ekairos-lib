import { localStep } from './local-step';

export async function localWorkflow(input: string) {
  'use workflow'
  
  const result = await localStep(input);
  
  return {
    workflowId: 'local-workflow',
    status: 'completed',
    ...result
  }
}
