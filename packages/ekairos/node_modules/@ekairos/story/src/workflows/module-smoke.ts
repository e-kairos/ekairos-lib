//import { moduleEchoStep } from '../steps/module-smoke'

const WORKFLOW_KEY = 'module:smoke'

export async function runModuleSmokeWorkflow(input: { value: string }) {
  'use workflow'


  //const result = await moduleEchoStep(input.value)


  const result = {
    input: input.value,
    test: "233323",
    upper: input.value.toUpperCase(),
    timestamp: Date.now(),
  };
  return {
    ok: true,
    workflow: WORKFLOW_KEY,
    echo: result.input,
    upper: result.upper,
    test: result.test,
    timestamp: result.timestamp,
  }
}
