import { start } from 'workflow/api';
import { Workflows } from '@ekairos/story';

export async function POST(request: Request) {
  try {
    console.log('[API] Received story test request');

    const body = await request.json();
    const message = body.message || 'test message';

    const run = await start(Workflows.runTestStory, ["1234story"]);

    console.log('[API] Story started, runId:', run.runId);

    // Wait for completion (for testing)
    const result = await run.returnValue;

    console.log('[API] Story completed with result:', result);

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

export async function GET() {
  return Response.json({
    message: 'Ekairos Story Test Endpoint',
    usage: 'POST with { "message": "your message here" }',
  });
}

