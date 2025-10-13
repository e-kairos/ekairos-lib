import { init, id, tx, lookup, InstaQLEntity } from "@instantdb/admin"
import { convertToModelMessages, createUIMessageStream, generateText, ModelMessage, smoothStream, stepCountIs, streamText, Tool, tool, UIMessageStreamWriter } from "ai"
import { agentDomain } from "./schema"
import { z } from "zod"

import { UIMessage } from 'ai';
import { initLogger } from "braintrust";
import { AgentService, ContextEvent, ContextIdentifier, StoredContext } from "./service";
import { ASSISTANT_MESSAGE_TYPE, convertEventsToModelMessages, convertEventToModelMessages, convertModelMessageToEvent, createAssistantEventFromUIMessages, createUserEventFromUIMessages, ResponseMessage, SYSTEM_MESSAGE_TYPE } from "./events";

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
  onEnd?: (lastEvent: ContextEvent) => void | { end?: boolean } | Promise<void | { end?: boolean }>
}

export type DataStreamWriter = UIMessageStreamWriter<AgentMessage>
const createDataStream = createUIMessageStream;


export abstract class Agent<Context> {
  protected db = init({ appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string, adminToken: process.env.INSTANT_APP_ADMIN_TOKEN as string, schema: agentDomain.schema() })
  protected agentService: AgentService

  constructor(private opts: AgentOptions = {}) {
    this.agentService = new AgentService()
  }

  protected abstract buildSystemPrompt(context: StoredContext<Context>, ...args: any[]): Promise<string> | string
  protected abstract buildTools(context: StoredContext<Context>, dataStream: DataStreamWriter): Promise<Record<string, Tool>>
  protected abstract initialize(context: StoredContext<Context>): Promise<Context>

  protected getModel(context: StoredContext<Context>) {
    return "openai/gpt-5"
  }

  protected includeBaseTools(): { createMessage: boolean; requestDirection: boolean; end: boolean } {
    return { createMessage: true, requestDirection: true, end: true }
  }

  protected async getFinalizationToolNames(): Promise<string[]> {
    return []
  }

  private static readonly FINAL_TOOL_NAMES = ["createMessage", "requestDirection", "end"]

