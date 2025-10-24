"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateToolCallsStep = evaluateToolCallsStep;
exports.onEndStep = onEndStep;
const storyEngine_1 = require("./storyEngine");
async function evaluateToolCallsStep(params) {
    "use step";
    try {
        const rt = storyEngine_1.engine.get(params.storyKey);
        if (!rt?.callbacks?.evaluateToolCalls)
            return { success: true };
        return await rt.callbacks.evaluateToolCalls(params.toolCalls);
    }
    catch (error) {
        return { success: false, message: error?.message ?? String(error) };
    }
}
async function onEndStep(params) {
    "use step";
    try {
        const rt = storyEngine_1.engine.get(params.storyKey);
        if (!rt?.callbacks?.onEnd)
            return { end: true };
        const result = await rt.callbacks.onEnd(params.lastEvent);
        if (typeof result === "boolean")
            return { end: result };
        if (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "end")) {
            return { end: Boolean(result.end) };
        }
        return { end: true };
    }
    catch {
        return { end: true };
    }
}
//# sourceMappingURL=engine.js.map