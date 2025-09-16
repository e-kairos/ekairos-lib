import { id, init, lookup, InstantAdminDatabase } from "@instantdb/admin";
import type { agentDomain } from "./schema";
import { SchemaOf } from "../domain";

const dbDefault = init({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
    adminToken: process.env.INSTANT_APP_ADMIN_TOKEN as string,
});

export type StoredContext<Context> = {
    id: string;
    createdAt: string | number;
    updatedAt?: string | number;
    type?: string;
    key?: string | null;
    content: Context;
}

export type ContextEvent = {
    id: string;
    channel: string;
    createdAt: string | number;
    type?: string;
    content: any;
    status?: string;
}

export type ContextIdentifier = { id: string } | { key: string };

type AgentSchemaType = SchemaOf<typeof agentDomain>;

export class AgentService {

    private readonly db: InstantAdminDatabase<AgentSchemaType>;

    constructor(db: InstantAdminDatabase<AgentSchemaType>) {
        this.db = db
    }

    public async getOrCreateContext<C>(contextIdentifier: { id: string } | { key: string } | null): Promise<StoredContext<C>> {
        if (!contextIdentifier) {
            return this.createContext<C>()
        }

        let context = await this.getContext<C>(contextIdentifier)
        if (!context) {
            return this.createContext<C>(("key" in contextIdentifier) ? { key: contextIdentifier.key } : null)
        } else {
            return context
        }
    }

    public async createContext<C>(contextKey?: { key: string } | null): Promise<StoredContext<C>> {
        let contextData: { createdAt: Date; content: Record<string, unknown>; key: string | null } = {
            createdAt: new Date(),
            content: {},
            key: null
        }

        const contextId = id()
        if (contextKey?.key) {
            contextData = {
                ...contextData,
                key: contextKey.key
            }
        }

        await this.db.transact([
            this.db.tx.agent_contexts[contextId].create({
                createdAt: contextData.createdAt.toISOString(),
                content: contextData.content,
                key: contextData.key,
            })
        ])
        return this.getContext<C>({ id: contextId })
    }

    public async getContext<C>(contextIdentifier: { id: string } | { key: string }): Promise<StoredContext<C>> {
        let context;
        try {
            if ("id" in contextIdentifier) {
                const tRes = await this.db.query({
                    agent_contexts: {
                        $: { where: { id: contextIdentifier.id }, limit: 1 }
                    }
                })
                context = (tRes as any).agent_contexts?.[0]
            }

            if ("key" in contextIdentifier) {
                const tRes = await this.db.query({
                    agent_contexts: {
                        $: { where: { key: contextIdentifier.key } }
                    }
                })
                context = (tRes as any).agent_contexts?.[0]
            }

            return context as StoredContext<C>
        } catch (error: unknown) {
            console.error("Error getting context", error)
            throw new Error("Error getting context")
        }
    }

    public async updateContextContent<C>(contextIdentifier: { id: string } | { key: string }, content: C): Promise<StoredContext<C>> {

        const contextDBIdentifier = ("id" in contextIdentifier) ? contextIdentifier.id : (lookup("key", contextIdentifier.key) as any)

        await this.db.transact([
            this.db.tx.agent_contexts[contextDBIdentifier].update({
                content: content,
                updatedAt: new Date()
            })
        ])

        return this.getContext<C>(contextIdentifier)
    }

    public async saveEvent(contextIdentifier: { id: string } | { key: string }, event: ContextEvent): Promise<ContextEvent> {
        const txs = [
            this.db.tx.agent_events[event.id].create({
                createdAt: typeof event.createdAt === 'string' || typeof event.createdAt === 'number' ? event.createdAt : new Date().toISOString(),
                channel: event.channel,
                type: event.type,
                content: event.content,
                status: "stored",
            })
        ]

        if ("id" in contextIdentifier) {
            txs.push(this.db.tx.agent_events[event.id].link({ context: contextIdentifier.id }))
        } else {
            txs.push(this.db.tx.agent_events[event.id].link({ context: lookup("key", contextIdentifier.key) }))
        }

        await this.db.transact(txs)

        return await this.getEvent(event.id)
    }

    public async updateEvent(eventId: string, event: ContextEvent): Promise<ContextEvent> {
        await this.db.transact([
            this.db.tx.agent_events[eventId].update(event)
        ])
        return await this.getEvent(eventId)
    }

    public async getEvent(eventId: string): Promise<ContextEvent> {
        const event = await this.db.query({
            agent_events: {
                $: { where: { id: eventId } }
            }
        })
        return event.agent_events?.[0] as ContextEvent
    }

    public async getEvents(contextIdentifier: { id: string } | { key: string }): Promise<ContextEvent[]> {

        let contextWhere: { context: string };
        if ("id" in contextIdentifier) {
            contextWhere = { context: contextIdentifier.id }
        } else {
            contextWhere = { context: lookup("key", contextIdentifier.key) }
        }

        const events = await this.db.query({
            agent_events: {
                $: {
                    where: contextWhere as any,
                    limit: 30,
                    order: {
                        createdAt: 'desc',
                    },
                }
            }
        })
        return events.agent_events as ContextEvent[]
    }
}