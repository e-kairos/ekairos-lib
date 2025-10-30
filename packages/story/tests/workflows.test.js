"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('../src/steps/index.ts', async () => {
    const actual = await vitest_1.vi.importActual('../src/steps/index.ts');
    return {
        ...actual,
    };
});
let Workflows;
let Steps;
let storyEngine;
(0, vitest_1.beforeEach)(async () => {
    vitest_1.vi.resetModules();
    vitest_1.vi.doMock('../src/steps-context', () => ({
        ensureContextStep: vitest_1.vi.fn().mockResolvedValue({ contextId: 'test-context' }),
        buildSystemPromptStep: vitest_1.vi.fn().mockResolvedValue('prompt'),
    }));
    vitest_1.vi.doMock('../src/steps/ai', () => ({
        runReasoningOnceStep: vitest_1.vi.fn().mockResolvedValue({
            toolCalls: [
                { toolCallId: 'call-1', toolName: 'test.processMessage', args: { message: 'hello' } },
                { toolCallId: 'call-2', toolName: 'log-start', args: {} },
            ],
        }),
    }));
    Workflows = await Promise.resolve().then(() => __importStar(require('../src/workflows/index.ts')));
    Steps = await Promise.resolve().then(() => __importStar(require('../src/steps/index.ts')));
    storyEngine = await Promise.resolve().then(() => __importStar(require('../src/storyEngine.ts')));
});
(0, vitest_1.afterEach)(() => {
    const engineState = globalThis.PULZAR_STORY_ENGINE;
    if (engineState?.stories?.clear) {
        engineState.stories.clear();
    }
    const registry = globalThis.PULZAR_STEP_REGISTRY;
    if (registry?.clear) {
        registry.clear();
    }
});
(0, vitest_1.describe)('Story workflows integration', () => {
    (0, vitest_1.test)('runWorkbenchTestStory registers the workflow in engine', async () => {
        const result = await Workflows.runWorkbenchTestStory({ context: { source: 'test' } });
        (0, vitest_1.expect)(result).toHaveProperty('success', true);
        const registered = storyEngine.engine.get('workbench:test-story');
        (0, vitest_1.expect)(registered).toBeTruthy();
    });
    (0, vitest_1.test)('Steps registry provides custom step implementations', () => {
        const steps = Steps.listRegisteredSteps();
        (0, vitest_1.expect)(steps).toContain('log-start');
        (0, vitest_1.expect)(steps).toContain('test.processMessage');
    });
});
//# sourceMappingURL=workflows.test.js.map