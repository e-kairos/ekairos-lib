"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.engine = void 0;
const GLOBAL_STORY_ENGINE_SYMBOL = Symbol.for("PULZAR_STORY_ENGINE");
function getGlobalEngine() {
    const g = globalThis;
    if (!g[GLOBAL_STORY_ENGINE_SYMBOL]) {
        g[GLOBAL_STORY_ENGINE_SYMBOL] = { stories: new Map() };
    }
    return g[GLOBAL_STORY_ENGINE_SYMBOL];
}
exports.engine = {
    register(story) {
        const runtimeActions = {};
        for (const a of story.actions) {
            if (typeof a.execute === "function") {
                runtimeActions[a.implementationKey || a.name] = {
                    name: a.name,
                    implementationKey: a.implementationKey || a.name,
                    execute: (a.execute),
                };
            }
        }
        const runtime = {
            key: story.key,
            narrative: story.narrative,
            actions: runtimeActions,
            callbacks: story.callbacks,
        };
        getGlobalEngine().stories.set(story.key, runtime);
        return {
            story: (key) => {
                const rt = getGlobalEngine().stories.get(key);
                if (!rt)
                    throw new Error(`Story not registered: ${key}`);
                const actions = story.actions.map((a) => ({
                    name: a.name,
                    description: a.description,
                    inputSchema: a.inputSchema,
                    finalize: a.finalize,
                    implementationKey: a.implementationKey,
                }));
                return { key: story.key, narrative: story.narrative, actions, options: story.options };
            }
        };
    },
    get(key) {
        return getGlobalEngine().stories.get(key);
    }
};
//# sourceMappingURL=storyEngine.js.map