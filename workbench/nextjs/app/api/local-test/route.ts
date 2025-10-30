import { start } from 'workflow/api';
import { localWorkflow } from '../../workflows/local-workflow';

export async function POST(request: Request) {
  try {
    console.log('[API] Received local test request');
    
    const body = await request.json();
    const input = body.input || 'test-input';
    
    console.log('[API] Local workflow started, input:', input);
    
    const run = await start(localWorkflow, [input]);
    
    console.log('[API] Local workflow runId:', run.runId);
    
    // Wait for completion (for testing)
    const result = await run.returnValue;
    
    console.log('[API] Local workflow completed with result:', result);
    
    return Response.json({
      success: true,
      runId: run.runId,
      result
    });
  } catch (error: any) {
    console.error('[API] Local workflow error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
