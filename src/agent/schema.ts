import { i } from "@instantdb/core";

const entities = {
  agent_contexts: i.entity({
    createdAt: i.date(),
    updatedAt: i.date().optional(),
    type: i.string().optional(),
    key: i.string().optional().indexed().unique(),
    content: i.any().optional(),
  }),
  agent_events: i.entity({
    channel: i.string().indexed(),
    createdAt: i.date().indexed(),
    type: i.string().optional().indexed(),
    content: i.any().optional(),
    status: i.string().optional().indexed(),
  }),
} as const;

const links = {
  agentContextsOrganization: {
    forward: { on: "agent_contexts", has: "one", label: "organization" },
    reverse: { on: "organizations", has: "many", label: "agent_contexts" },
  },
  agentEventsOrganization: {
    forward: { on: "agent_events", has: "one", label: "organization" },
    reverse: { on: "organizations", has: "many", label: "agent_events" },
  },
  agentEventsContext: {
    forward: { on: "agent_events", has: "one", label: "context" },
    reverse: { on: "agent_contexts", has: "many", label: "events" },
  },
} as const;

const rooms = {} as const;

export default { entities, links, rooms } as const;



