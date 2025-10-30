import type { InstaQLEntity } from "@instantdb/admin";
import { storyDomain } from "./schema";
export type StoredContext<Context> = Omit<InstaQLEntity<typeof storyDomain, 'story_contexts'>, 'content'> & {
    content: Context;
};
export type ContextIdentifier = {
    id: string;
    key?: never;
} | {
    key: string;
    id?: never;
};
export type ContextEvent = InstaQLEntity<typeof storyDomain, 'story_events'> & {
    content: any;
};
export type StreamChunk = {
    type: string;
    messageId?: string;
    content?: string;
    [key: string]: unknown;
};
export declare class AgentService {
    private instant;
    private db;
    private idFn;
    private lookupFn;
    constructor();
    getOrCreateContext<C>(contextIdentifier: ContextIdentifier | null): Promise<StoredContext<C>>;
    createContext<C>(contextKey?: {
        key: string;
    } | null, contextId?: string): Promise<StoredContext<C>>;
    getContext<C>(contextIdentifier: ContextIdentifier): Promise<StoredContext<C>>;
    updateContextContent<C>(contextIdentifier: ContextIdentifier, content: C): Promise<StoredContext<C>>;
    saveEvent(contextIdentifier: ContextIdentifier, event: ContextEvent): Promise<ContextEvent>;
    createExecution(contextIdentifier: ContextIdentifier, triggerEventId: string, reactionEventId: string): Promise<{
        id: string;
    }>;
    completeExecution(contextIdentifier: ContextIdentifier, executionId: string, status: "completed" | "failed"): Promise<void>;
    updateEvent(eventId: string, event: ContextEvent): Promise<ContextEvent>;
    getEvent(eventId: string): Promise<ContextEvent>;
    getEvents(contextIdentifier: ContextIdentifier): Promise<ContextEvent[]>;
    readEventStream(stream: ReadableStream): Promise<{
        eventId: string | undefined;
        chunks: StreamChunk[];
        persistedEvent: any;
    }>;
}
//# sourceMappingURL=service.d.ts.map