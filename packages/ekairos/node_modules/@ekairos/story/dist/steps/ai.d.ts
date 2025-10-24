type PrimitiveType = "string" | "number" | "boolean" | "object" | "array";
type FieldSchema = {
    type: PrimitiveType;
    description?: string;
    required?: boolean;
    properties?: Record<string, FieldSchema>;
    items?: FieldSchema;
};
type StepInputSchema = {
    type: "object";
    description?: string;
    properties?: Record<string, FieldSchema>;
};
type StoryActionSpec = {
    name: string;
    description: string;
    implementationKey: string;
    inputSchema?: StepInputSchema;
    finalize?: boolean;
};
type StoryOptions = {
    reasoningEffort?: "low" | "medium" | "high";
    webSearch?: boolean;
    includeBaseTools?: {
        createMessage?: boolean;
        requestDirection?: boolean;
        end?: boolean;
    };
};
export declare function runReasoningOnceStep(params: {
    contextId: string;
    systemPrompt: string;
    actions: StoryActionSpec[];
    options: StoryOptions;
}): Promise<{
    toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: any;
    }>;
}>;
export {};
//# sourceMappingURL=ai.d.ts.map