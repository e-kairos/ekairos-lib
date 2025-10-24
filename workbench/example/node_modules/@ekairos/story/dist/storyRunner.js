"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storyRunner = storyRunner;
const storyEngine_1 = require("./storyEngine");
const steps_context_1 = require("./steps-context");
const ai_1 = require("./steps/ai");
const base_1 = require("./steps/base");
async function storyRunner(serialized, args) {
    "use workflow";
    const maxLoops = 10;
    const { contextId } = await (0, steps_context_1.ensureContextStep)({ key: serialized.key, context: args?.context ?? null });
    let loopCount = 0;
    while (loopCount < maxLoops) {
        loopCount++;
        const systemPrompt = await (0, steps_context_1.buildSystemPromptStep)({
            contextId,
            narrative: serialized.narrative,
        });
        const { toolCalls } = await (0, ai_1.runReasoningOnceStep)({
            contextId,
            systemPrompt,
            actions: serialized.actions.map((a) => ({
                name: a.name,
                description: a.description,
                implementationKey: a.implementationKey || a.name,
                inputSchema: a.inputSchema,
                finalize: a.finalize,
            })),
            options: { reasoningEffort: "medium" },
        });
        if (!toolCalls || toolCalls.length === 0) {
            break;
        }
        const rt = storyEngine_1.engine.get(serialized.key);
        if (!rt)
            throw new Error(`Story runtime not found for key=${serialized.key}`);
        const executions = await Promise.all(toolCalls.map(async (tc) => {
            const implKey = tc.toolName;
            const action = rt.actions[implKey];
            if (action && typeof action.execute === "function") {
                // Ejecutar en el runtime local (no serializable) dentro de un step wrapper
                return await (0, base_1.executeRegisteredStep)({ implementationKey: implKey, contextId, args: tc.args });
            }
            // fallback: ejecutar step registrado directo si existe
            return await (0, base_1.executeRegisteredStep)({ implementationKey: implKey, contextId, args: tc.args });
        }));
        const shouldEnd = executions.some((_r, i) => {
            const a = serialized.actions.find((x) => (x.implementationKey || x.name) === toolCalls[i].toolName);
            return Boolean(a?.finalize);
        });
        if (shouldEnd)
            break;
    }
    return { success: true, contextId };
}
//# sourceMappingURL=storyRunner.js.map