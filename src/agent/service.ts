import { id, init, InstaQLEntity, lookup } from "@instantdb/admin"
import schema from "@instant.schema"

const db = init({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
    adminToken: process.env.INSTANT_APP_ADMIN_TOKEN as string, schema
})


export type StoredContext<Context> = Omit<InstaQLEntity<typeof schema, 'agent_contexts'>, 'content'> & { content: Context }
export type ContextIdentifier = { id: string; key?: never } | { key: string; id?: never }

export type ContextEvent = InstaQLEntity<typeof schema, 'agent_events'> & { content: any }

export class AgentService {
    public async getOrCreateContext<C>(contextIdentifier: ContextIdentifier | null): Promise<StoredContext<C>> {
        if (!contextIdentifier) {
            return this.createContext<C>()
        }

        let context = await this.getContext<C>(contextIdentifier)
        if (!context) {
            return this.createContext<C>(contextIdentifier.key ? { key: contextIdentifier.key } : null)
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

        await db.transact([
            db.tx.agent_contexts[contextId].create(contextData)
        ])
        return this.getContext<C>({ id: contextId })
    }

    public async getContext<C>(contextIdentifier: ContextIdentifier): Promise<StoredContext<C>> {
        let context;
        try {
            if (contextIdentifier.id) {
                const tRes = await db.query({
                    agent_contexts: {
                        $: { where: { id: contextIdentifier.id }, limit: 1 }
                    }
                })
                context = tRes.agent_contexts?.[0]
            }

            if (contextIdentifier.key) {
                const tRes = await db.query({
                    agent_contexts: {
                        $: { where: { key: contextIdentifier.key } }
                    }
                })
                context = tRes.agent_contexts?.[0]
            }

            return context as StoredContext<C>
        } catch (error: any) {
            console.error("Error getting context", error)
            throw new Error("Error getting context", { cause: error })
        }
    }

    public async updateContextContent<C>(contextIdentifier: ContextIdentifier, content: C): Promise<StoredContext<C>> {

        const contextDBIdentifier = contextIdentifier.id ?? lookup("key", contextIdentifier.key)

        await db.transact([
            db.tx.agent_contexts[contextDBIdentifier].update({
                content: content,
                updatedAt: new Date()
            })
        ])

        return this.getContext<C>(contextIdentifier)
    }

    public async saveEvent(contextIdentifier: ContextIdentifier, event: ContextEvent): Promise<ContextEvent> {
        const txs = [
            db.tx.agent_events[event.id].create({
                ...event,
                status: "stored"
            })
        ]

        if (contextIdentifier.id) {
            txs.push(db.tx.agent_events[event.id].link({ context: contextIdentifier.id }))
        } else {
            txs.push(db.tx.agent_events[event.id].link({ context: lookup("key", contextIdentifier.key) }))
        }

        await db.transact(txs)

        return await this.getEvent(event.id)
    }

    public async updateEvent(eventId: string, event: ContextEvent): Promise<ContextEvent> {
        await db.transact([
            db.tx.agent_events[eventId].update(event)
        ])
        return await this.getEvent(eventId)
    }

    public async getEvent(eventId: string): Promise<ContextEvent> {
        const event = await db.query({
            agent_events: {
                $: { where: { id: eventId } }
            }
        })
        return event.agent_events?.[0] as ContextEvent
    }

    public async getEvents(contextIdentifier: ContextIdentifier): Promise<ContextEvent[]> {

        let contextWhere;
        if (contextIdentifier.id) {
            contextWhere = { context: contextIdentifier.id }
        } else {
            contextWhere = { context: lookup("key", contextIdentifier.key) }
        }

        const events = await db.query({
            agent_events: {
                $: {
                    where: contextWhere,
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