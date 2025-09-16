import { id } from "@instantdb/admin"
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"
import type { ContextEvent } from "./service"

export const USER_MESSAGE_TYPE = "user.message"
export const ASSISTANT_MESSAGE_TYPE = "assistant.message"
export const SYSTEM_MESSAGE_TYPE = "system.message"

export const WEB_CHANNEL = "web"
export const AGENT_CHANNEL = "whatsapp"
export const EMAIL_CHANNEL = "email"

export function createUserEventFromUIMessages(messages: UIMessage[]): ContextEvent {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Missing messages to create event")
  }

  const lastMessage = messages[messages.length - 1]

  return {
    id: lastMessage.id,
    type: USER_MESSAGE_TYPE,
    channel: WEB_CHANNEL,
    content: {
      parts: lastMessage.parts,
    },
    createdAt: new Date().toISOString(),
  }
}

export function createAssistantEventFromUIMessages(eventId: string, messages: UIMessage[]): ContextEvent {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Missing messages to create event")
  }

  const lastMessage = messages[messages.length - 1]

  return {
    id: eventId,
    type: ASSISTANT_MESSAGE_TYPE,
    channel: WEB_CHANNEL,
    content: {
      parts: lastMessage.parts,
    },
    createdAt: new Date().toISOString(),
  }
}

export function convertToUIMessage(event: ContextEvent): UIMessage {
  let role: "user" | "assistant"
  if (event.type === USER_MESSAGE_TYPE) {
    role = "user"
  } else {
    role = "assistant"
  }

  return {
    id: event.id,
    role: role,
    parts: event.content.parts,
    metadata: {
      channel: event.channel,
      type: event.type,
      createdAt: event.createdAt,
    }
  }
}

export function convertEventsToModelMessages(events: ContextEvent[]): ModelMessage[] {
  return events.map(event => convertEventToModelMessages(event)).flat()
}

export function convertEventToModelMessages(event: ContextEvent): ModelMessage[] {
  // convert event to convertToModelMessages compatible
  let message = convertToUIMessage(event)

  // use ai sdk helper
  return convertToModelMessages([message])
}

export type AIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

export type ResponseMessage = {
  id: string;
  timestamp: Date;
  modelId: string;
  headers?: Record<string, string>;
  message: ModelMessage
}

export function convertModelMessageToEvent(eventId: string, message: ResponseMessage): ContextEvent {

  let type;
  switch (message.message.role) {
    case "user":
      type = USER_MESSAGE_TYPE;
      break;
    case "assistant":
      type = ASSISTANT_MESSAGE_TYPE;
      break;
    case "system":
      type = SYSTEM_MESSAGE_TYPE;
      break;
  }

  return {
    id: eventId,
    type: type,
    channel: WEB_CHANNEL,
    content: {
      parts: message.message.content,
    },
    createdAt: message.timestamp,
  }
}