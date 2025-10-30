import { test, expect } from "@playwright/test"

test.describe("Workbench Next.js", () => {
  test("ejecuta el workflow de módulos exponiendo el resultado", async ({ request }) => {
    const response = await request.post("/api/test")

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({ success: true })
    expect(body.result).toMatchObject({
      ok: true,
      workflow: "module:smoke",
      echo: "module-test",
      upper: "MODULE-TEST",
    })
  })

  test("ejecuta la story de prueba exponiendo el resultado", async ({ request }) => {
    const response = await request.post("/api/test-story", {
      data: { message: "test story message" }
    })

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({ success: true })
    expect(body.result).toMatchObject({
      contextId: expect.any(String),
      status: "completed"
    })
  })
})
