import { i } from "@instantdb/core";
import { domain, SchemaOf } from "../domain";

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
  agentEventsContext: {
    forward: { on: "agent_events", has: "one", label: "context" },
    reverse: { on: "agent_contexts", has: "many", label: "events" },
  },
} as const;

const rooms = {} as const;

export const agentDomain = domain({ entities, links, rooms });



