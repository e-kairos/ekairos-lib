"use strict";
// Registro simple de steps por clave de implementación
// Cada step debe ser una función que internamente use "use step"
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStep = registerStep;
exports.getRegisteredStep = getRegisteredStep;
exports.listRegisteredSteps = listRegisteredSteps;
const GLOBAL_STEP_REGISTRY_SYMBOL = Symbol.for("PULZAR_STEP_REGISTRY");
function getRegistry() {
    const g = globalThis;
    if (!g[GLOBAL_STEP_REGISTRY_SYMBOL]) {
        g[GLOBAL_STEP_REGISTRY_SYMBOL] = new Map();
    }
    return g[GLOBAL_STEP_REGISTRY_SYMBOL];
}
function registerStep(key, fn) {
    if (!key || typeof key !== "string")
        throw new Error("registerStep: key inválida");
    if (typeof fn !== "function")
        throw new Error("registerStep: fn inválida");
    getRegistry().set(key, fn);
}
function getRegisteredStep(key) {
    return getRegistry().get(key);
}
function listRegisteredSteps() {
    return Array.from(getRegistry().keys());
}
//# sourceMappingURL=registry.js.map