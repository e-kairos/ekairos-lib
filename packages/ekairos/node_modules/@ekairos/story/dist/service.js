"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const admin_1 = require("@instantdb/admin");
const schema_1 = require("./schema");
class AgentService {
    constructor() {
        this.db = (0, admin_1.init)({
            appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
            adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
            schema: schema_1.storyDomain.schema()
        });
    }
    async getOrCreateContext(contextIdentifier) {
        if (!contextIdentifier) {
            return this.createContext();
        }
        let context = await this.getContext(contextIdentifier);
        if (!context) {
            return this.createContext(contextIdentifier.key ? { key: contextIdentifier.key } : null, contextIdentifier.id);
        }
        else {
            return context;
        }
    }
    async createContext(contextKey, contextId) {
        let contextData = {
            createdAt: new Date(),
            content: {},
            key: null
        };
        const newContextId = contextId ?? (0, admin_1.id)();
        if (contextKey?.key) {
            contextData = {
                ...contextData,
                key: contextKey.key
            };
        }
        await this.db.transact([
            this.db.tx.story_contexts[newContextId].create(contextData)
        ]);
        return this.getContext({ id: newContextId });
    }
    async getContext(contextIdentifier) {
        let context;
        try {
            if (contextIdentifier.id) {
                const tRes = await this.db.query({
                    story_contexts: {
                        $: { where: { id: contextIdentifier.id }, limit: 1 }
                    }
                });
                context = tRes.story_contexts?.[0];
            }
            if (contextIdentifier.key) {
                const tRes = await this.db.query({
                    story_contexts: {
                        $: { where: { key: contextIdentifier.key } }
                    }
                });
                context = tRes.story_contexts?.[0];
            }
            return context;
        }
        catch (error) {
            console.error("Error getting context", error);
            throw new Error("Error getting context: " + error.message);
        }
    }
    async updateContextContent(contextIdentifier, content) {
        const contextDBIdentifier = contextIdentifier.id ?? (0, admin_1.lookup)("key", contextIdentifier.key);
        await this.db.transact([
            this.db.tx.story_contexts[contextDBIdentifier].update({
                content: content,
                updatedAt: new Date()
            })
        ]);
        return this.getContext(contextIdentifier);
    }
    async saveEvent(contextIdentifier, event) {
        const txs = [
            this.db.tx.story_events[event.id].create({
                ...event,
                status: "stored"
            })
        ];
        if (contextIdentifier.id) {
            txs.push(this.db.tx.story_events[event.id].link({ context: contextIdentifier.id }));
        }
        else {
            txs.push(this.db.tx.story_events[event.id].link({ context: (0, admin_1.lookup)("key", contextIdentifier.key) }));
        }
        await this.db.transact(txs);
        return await this.getEvent(event.id);
    }
    async createExecution(contextIdentifier, triggerEventId, reactionEventId) {
        const executionId = (0, admin_1.id)();
        const execCreate = this.db.tx.story_executions[executionId].create({
            createdAt: new Date(),
            status: "executing",
        });
        const txs = [execCreate];
        if (contextIdentifier.id) {
            txs.push(this.db.tx.story_executions[executionId].link({ context: contextIdentifier.id }));
            txs.push(this.db.tx.story_contexts[contextIdentifier.id].update({ status: "executing" }));
            txs.push(this.db.tx.story_contexts[contextIdentifier.id].link({ currentExecution: executionId }));
        }
        else {
            const ctxLookup = (0, admin_1.lookup)("key", contextIdentifier.key);
            txs.push(this.db.tx.story_executions[executionId].link({ context: ctxLookup }));
            txs.push(this.db.tx.story_contexts[ctxLookup].update({ status: "executing" }));
            txs.push(this.db.tx.story_contexts[ctxLookup].link({ currentExecution: executionId }));
        }
        txs.push(this.db.tx.story_executions[executionId].link({ trigger: triggerEventId }));
        txs.push(this.db.tx.story_executions[executionId].link({ reaction: reactionEventId }));
        await this.db.transact(txs);
        return { id: executionId };
    }
    async completeExecution(contextIdentifier, executionId, status) {
        const txs = [];
        txs.push(this.db.tx.story_executions[executionId].update({ status, updatedAt: new Date() }));
        if (contextIdentifier.id) {
            txs.push(this.db.tx.story_contexts[contextIdentifier.id].update({ status: "open" }));
            // optionally unlink currentExecution if desired
        }
        else {
            txs.push(this.db.tx.story_contexts[(0, admin_1.lookup)("key", contextIdentifier.key)].update({ status: "open" }));
        }
        await this.db.transact(txs);
    }
    async updateEvent(eventId, event) {
        await this.db.transact([
            this.db.tx.story_events[eventId].update(event)
        ]);
        return await this.getEvent(eventId);
    }
    async getEvent(eventId) {
        const event = await this.db.query({
            story_events: {
                $: { where: { id: eventId } }
            }
        });
        return event.story_events?.[0];
    }
    async getEvents(contextIdentifier) {
        let contextWhere;
        if (contextIdentifier.id) {
            contextWhere = { context: contextIdentifier.id };
        }
        else {
            contextWhere = { context: (0, admin_1.lookup)("key", contextIdentifier.key) };
        }
        const events = await this.db.query({
            story_events: {
                $: {
                    where: contextWhere,
                    limit: 30,
                    order: {
                        createdAt: 'desc',
                    },
                }
            }
        });
        return events.story_events;
    }
    async readEventStream(stream) {
        const reader = stream.getReader();
        const chunks = [];
        let firstChunk;
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            const currentChunk = value;
            if (!firstChunk) {
                firstChunk = currentChunk;
            }
            chunks.push(currentChunk);
        }
        if (!firstChunk) {
            throw new Error("No chunks received from stream");
        }
        const eventId = firstChunk.messageId;
        const query = await this.db.query({
            story_events: {
                $: {
                    where: { id: eventId },
                    limit: 1,
                    fields: ["id", "channel", "type", "status", "createdAt", "content"],
                },
            },
        });
        const persistedEvent = Array.isArray(query.story_events) ? query.story_events[0] : undefined;
        return {
            eventId,
            chunks,
            persistedEvent,
        };
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=service.js.map