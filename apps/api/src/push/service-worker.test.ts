import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

async function harness() {
  const handlers = new Map<string, (event: unknown) => void>()
  const shown: { title: string; options: Record<string, unknown> }[] = []
  const source = await readFile(new URL('../../../../public/sw.js', import.meta.url), 'utf8')
  runInNewContext(source, {
    self: {
      addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
      registration: { showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({ title, options }) } },
    },
    Date, URL,
  })
  return { handlers, shown }
}

test('push displays with no open page or authenticated browser session for every role', async () => {
  const { handlers, shown } = await harness()
  for (const role of ['customer', 'sales_agent', 'rider', 'restaurant', 'admin']) {
    let completion: Promise<unknown> | undefined
    handlers.get('push')!({
      data: { json: () => ({ title: 'Important update', body: 'Background alert', role, notificationId: role }) },
      waitUntil: (promise: Promise<unknown>) => { completion = promise },
    })
    await completion
  }
  assert.equal(shown.length, 5)
  assert.match(shown[1].title, /Sales agent/)
})

test('expired messages received after reconnect do not flood the notification tray', async () => {
  const { handlers, shown } = await harness()
  handlers.get('push')!({
    data: { json: () => ({ title: 'Old reminder', expiresAt: '2020-01-01T00:00:00Z' }) },
    waitUntil: () => assert.fail('Expired push should not display'),
  })
  assert.equal(shown.length, 0)
})
