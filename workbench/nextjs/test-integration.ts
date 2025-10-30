import { spawn, type ChildProcess } from "node:child_process"
import { once } from "node:events"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm"

async function main() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const repoRoot = path.resolve(__dirname, "..", "..")

  console.log("[integration] Building packages before test...")
  await runCommand(pnpmCmd, ["run", "build"], repoRoot)

  const dataDir = path.join(__dirname, ".workflow-data-integration")
  fs.rmSync(dataDir, { recursive: true, force: true })

  const port = process.env.TEST_WORKBENCH_PORT ?? "3030"
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: port,
    WORKFLOW_TARGET_WORLD: "embedded",
    WORKFLOW_EMBEDDED_DATA_DIR: dataDir,
  }

  console.log(`[integration] Starting Next.js dev server on port ${port}...`)
  const devServer = spawn(pnpmCmd, ["dev", "--", "--port", port], {
    cwd: __dirname,
    env,
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
  })

  let devOutput = ""
  const appendOutput = (chunk: Buffer) => {
    const text = chunk.toString()
    devOutput += text
    process.stdout.write(text)
  }
  devServer.stdout?.on("data", appendOutput)
  devServer.stderr?.on("data", appendOutput)

  try {
    await waitForServer(`http://localhost:${port}/api/test`)

    console.log("[integration] Server ready. Firing workflow run...")
    const payload = { context: { integration: true, timestamp: Date.now() } }
    const response = await fetch(`http://localhost:${port}/api/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`[integration] HTTP ${response.status}: ${JSON.stringify(result)}`)
    }
    if (!result.success) {
      throw new Error(`[integration] Workflow responded with failure: ${JSON.stringify(result)}`)
    }
    if (!result.result?.success) {
      throw new Error(`[integration] Unexpected workflow result payload: ${JSON.stringify(result)}`)
    }

    console.log("[integration] Workflow completed successfully:", result.result)
  } catch (error) {
    console.error("[integration] Error during integration test:\n", error)
    console.error("[integration] Dev server output:\n", devOutput)
    throw error
  } finally {
    await stopProcess(devServer)
    fs.rmSync(dataDir, { recursive: true, force: true })
  }

  console.log("[integration] Test completed ✅")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

async function runCommand(command: string, args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  })

    child.on("error", (err) => reject(err))
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

async function waitForServer(url: string, timeoutMs = 120000, intervalMs = 1000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch (error) {
      // Server not ready yet
    }
    await delay(intervalMs)
  }
  throw new Error(`[integration] Timeout waiting for server at ${url}`)
}

async function stopProcess(child: ChildProcess | null) {
  if (!child) return
  if (child.exitCode !== null) return

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"])
  } else {
    child.kill("SIGTERM")
  }

  try {
    await once(child, "exit")
  } catch {
    // ignore
  }
}

