export declare const storyDomain: import("@ekairos/domain").DomainInstance<{
    readonly story_contexts: import("@instantdb/core").EntityDef<{
        createdAt: import("@instantdb/core").DataAttrDef<Date, true, false>;
        updatedAt: import("@instantdb/core").DataAttrDef<Date, false, false>;
        type: import("@instantdb/core").DataAttrDef<string, false, false>;
        key: import("@instantdb/core").DataAttrDef<string, false, true>;
        status: import("@instantdb/core").DataAttrDef<string, false, true>;
        content: import("@instantdb/core").DataAttrDef<any, false, false>;
    }, {}, void>;
    readonly story_events: import("@instantdb/core").EntityDef<{
        channel: import("@instantdb/core").DataAttrDef<string, true, true>;
        createdAt: import("@instantdb/core").DataAttrDef<Date, true, true>;
        type: import("@instantdb/core").DataAttrDef<string, false, true>;
        content: import("@instantdb/core").DataAttrDef<any, false, false>;
        status: import("@instantdb/core").DataAttrDef<string, false, true>;
    }, {}, void>;
    readonly story_executions: import("@instantdb/core").EntityDef<{
        createdAt: import("@instantdb/core").DataAttrDef<Date, true, false>;
        updatedAt: import("@instantdb/core").DataAttrDef<Date, false, false>;
        status: import("@instantdb/core").DataAttrDef<string, false, true>;
    }, {}, void>;
}, {
    readonly storyContextsOrganization: {
        readonly forward: {
            readonly on: "story_contexts";
            readonly has: "one";
            readonly label: "organization";
        };
        readonly reverse: {
            readonly on: "organizations";
            readonly has: "many";
            readonly label: "story_contexts";
        };
    };
    readonly storyEventsOrganization: {
        readonly forward: {
            readonly on: "story_events";
            readonly has: "one";
            readonly label: "organization";
        };
        readonly reverse: {
            readonly on: "organizations";
            readonly has: "many";
            readonly label: "story_events";
        };
    };
    readonly storyEventsContext: {
        readonly forward: {
            readonly on: "story_events";
            readonly has: "one";
            readonly label: "context";
        };
        readonly reverse: {
            readonly on: "story_contexts";
            readonly has: "many";
            readonly label: "events";
        };
    };
    readonly storyExecutionsContext: {
        readonly forward: {
            readonly on: "story_executions";
            readonly has: "one";
            readonly label: "context";
        };
        readonly reverse: {
            readonly on: "story_contexts";
            readonly has: "many";
            readonly label: "executions";
        };
    };
    readonly storyContextsCurrentExecution: {
        readonly forward: {
            readonly on: "story_contexts";
            readonly has: "one";
            readonly label: "currentExecution";
        };
        readonly reverse: {
            readonly on: "story_executions";
            readonly has: "one";
            readonly label: "currentOf";
        };
    };
    readonly storyExecutionsTrigger: {
        readonly forward: {
            readonly on: "story_executions";
            readonly has: "one";
            readonly label: "trigger";
        };
        readonly reverse: {
            readonly on: "story_events";
            readonly has: "many";
            readonly label: "executionsAsTrigger";
        };
    };
    readonly storyExecutionsReaction: {
        readonly forward: {
            readonly on: "story_executions";
            readonly has: "one";
            readonly label: "reaction";
        };
        readonly reverse: {
            readonly on: "story_events";
            readonly has: "many";
            readonly label: "executionsAsReaction";
        };
    };
}, {}>;
//# sourceMappingURL=schema.d.ts.map