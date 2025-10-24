"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.story = story;
// Steps (se resuelven en tiempo de ejecución del step, no en workflow)
// Se importan como referencias; su lógica corre con "use step" dentro de cada función.
const steps_context_1 = require("./steps-context");
const ai_1 = require("./steps/ai");
const base_1 = require("./steps/base");
// story(): genera una función workflow que orquesta los steps de manera durable
function story(key, config) {
    // Retorna una función que orquesta la iteración del workflow (sin directiva)
    return async function runStory(args) {
        const maxLoops = config.options?.maxLoops ?? 10;
        const { contextId } = await (0, steps_context_1.ensureContextStep)({ key, context: args?.context ?? null });
        let loopCount = 0;
        while (loopCount < maxLoops) {
            loopCount++;
            const systemPrompt = await (0, steps_context_1.buildSystemPromptStep)({
                contextId,
                narrative: config.narrative,
            });
            const { toolCalls } = await (0, ai_1.runReasoningOnceStep)({
                contextId,
                systemPrompt,
                actions: config.actions,
                options: config.options ?? {},
            });
            if (!toolCalls || toolCalls.length === 0) {
                break;
            }
            const executions = await Promise.all(toolCalls.map(async (tc) => {
                const action = config.actions.find((a) => a.name === tc.toolName);
                const implementationKey = (action?.implementationKey || tc.toolName);
                const result = await (0, base_1.executeRegisteredStep)({
                    implementationKey,
                    contextId,
                    args: tc.args,
                });
                return { tc, action, result };
            }));
            const shouldEnd = executions.some(({ action }) => {
                const isFinalByAction = Boolean(action?.finalize);
                const isFinalByOptions = action && Array.isArray(config.options?.finalActions)
                    ? (config.options.finalActions).includes(action.name)
                    : false;
                return isFinalByAction || isFinalByOptions;
            });
            if (shouldEnd) {
                break;
            }
        }
        return { contextId, status: "completed" };
    };
}
//# sourceMappingURL=story.js.map