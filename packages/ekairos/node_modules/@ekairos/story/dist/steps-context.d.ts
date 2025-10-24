import { ContextIdentifier } from "./service";
export declare function ensureContextStep(params: {
    key: string;
    context: ContextIdentifier | null;
}): Promise<{
    contextId: string;
}>;
export declare function buildSystemPromptStep(params: {
    contextId: string;
    narrative: string;
}): Promise<string>;
//# sourceMappingURL=steps-context.d.ts.map