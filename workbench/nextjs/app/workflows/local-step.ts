export async function localStep(input: string) {
  'use step'
  
  return {
    message: `Local step processed: ${input}`,
    timestamp: Date.now(),
    processed: true
  }
}
