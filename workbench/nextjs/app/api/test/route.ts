import { start } from 'workflow/api';
import { Workflows } from '@ekairos/story';

export async function POST(request: Request) {
  try {
    console.log('[API] Received workflow start request');

    const run = await start(Workflows.runModuleSmokeWorkflow, [{ value: 'module-test' }]);

    console.log('[API] Workflow started, runId:', run.runId);

    // Wait for completion (for testing)
    const result = await run.returnValue;

    console.log('[API] Workflow completed with result:', result);

    return Response.json({
      success: true,
      runId: run.runId,
      result
    });
  } catch (error: any) {
    console.error('[API] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
