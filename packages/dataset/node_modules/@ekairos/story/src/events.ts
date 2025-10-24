import { id, init } from "@instantdb/admin"
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"
import type { ContextEvent } from "./service"
import { parseAndStoreDocument } from "./document-parser"

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN as string,
})

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

export async function convertEventsToModelMessages(events: ContextEvent[]): Promise<ModelMessage[]> {
  const results: ModelMessage[][] = []
  for (const event of events) {
    const messages = await convertEventToModelMessages(event)
    results.push(messages)
  }
  return results.flat()}

export async function convertEventToModelMessages(event: ContextEvent): Promise<ModelMessage[]> {

  // convert files in message
  // const files = event.content.parts.filter(part => part.type === "file")
  // 1. copy event to new . we will manipulate the parts
  // 2. each file part will be converted using convertFilePart

  const convertedParts = await Promise.all(
    (event.content?.parts || []).map(async (part: any) => {
      if (part?.type === "file") {
        return await convertFilePart(part)
      }
      return [part]
    }),
  )

  const newEvent: ContextEvent = {
    ...event,
    content: {
      ...event.content,
      parts: convertedParts.flat(),
    },
  }

  // convert event to convertToModelMessages compatible
  let message = convertToUIMessage(newEvent)

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
    createdAt: message.timestamp.toISOString(),
  }
}


async function convertFilePart(part: any): Promise<any[]> {
  // file part has data:fileId=xxxx in its url
  // we will extract that file id and call instantdb to get the file url
  if (!part?.url || typeof part.url !== "string") {
    return [part]
  }

  // Look for 'data:fileId=' pattern and extract the fileId
  const fileIdMatch = part.url.match(/data:fileId=([A-Za-z0-9_\-]+)/)
  const fileId = fileIdMatch ? fileIdMatch[1] : null

  if (!fileId) {
    return [part]
  }

  try {
    const fileQuery = await db.query({
      $files: {
        $: {
          where: {
            id: fileId,
          },
          limit: 1,
        },
        document: {},
      },
    })

    const fileRecord = Array.isArray(fileQuery.$files) ? fileQuery.$files[0] : undefined
    if (!fileRecord) {
      return [part]
    }

    let documentRecord = fileRecord.document as any
    if (!documentRecord || (Array.isArray(documentRecord) && documentRecord.length === 0)) {
      const fileResponse = await fetch(fileRecord.url as string)
      if (!fileResponse.ok) {
        return [part]
      }

      const buffer = await fileResponse.arrayBuffer()
      const documentId = await parseAndStoreDocument(
        db,
        Buffer.from(buffer),
        fileRecord.path as string,
        fileRecord.path as string,
        fileRecord.id as string,
      )

      const documentQuery = await db.query({
        documents: {
          $: {
            where: {
              id: documentId,
            },
            limit: 1,
          },
        },
      })

      documentRecord = Array.isArray(documentQuery.documents) ? documentQuery.documents[0] : undefined
    }

    const parts: any[] = []

    const fileName = documentRecord && typeof documentRecord === "object" && "fileName" in documentRecord
      ? String(documentRecord.fileName)
      : String(fileRecord.path || "Unknown")

    parts.push({
      type: "text",
      text: `User attached a file.\nFile ID: ${fileRecord.id}\nFile Name: "${fileName}"\nMedia Type: ${part.mediaType || "unknown"}`,
    })

    if (documentRecord?.content && Array.isArray(documentRecord.content.pages)) {
      const pages = documentRecord.content.pages
      const pageTexts = pages
        .map((page: Record<string, unknown>, index: number) => {
          const text = typeof page.text === "string" ? page.text : ""
          return `\n\n--- Page ${index + 1} ---\n\n${text}`
        })
        .join("")

      if (pageTexts.length > 0) {
        parts.push({
          type: "text",
          text: `Document transcription for File ID ${fileRecord.id}:${pageTexts}`,
        })
      }
    }

    return parts
  } catch (error) {
    console.error("convertFilePart error", error)
    return [part]
  }
}
