import { type ModelMessage, type UIMessage } from "ai";
import type { ContextEvent } from "./service";
export declare const USER_MESSAGE_TYPE = "user.message";
export declare const ASSISTANT_MESSAGE_TYPE = "assistant.message";
export declare const SYSTEM_MESSAGE_TYPE = "system.message";
export declare const WEB_CHANNEL = "web";
export declare const AGENT_CHANNEL = "whatsapp";
export declare const EMAIL_CHANNEL = "email";
export declare function createUserEventFromUIMessages(messages: UIMessage[]): ContextEvent;
export declare function createAssistantEventFromUIMessages(eventId: string, messages: UIMessage[]): ContextEvent;
export declare function convertToUIMessage(event: ContextEvent): UIMessage;
export declare function convertEventsToModelMessages(events: ContextEvent[]): Promise<ModelMessage[]>;
export declare function convertEventToModelMessages(event: ContextEvent): Promise<ModelMessage[]>;
export type AIMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: Date;
};
export type ResponseMessage = {
    id: string;
    timestamp: Date;
    modelId: string;
    headers?: Record<string, string>;
    message: ModelMessage;
};
export declare function convertModelMessageToEvent(eventId: string, message: ResponseMessage): ContextEvent;
//# sourceMappingURL=events.d.ts.map