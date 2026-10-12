// @vitest-environment jsdom
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { expect, it, vi } from 'vitest'
import type { UiSession } from '@deepseek-ai/dsh-client-ui-session/client'
import type { apply } from '../src/client/index.ts'
import { id, snapshot, summary } from './fixtures.ts'

const require = createRequire(import.meta.url)
function load<T>(path: string | URL): T {
  let factory!: (require: NodeRequire) => T
  vm.runInNewContext(readFileSync(path, 'utf8'), {
    console, document, Notification: undefined,
    window: { setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
      setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window),
      __ModuleLoader__: { load(row: { factory: typeof factory }) { factory = row.factory } } },
  })
  return factory(require)
}

it('runs the shipped notifier against published DSH UiSession pending domains and remote completion', async () => {
  vi.useFakeTimers()
  const { Context } = require('@deepseek-ai/cordis') as typeof import('@deepseek-ai/cordis')
  const ctx = new Context()
  const listeners = new Set<() => void>()
  const remoteEvents = new Map<string, (sessionId: string, running: boolean) => void>()
  const list = snapshot([summary(), summary('child', 'Child', true)])
  list.ids = [id('s1')]
  const sessions = { list: { getSnapshot: () => list, subscribe(fn: () => void) {
    listeners.add(fn); return () => { listeners.delete(fn) }
  } } }
  ctx.provide('remote', { $on(name: string, fn: (sessionId: string, running: boolean) => void) {
    remoteEvents.set(name, fn); return () => { remoteEvents.delete(name) }
  } })
  ctx.provide('sessions', sessions)
  try {
    const published = load<{ UiSession: typeof UiSession }>(require.resolve('@deepseek-ai/dsh-client-ui-session/client'))
    const ui = new published.UiSession(ctx, sessions as unknown as ConstructorParameters<typeof UiSession>[1])
    const notifier = load<{ apply: typeof apply; inject: string[] }>(require.resolve('../lib/client.js'))
    const plugin = ctx.plugin(notifier)
    await plugin
    expect(document.body.textContent).toContain('通知已启用')
    const publish = ui.registerPendingInteraction(() => 1)
    for (const kind of ['approval', 'question', 'plan-review']) {
      const remove = publish({ key: kind, kind, sessionId: id('s1') }, async () => {})
      for (let i = 0; i < 10; i++) await Promise.resolve()
      expect(document.body.textContent).toContain({ approval: '审批请求', question: '提问请求', 'plan-review': '计划审核' }[kind])
      remove()
    }
    const running = remoteEvents.get('api-session/status')!
    running('child', true); running('child', false)
    for (let i = 0; i < 10; i++) await Promise.resolve()
    expect(document.body.textContent).toContain('子代理已完成')
    await plugin.dispose()
    expect(document.getElementById('dsh-approval-toast-root')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    await ctx.fiber.dispose()
    expect(listeners.size).toBe(0)
    expect(remoteEvents.size).toBe(0)
  } finally {
    await ctx.fiber.dispose()
    vi.useRealTimers()
    document.body.innerHTML = ''
  }
})
