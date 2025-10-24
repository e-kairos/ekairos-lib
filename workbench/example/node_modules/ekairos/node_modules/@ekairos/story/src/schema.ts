import { i } from "@instantdb/core";
import { domain } from "@ekairos/domain";

const entities = {
  story_contexts: i.entity({
    createdAt: i.date(),
    updatedAt: i.date().optional(),
    type: i.string().optional(),
    key: i.string().optional().indexed().unique(),
    status: i.string().optional().indexed(), // open | executing
    content: i.any().optional(),
  }),
  story_events: i.entity({
    channel: i.string().indexed(),
    createdAt: i.date().indexed(),
    type: i.string().optional().indexed(),
    content: i.any().optional(),
    status: i.string().optional().indexed(),
  }),
  story_executions: i.entity({
    createdAt: i.date(),
    updatedAt: i.date().optional(),
    status: i.string().optional().indexed(), // executing | completed | failed
  }),
} as const;

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
} as const;

const rooms = {} as const;

export const storyDomain = domain({ entities, links, rooms });



