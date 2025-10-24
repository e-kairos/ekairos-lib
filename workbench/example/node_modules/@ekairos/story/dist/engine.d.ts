export declare function evaluateToolCallsStep(params: {
    storyKey: string;
    toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: any;
    }>;
    contextId: string;
}): Promise<{
    success: boolean;
    message?: string;
} | {
    success: boolean;
    message: any;
}>;
export declare function onEndStep(params: {
    storyKey: string;
    lastEvent: any;
}): Promise<{
    end: boolean;
}>;
//# sourceMappingURL=engine.d.ts.map