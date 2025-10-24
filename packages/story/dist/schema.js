"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storyDomain = void 0;
const core_1 = require("@instantdb/core");
const domain_1 = require("@ekairos/domain");
const entities = {
    story_contexts: core_1.i.entity({
        createdAt: core_1.i.date(),
        updatedAt: core_1.i.date().optional(),
        type: core_1.i.string().optional(),
        key: core_1.i.string().optional().indexed().unique(),
        status: core_1.i.string().optional().indexed(), // open | executing
        content: core_1.i.any().optional(),
    }),
    story_events: core_1.i.entity({
        channel: core_1.i.string().indexed(),
        createdAt: core_1.i.date().indexed(),
        type: core_1.i.string().optional().indexed(),
        content: core_1.i.any().optional(),
        status: core_1.i.string().optional().indexed(),
    }),
    story_executions: core_1.i.entity({
        createdAt: core_1.i.date(),
        updatedAt: core_1.i.date().optional(),
        status: core_1.i.string().optional().indexed(), // executing | completed | failed
    }),
};
const links = {
    storyContextsOrganization: {
        forward: { on: "story_contexts", has: "one", label: "organization" },
        reverse: { on: "organizations", has: "many", label: "story_contexts" },
    },
    storyEventsOrganization: {
        forward: { on: "story_events", has: "one", label: "organization" },
        reverse: { on: "organizations", has: "many", label: "story_events" },
    },
    storyEventsContext: {
        forward: { on: "story_events", has: "one", label: "context" },
        reverse: { on: "story_contexts", has: "many", label: "events" },
    },
    // Executions belong to a context
    storyExecutionsContext: {
        forward: { on: "story_executions", has: "one", label: "context" },
        reverse: { on: "story_contexts", has: "many", label: "executions" },
    },
    // Current execution pointer on a context
    storyContextsCurrentExecution: {
        forward: { on: "story_contexts", has: "one", label: "currentExecution" },
        reverse: { on: "story_executions", has: "one", label: "currentOf" },
    },
    // Link execution to its trigger event
    storyExecutionsTrigger: {
        forward: { on: "story_executions", has: "one", label: "trigger" },
        reverse: { on: "story_events", has: "many", label: "executionsAsTrigger" },
    },
    // Link execution to its reaction event
    storyExecutionsReaction: {
        forward: { on: "story_executions", has: "one", label: "reaction" },
        reverse: { on: "story_events", has: "many", label: "executionsAsReaction" },
    },
};
const rooms = {};
exports.storyDomain = (0, domain_1.domain)({ entities, links, rooms });
//# sourceMappingURL=schema.js.map