  protected getBaseTools(dataStream: DataStreamWriter, threadId: string): Record<string, Tool> {
    const include = this.includeBaseTools()
    const baseTools: Record<string, Tool> = {}

    if (include.createMessage) {
      baseTools.createMessage = tool({
        description: "Send a message to the user. Use for final confirmations or information.",
        inputSchema: z.object({
          message: z.string().describe("Message for the user in markdown format")
        }),
      })
    }

    if (include.requestDirection) {
      baseTools.requestDirection = tool({
        description: "Ask a human for guidance when blocked or unsure.",
        inputSchema: z.object({
          issue: z.string(),
          context: z.string(),
          suggestedActions: z.array(z.string()).optional(),
          urgency: z.enum(["low", "medium", "high"]).default("medium"),
        }),
      })
    }

    if (include.end) {
      baseTools.end = tool({
        description: "End the current interaction loop.",
        inputSchema: z.object({}).strict(),
        execute: async () => {
          return { success: true, message: "Ended" }
        },
      })
    }

    return baseTools
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
        const MAX_LOOPS = 20

        // load previous events
        const previousEvents = await this.agentService.getEvents({ id: currentContext.id })

        const events: ContextEvent[] = previousEvents
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

          const include = this.includeBaseTools()
          if (include.createMessage) {
            executeMap["createMessage"] = (args: any) => this.executeCreateMessage(eventId, args, updatedContext.id, dataStream)
          }
          if (include.requestDirection) {
            executeMap["requestDirection"] = (args: any) => this.executeRequestDirection(eventId, args, updatedContext.id, dataStream)
          }

          for (const [, t] of Object.entries(tools)) {
            delete (t as any).execute
          }

          const messagesForModel: ModelMessage[] = await convertEventsToModelMessages(
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
            onStepFinish: (step) => {
              console.log("onStepFinish", step)
            },
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

          console.log("agent.toolCalls.detected", {
            eventId,
            toolCalls: toolCalls.map((call: any) => ({ toolCallId: call.toolCallId, toolName: call.toolName }))
          });

          if (!toolCalls.length) {
            const shouldEndInteraction = await this.callOnEnd(lastEvent)
            if (shouldEndInteraction) {
              break
            }
            continue
          }
          const reactionEventWithParts = {
            ...reactionEvent,
            content: { parts: [...reactionEvent.content.parts, ...lastEvent.content.parts] },
          }

          let currentEventState = await this.agentService.updateEvent(reactionEvent.id, reactionEventWithParts)

          const executionResults = await Promise.all(toolCalls.map(async (tc: any) => {
            console.log("agent.toolCall.selected", {
              eventId,
              toolCallId: tc.toolCallId,
              toolName: tc.toolName
            })

            let execSuccess = true
            let execMessage = "Executed"
            let execResult: any = null
            try {
              const execFn = executeMap[tc.toolName]
              if (execFn) {
                console.log("agent.toolCall.execute.start", { toolCallId: tc.toolCallId, toolName: tc.toolName })
                execResult = await execFn(tc.args)
                execSuccess = execResult?.success !== false
                execMessage = execResult?.message || execMessage
                console.log("agent.toolCall.execute.success", {
                  toolCallId: tc.toolCallId,
                  toolName: tc.toolName,
                  success: execSuccess
                })
                console.log("agent.toolCall.execute.result", {
                  toolCallId: tc.toolCallId,
                  toolName: tc.toolName,
                  result: execResult
                })
              }
            }
            catch (err: any) {
              execSuccess = false
              execMessage = err.message
              console.error("agent.toolCall.execute.error", {
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                error: err
              })
            }

            return { tc, execSuccess, execMessage, execResult }
          }))

          let exitOuterLoop = false
          const customFinalizationTools = await this.getFinalizationToolNames()
          const allFinalToolNames = [...Agent.FINAL_TOOL_NAMES, ...customFinalizationTools]

          for (const { tc, execSuccess, execMessage, execResult } of executionResults) {
            try {
              if (execSuccess) {
                dataStream.write({
                  type: "tool-output-available",
                  toolCallId: tc.toolCallId,
                  output: execResult,
                } as any)
              }
              else {
                dataStream.write({
                  type: "tool-output-error",
                  toolCallId: tc.toolCallId,
                  errorText: String(execMessage || "Error"),
                } as any)
              }
            }
            catch (e) {
              console.error("Failed to write tool result to stream", e)
            }

            const existingParts = currentEventState?.content?.parts || []
            const mergedParts = existingParts.map((p: any) => {
              if (p.type === `tool-${tc.toolName}` && p.toolCallId === tc.toolCallId) {
                if (execSuccess) {
                  return {
                    ...p,
                    state: "output-available",
                    output: execResult,
                  }
                }
                return {
                  ...p,
                  state: "output-error",
                  errorText: String(execMessage || "Error"),
                }
              }
              return p
            })

            currentEventState = await this.agentService.updateEvent(currentEventState.id, {
              id: currentEventState.id,
              type: currentEventState.type,
              channel: "agent",
              createdAt: currentEventState.createdAt,
              content: { parts: mergedParts },
            })

            dataStream.write({ type: "finish-step" })

            await this.opts.onToolCallExecuted?.({
              id: currentEventState.id,
              toolCall: tc,
              event: currentEventState.id,
              success: execSuccess,
              message: execMessage,
              result: execResult,
            })

            let shouldEnd = false
            if (!execSuccess) {
              const shouldEndInteraction = await this.callOnEnd(lastEvent)
              if (shouldEndInteraction) {
                shouldEnd = true
              }
            }

            if (!shouldEnd) {
              if (allFinalToolNames.includes(tc.toolName)) {
                const shouldEndInteraction = await this.callOnEnd(lastEvent)
                if (shouldEndInteraction) {
                  shouldEnd = true
                }
              }
            }

            if (shouldEnd) {
              dataStream.write({ type: "finish", override: true } as any)
              exitOuterLoop = true
              break
            }
          }

          reactionEvent = currentEventState

          if (exitOuterLoop) {
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

  private async callOnEnd(lastEvent: ContextEvent): Promise<boolean> {
    if (!this.opts.onEnd) {
      return true
    }

    try {
      const result = await this.opts.onEnd(lastEvent)
      if (typeof result === "boolean") {
        return result
      }
      if (result && typeof result === "object") {
        if (Object.prototype.hasOwnProperty.call(result, "end")) {
          return Boolean(result.end)
        }
      }
      return true
    } catch (error) {
      console.error("onEnd callback failed", error)
      return true
    }
  }




}


