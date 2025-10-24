import type { ContextIdentifier } from "./service";
export type PrimitiveType = "string" | "number" | "boolean" | "object" | "array";
export type FieldSchema = {
    type: PrimitiveType;
    description?: string;
    required?: boolean;
    properties?: Record<string, FieldSchema>;
    items?: FieldSchema;
};
export type StepInputSchema = {
    type: "object";
    description?: string;
    properties?: Record<string, FieldSchema>;
};
export type StoryActionSpec = {
    name: string;
    description: string;
    implementationKey: string;
    inputSchema?: StepInputSchema;
    finalize?: boolean;
    execute?: (args: any & {
        contextId?: string;
    }) => Promise<any>;
};
export type StoryOptions = {
    reasoningEffort?: "low" | "medium" | "high";
    webSearch?: boolean;
    maxLoops?: number;
    finalActions?: string[];
    includeBaseTools?: {
        createMessage?: boolean;
        requestDirection?: boolean;
        end?: boolean;
    };
};
export type StoryConfig = {
    narrative: string;
    actions: StoryActionSpec[];
    options?: StoryOptions;
};
export type StoryStartArgs = {
    context?: ContextIdentifier | null;
    trigger?: any | null;
};
export declare function story(key: string, config: StoryConfig): (args?: StoryStartArgs) => Promise<{
    contextId: string;
    status: "completed";
}>;
export type { StoryActionSpec as StoryAction, StoryOptions as StoryConfigOptions };
//# sourceMappingURL=story.d.ts.map