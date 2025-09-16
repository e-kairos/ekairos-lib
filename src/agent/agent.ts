import { init, id, tx, lookup, InstaQLEntity, InstantAdminDatabase } from "@instantdb/admin"
import { convertToModelMessages, createUIMessageStream, generateText, ModelMessage, smoothStream, stepCountIs, streamText, Tool, tool, UIMessageStreamWriter } from "ai"
import { agentDomain } from "./schema"
import { z } from "zod"

import { UIMessage } from 'ai';
import { initLogger } from "braintrust";
import { AgentService, ContextEvent, ContextIdentifier, StoredContext } from "./service";
import { ASSISTANT_MESSAGE_TYPE, convertEventsToModelMessages, convertEventToModelMessages, convertModelMessageToEvent, createAssistantEventFromUIMessages, createUserEventFromUIMessages, ResponseMessage, SYSTEM_MESSAGE_TYPE } from "./events";
import { SchemaOf } from "../domain";

// Inicializar Braintrust logger
const logger = initLogger({
  projectName: "pulzar platform",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

// Define your custom message type with data part schemas
export type AgentMessage = UIMessage<
  never, // metadata type
  {
    weather: {
      city: string;
      weather?: string;
      status: 'loading' | 'success';
    };
    notification: {
      message: string;
      level: 'info' | 'warning' | 'error';
    };
  } // data parts type
>;

export interface AgentOptions {
  onEventCreated?: (event: any) => void | Promise<void>
  evaluateToolCalls?: (toolCalls: any[]) => Promise<{ success: boolean; message?: string }>
  onToolCallExecuted?: (executionEvent: any) => void | Promise<void>
  onEnd?: () => void | Promise<void>
}

export type DataStreamWriter = UIMessageStreamWriter<AgentMessage>
const createDataStream = createUIMessageStream;

type AgentSchemaType = SchemaOf<typeof agentDomain>;

export abstract class Agent<Context> {

  private readonly db: InstantAdminDatabase<AgentSchemaType>;
  private readonly opts: AgentOptions;
  private readonly agentService: AgentService;

  constructor(db: InstantAdminDatabase<AgentSchemaType>, opts: AgentOptions = {}) {
    this.db = db
    this.opts = opts
    this.agentService = new AgentService(db)
  }

  protected abstract buildSystemPrompt(context: StoredContext<Context>, ...args: any[]): Promise<string> | string
  protected abstract buildTools(context: StoredContext<Context>, dataStream: DataStreamWriter): Promise<Record<string, Tool>>
  protected abstract initialize(context: StoredContext<Context>): Promise<Context>

  protected getModel(context: StoredContext<Context>) {
    return "openai/gpt-5"
  }

  private static readonly FINAL_TOOL_NAMES = ["createMessage", "requestDirection", "end"]

  protected getBaseTools(dataStream: DataStreamWriter, threadId: string): Record<string, Tool> {
    const createMessageTool = tool({
      description: "Send a message to the user. Use for final confirmations or information.",
      inputSchema: z.object({
        message: z.string().describe("Message for the user in markdown format")
      }),
    })

    const requestDirectionTool = tool({
      description: "Ask a human for guidance when blocked or unsure.",
      inputSchema: z.object({
        issue: z.string(),
        context: z.string(),
        suggestedActions: z.array(z.string()).optional(),
        urgency: z.enum(["low", "medium", "high"]).default("medium"),
      }),
    })

    const endTool = tool({
      description: "End the current interaction loop.",
      inputSchema: z.object({}).strict(),
      execute: async () => {
        return { success: true, message: "Ended" }
      },
    })

    return { createMessage: createMessageTool, requestDirection: requestDirectionTool, end: endTool }
  }

  protected async executeCreateMessage(
    eventId: string,
    args: { message: string; type: "info" | "confirmation" | "warning" | "error" | "success"; includeContext?: boolean },
    threadId: string,
    dataStream?: DataStreamWriter,
  ): Promise<any> {
    const assistantMessage = { id: eventId, role: "assistant" as const, content: args.message, createdAt: new Date() } as any
    try {
      await this.saveMessagesToThread(threadId, [assistantMessage])
    } catch { }
    if (dataStream) {
      //dataStream.writeData({ type: "user-response", message: args.message, responseType: args.type, includeContext: Boolean(args.includeContext), timestamp: new Date().toISOString() } as any)
    }
    return { success: true, message: args.message, data: { messageId: assistantMessage.id, threadId } }
  }

  protected async executeRequestDirection(
    eventId: string,
    args: { issue: string; context: string; suggestedActions?: string[]; urgency: "low" | "medium" | "high" },
    threadId: string,
    _dataStream?: DataStreamWriter,
  ): Promise<any> {
    const systemMessage = { id: eventId, role: "assistant" as const, content: `Direction requested: ${args.issue}\nContext: ${args.context}`, createdAt: new Date() } as any
    return { success: true, message: "Direction requested", data: { messageId: systemMessage.id, threadId } }
  }

  public async reactStream(
    incomingEvent: ContextEvent,
    contextIdentifier: ContextIdentifier | null
  ) {

    // get or create context
    const currentContext = await this.agentService.getOrCreateContext<Context>(contextIdentifier)

    // save incoming event
    await this.agentService.saveEvent({ id: currentContext.id }, incomingEvent)

    
    const dataStreamResult = createDataStream({
      execute: async ({ writer: dataStream }: { writer: DataStreamWriter }) => {
        let loopSafety = 0
        const MAX_LOOPS = 10

        // load previous events
        const previousEvents = await this.agentService.getEvents({ id: currentContext.id })

        const events: ContextEvent[] = [...previousEvents, incomingEvent]

        const contextId = currentContext.id

        const eventId = id()
        let reactionEvent = await this.agentService.saveEvent({ id: currentContext.id }, {
          id: eventId,
          type: "assistant",
          channel: "agent",
          createdAt: new Date().toISOString(),
          content: { parts: [] },
          status: "pending",
        })

        dataStream.write({ type: "event-start", data: { eventId: eventId } } as any)
        while (loopSafety < MAX_LOOPS) {

          dataStream.write({ type: "start-step" })

          loopSafety++

          // Read context
          const currentContext = await this.agentService.getContext<Context>({ id: contextId })
          dataStream.write({ type: "data-context-id", data: { contextId: currentContext.id } } as any)

          // Initialize on each loop and get new context data
          const contextContent = await this.initialize(currentContext)

          // Update context
          const updatedContext = await this.agentService.updateContextContent({ id: currentContext.id }, contextContent)

          // Build tools
          const subclassToolsAll = await this.buildTools(updatedContext, dataStream)

          // Build base tools for agent loop control
          const baseTools = this.getBaseTools(dataStream, updatedContext.id)
          const tools: Record<string, Tool> = { ...subclassToolsAll, ...baseTools }

          // Extract execute functions from tools
          const executeMap: Record<string, (args: any) => Promise<any>> = {}
          for (const [name, t] of Object.entries(subclassToolsAll)) {
            if ((t as any).execute) {
              executeMap[name] = (t as any).execute as (args: any) => Promise<any>
            }
          }
          executeMap["createMessage"] = (args: any) => this.executeCreateMessage(eventId, args, updatedContext.id, dataStream)
          executeMap["requestDirection"] = (args: any) => this.executeRequestDirection(eventId, args, updatedContext.id, dataStream)

          for (const [, t] of Object.entries(tools)) {
            delete (t as any).execute
          }

          const messagesForModel: ModelMessage[] = convertEventsToModelMessages(
            reactionEvent.status !== "pending"
              ? [...events, reactionEvent]
              : [...events]
          )

          const systemPrompt = await this.buildSystemPrompt(updatedContext)

          const result = streamText({
            model: this.getModel(updatedContext),
            system: systemPrompt,
            messages: messagesForModel,
            tools,
            toolChoice: "required",
            stopWhen: stepCountIs(1), // Stop at step 5 if tools were called
            experimental_transform: smoothStream({
              delayInMs: 30, // optional: defaults to 10ms
              chunking: 'word', // optional: defaults to 'word'
            }),
            providerOptions: {
              openai: {
                reasoningSummary: 'detailed', // 'auto' for condensed or 'detailed' for comprehensive
              },
            }
          })

          result.consumeStream()

          // create promise
          let resolveFinish!: (value: ContextEvent) => void
          let rejectFinish!: (reason?: unknown) => void
          const finishPromise = new Promise<ContextEvent>((resolve, reject) => {
            resolveFinish = resolve
            rejectFinish = reject
          })

          dataStream.merge(result.toUIMessageStream({
            sendStart: false,
            generateMessageId: () => {
              return eventId
            },
            messageMetadata(options) {
              return {
                eventId: eventId,
              }
            },
            onFinish: ({ messages }) => {
              console.log("messages", messages)
              const lastEvent = createAssistantEventFromUIMessages(eventId, messages)
              resolveFinish(lastEvent)
            },
            onError: (e: unknown) => {
              console.error("Agent error:", e)
              rejectFinish(e)
              const message = e instanceof Error ? e.message : String(e)
              return message
            }
          }).pipeThrough(new TransformStream({
            transform(chunk: any, controller: any) {

              if (chunk.type === "start") {
                return;
              }

              if (chunk.type === "finish-step") {
                return;
              }

              if (chunk.type === "start-step") {
                return
              }

              if (chunk.type === "finish") {
                return;
              }

              controller.enqueue(chunk as any)
            }
          })))

          // wait for the on finish here
          const lastEvent = await finishPromise

          const toolCalls = lastEvent.content.parts.reduce((acc: any[], p: any) => {
            if (typeof p.type === "string" && p.type.startsWith("tool-")) {
              const toolName = p.type.split("-")[1]
              acc.push({ toolCallId: p.toolCallId, toolName: toolName, args: p.input });
            }
            return acc;
          }, []);

          if (!toolCalls.length) {
            await this.opts.onEnd?.()
            break
          }
          const tc = toolCalls[0]
          if (tc.toolName === "end") {
            try { await this.opts.onEnd?.() } catch { }
            return
          }


          // append parts to reactionEvent
          const reactionEventWithParts = {
            ...reactionEvent,
            content: { parts: [...reactionEvent.content.parts, ...lastEvent.content.parts] },
          }

          const savedEvent = await this.agentService.updateEvent(reactionEvent.id, reactionEventWithParts)

          //await this.opts.onEventCreated?.({ id: savedEvent.id, type: eventType, status: "processing" })

          let execSuccess = true
          let execMessage = "Executed"
          let execResult: any = null
          try {
            const execFn = executeMap[tc.toolName]
            if (execFn) {
              execResult = await execFn(tc.args)
              execSuccess = execResult?.success !== false
              execMessage = execResult?.message || execMessage
            }
          } catch (err: any) {
            execSuccess = false
            execMessage = err.message
          }
          // Notify client about tool result via data stream
          try {
            if (execSuccess) {
              dataStream.write({
                type: "tool-output-available",
                toolCallId: tc.toolCallId,
                output: execResult,
              } as any)
            } else {
              dataStream.write({
                type: "tool-output-error",
                toolCallId: tc.toolCallId,
                errorText: String(execMessage || "Error"),
              } as any)
            }

          } catch (e) {
            console.error("Failed to write tool result to stream", e)
          }

          // parts
          const existingParts = reactionEventWithParts?.content?.parts || []

          // replace the tool part in existingParts
          const mergedParts = existingParts.map((p: any) => {
            if (p.type === `tool-${tc.toolName}` && p.toolCallId === tc.toolCallId) {
              if (execSuccess) {
                return {
                  ...p,
                  state: "output-available",
                  output: execResult,
                }
              } else {
                return {
                  ...p,
                  state: "output-error",
                  errorText: String(execMessage || "Error"),
                }
              }
            }
            return p
          })

          const updatedEvent = await this.agentService.updateEvent(savedEvent.id, {
            id: savedEvent.id,
            type: savedEvent.type,
            channel: "agent",
            createdAt: savedEvent.createdAt,
            content: { parts: mergedParts }
          })

          reactionEvent = updatedEvent

          // Close the current step and message on the client
          dataStream.write({ type: "finish-step" })

          await this.opts.onToolCallExecuted?.({ id: updatedEvent.id, toolCall: tc, event: updatedEvent.id, success: execSuccess, message: execMessage, result: execResult })

          let shouldEnd = false
          if (!execSuccess) {
            try { await this.opts.onEnd?.() } catch { }
            shouldEnd = true
          }

          const loopShouldEnd = toolCalls.some((t: { toolName: string }) => Agent.FINAL_TOOL_NAMES.includes(t.toolName))
          if (loopShouldEnd) {
            try { await this.opts.onEnd?.() } catch { }
            shouldEnd = true
          }

          if (shouldEnd) {
            dataStream.write({ type: "finish", override: true } as any)
            break
          }
        }
        await this.agentService.updateEvent(reactionEvent.id, {
          ...reactionEvent,
          status: "completed",
        })
      },
      onError: (e) => {
        console.error("Agent error:", e)
        throw e
      },
      onFinish: () => {
        console.log("Agent finished")
      }
    })

    // start the stream

    const dataStreamFilteredResult = dataStreamResult.pipeThrough(new TransformStream({
      transform(chunk: any, controller: any) {
        if (chunk.type === "start") {
          console.log("start", chunk.data)
          return;
        }

        if (chunk.type === "event-start") {
          controller.enqueue({ type: "start", messageId: chunk.data.eventId })
          return;
        }

        controller.enqueue(chunk as any)
      }
    }))

    return dataStreamFilteredResult
  }

  private async saveMessagesToThread(threadId: string, messages: Array<any>) {
    // Placeholder for persistence hook. Not implemented in current scope.
    return
  }




}


