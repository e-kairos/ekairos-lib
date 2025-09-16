import { tool } from "ai"
import { z } from "zod"

export type ActionInput = {
  message: string
}

export function action(name: string, description: string) {
  return tool({
    description: description,
    inputSchema: z.object({
      message: z.string(),
    }),
  })
}
