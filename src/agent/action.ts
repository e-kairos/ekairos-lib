import { tool } from "ai"

type ActionOptions = Parameters<typeof tool>[0]

export const action = (options: ActionOptions) => {
  return tool({
    ...options,
    execute: async (args) => {
      return { success: true, message: args.message, data: { messageId: args.message, threadId } }
    }
  })
}
