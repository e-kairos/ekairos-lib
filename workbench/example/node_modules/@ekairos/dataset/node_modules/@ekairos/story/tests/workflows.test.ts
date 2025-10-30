import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../src/steps/index.ts', async () => {
  const actual = await vi.importActual<typeof import('../src/steps/index.ts')>('../src/steps/index.ts')
  return {
    ...actual,
  }
})

let Workflows: typeof import('../src/workflows/index.js')
let Steps: typeof import('../src/steps/index.js')
let storyEngine: typeof import('../src/storyEngine.js')

beforeEach(async () => {
  vi.resetModules()

  vi.doMock('../src/steps-context', () => ({
    ensureContextStep: vi.fn().mockResolvedValue({ contextId: 'test-context' }),
    buildSystemPromptStep: vi.fn().mockResolvedValue('prompt'),
  }))

  vi.doMock('../src/steps/ai', () => ({
    runReasoningOnceStep: vi.fn().mockResolvedValue({
      toolCalls: [
        { toolCallId: 'call-1', toolName: 'test.processMessage', args: { message: 'hello' } },
        { toolCallId: 'call-2', toolName: 'log-start', args: {} },
      ],
    }),
  }))

  Workflows = await import('../src/workflows/index.ts')
  Steps = await import('../src/steps/index.ts')
  storyEngine = await import('../src/storyEngine.ts')
})

afterEach(() => {
  const engineState = (globalThis as any).PULZAR_STORY_ENGINE
  if (engineState?.stories?.clear) {
    engineState.stories.clear()
  }
  const registry = (globalThis as any).PULZAR_STEP_REGISTRY
  if (registry?.clear) {
    registry.clear()
  }
})

describe('Story workflows integration', () => {
  test('runWorkbenchTestStory registers the workflow in engine', async () => {
    const result = await Workflows.runWorkbenchTestStory({ context: { source: 'test' } })

    expect(result).toHaveProperty('success', true)

    const registered = storyEngine.engine.get('workbench:test-story')
    expect(registered).toBeTruthy()
  })

  test('Steps registry provides custom step implementations', () => {
    const steps = Steps.listRegisteredSteps()
    expect(steps).toContain('log-start')
    expect(steps).toContain('test.processMessage')
  })
})
