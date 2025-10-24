"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRegisteredStep = executeRegisteredStep;
const registry_1 = require("./registry");
async function executeRegisteredStep(params) {
    "use step";
    // 1) Intentar step registrado explícito
    const step = (0, registry_1.getRegisteredStep)(params.implementationKey);
    if (step) {
        try {
            const result = await step({ contextId: params.contextId, ...(params.args ?? {}) });
            return { success: true, result };
        }
        catch (error) {
            return { success: false, message: error?.message ?? String(error) };
        }
    }
    // 2) Intentar acción runtime desde storyEngine (no serializable)
    // Buscamos una story que tenga esta implementación (acceso directo al símbolo global)
    try {
        const stories = globalThis[Symbol.for("PULZAR_STORY_ENGINE")]?.stories;
        if (stories) {
            for (const [, rt] of stories) {
                const action = rt.actions?.[params.implementationKey];
                if (action && typeof action.execute === "function") {
                    const result = await action.execute({ contextId: params.contextId, ...(params.args ?? {}) });
                    return { success: true, result };
                }
            }
        }
    }
    catch (error) {
        return { success: false, message: error?.message ?? String(error) };
    }
    return { success: false, message: `Step not found: ${params.implementationKey}` };
}
//# sourceMappingURL=base.js.map