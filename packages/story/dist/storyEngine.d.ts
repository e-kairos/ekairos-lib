import { StoryActionSpec } from "./story";
export type StoryRuntimeAction = {
    name: string;
    implementationKey: string;
    execute: (args: any & {
        contextId?: string;
    }) => Promise<any>;
};
export type StoryRuntimeCallbacks = {
    onToolCallExecuted?: (executionEvent: {
        toolCall: {
            toolCallId: string;
            toolName: string;
            args: any;
        };
        success: boolean;
        message?: string;
        result?: any;
        contextId: string;
    }) => void | Promise<void>;
    evaluateToolCalls?: (toolCalls: any[]) => Promise<{
        success: boolean;
        message?: string;
    }>;
    onEnd?: (lastEvent: any) => void | {
        end?: boolean;
    } | Promise<void | {
        end?: boolean;
    }>;
};
export type StoryRuntime = {
    key: string;
    narrative: string;
    actions: Record<string, StoryRuntimeAction>;
    callbacks?: StoryRuntimeCallbacks;
};
export type StoryDescriptor = {
    key: string;
    narrative: string;
    actions: Array<Pick<StoryActionSpec, "name" | "description" | "inputSchema" | "finalize" | "implementationKey">>;
    options?: any;
};
export declare const engine: {
    register(story: {
        key: string;
        narrative: string;
        actions: StoryActionSpec[];
        callbacks?: StoryRuntimeCallbacks;
        options?: any;
    }): {
        story: (key: string) => StoryDescriptor;
    };
    get(key: string): StoryRuntime | undefined;
};
//# sourceMappingURL=storyEngine.d.ts.map