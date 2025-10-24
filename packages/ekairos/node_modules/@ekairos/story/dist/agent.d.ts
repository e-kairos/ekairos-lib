import { Tool, UIMessageStreamWriter } from "ai";
import { UIMessage } from 'ai';
import { AgentService, ContextEvent, ContextIdentifier, StoredContext } from "./service";
export type AgentMessage = UIMessage<never, // metadata type
{
    weather: {
        city: string;
        weather?: string;
        status: 'loading' | 'success';
    };
    notification: {
        message: string;
        level: 'info' | 'warning' | 'error';
    };
}>;
export interface AgentOptions {
    onEventCreated?: (event: any) => void | Promise<void>;
    evaluateToolCalls?: (toolCalls: any[]) => Promise<{
        success: boolean;
        message?: string;
    }>;
    onToolCallExecuted?: (executionEvent: any) => void | Promise<void>;
    onEnd?: (lastEvent: ContextEvent) => void | {
        end?: boolean;
    } | Promise<void | {
        end?: boolean;
    }>;
}
export interface ProgressStreamOptions {
    reasoningEffort?: "low" | "medium" | "high";
    webSearch?: boolean;
}
export type DataStreamWriter = UIMessageStreamWriter<AgentMessage>;
export declare abstract class Story<Context> {
    private opts;
    protected db: import("@instantdb/admin").InstantAdminDatabase<import("@instantdb/admin").InstantUnknownSchemaDef, import("@instantdb/admin").InstantConfig<import("@instantdb/admin").InstantUnknownSchemaDef, false>>;
    protected agentService: AgentService;
    constructor(opts?: AgentOptions);
    protected abstract buildSystemPrompt(context: StoredContext<Context>, ...args: any[]): Promise<string> | string;
    protected abstract buildTools(context: StoredContext<Context>, dataStream: DataStreamWriter): Promise<Record<string, Tool>>;
    protected abstract initialize(context: StoredContext<Context>): Promise<Context>;
    protected getModel(context: StoredContext<Context>): string;
    protected includeBaseTools(): {
        createMessage: boolean;
        requestDirection: boolean;
        end: boolean;
    };
    protected getFinalizationToolNames(): Promise<string[]>;
    private static readonly FINAL_TOOL_NAMES;
    protected getBaseTools(dataStream: DataStreamWriter, threadId: string): Record<string, Tool>;
    protected executeCreateMessage(eventId: string, args: {
        message: string;
        type: "info" | "confirmation" | "warning" | "error" | "success";
        includeContext?: boolean;
    }, threadId: string, dataStream?: DataStreamWriter): Promise<any>;
    protected executeRequestDirection(eventId: string, args: {
        issue: string;
        context: string;
        suggestedActions?: string[];
        urgency: "low" | "medium" | "high";
    }, threadId: string, _dataStream?: DataStreamWriter): Promise<any>;
    progressStream(incomingEvent: ContextEvent, contextIdentifier: ContextIdentifier | null, options?: ProgressStreamOptions): Promise<{
        contextId: string;
        triggerEventId: string;
        reactionEventId: string;
        stream: import("stream/web").ReadableStream<any>;
        executionId: string;
    }>;
    private saveMessagesToThread;
    private callOnEnd;
}
export { Story as Agent };
//# sourceMappingURL=agent.d.ts.map