// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import { apply, inject } from '../src/client/index.ts'
import { id, snapshot, statuses, status, summary } from './fixtures.ts'

function store<T>(initial: T) {
  let current = initial
  const listeners = new Set<() => void>()
  return { getSnapshot: () => current, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
    set(value: T) { current = value; for (const fn of listeners) fn() }, listeners }
}
function mount(initial = snapshot(), initialStatus: SessionStatusSnapshot = new Map()) {
  const list = store(initial); const sessionStatus = store(initialStatus)
  const disposers: Array<() => void> = []
  apply({ sessions: { list }, uiSession: { sessionStatus }, effect(fn: () => () => void) {
    const dispose = fn(); disposers.push(dispose); return dispose
  } } as unknown as Parameters<typeof apply>[0])
  return { list, sessionStatus, dispose() { for (const fn of disposers.splice(0)) fn() } }
}
function notifications(permission: NotificationPermission = 'granted', fail = false) {
  const calls: Array<{ title: string; options: NotificationOptions }> = []
  class Native {
    static permission = permission
    static requestPermission = vi.fn(async () => 'denied' as NotificationPermission)
    constructor(title: string, options: NotificationOptions) {
      if (fail) throw new Error('unsupported notification')
      calls.push({ title, options })
    }
  }
  vi.stubGlobal('Notification', Native)
  return { calls, Native }
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
const mounted: ReturnType<typeof mount>[] = []
function track(...args: Parameters<typeof mount>) { const m = mount(...args); mounted.push(m); return m }

beforeEach(() => { document.body.innerHTML = ''; vi.useFakeTimers() })
afterEach(() => {
  for (const m of mounted.splice(0)) m.dispose()
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''
})
describe('DSH 0.2 client integration', () => {
  it('injects public sessions and uiSession services', () => { expect(inject).toEqual(['sessions', 'uiSession']) })
  it.each(['approval', 'question', 'plan-review', 'completed'])('notifies %s from sessionStatus', async kind => {
    const { calls } = notifications()
    const m = track()
    m.sessionStatus.set(statuses(kind)); await flush()
    expect(calls).toHaveLength(1)
    expect(calls[0].options.requireInteraction).toBe(true)
    expect(calls[0].options.body).toContain('Alpha')
  })
  it('notifies retained subagents outside ids', async () => {
    const { calls } = notifications()
    const list = snapshot([summary('s1', 'Child', true)]); list.ids = []
    track(list, statuses('completed')); await flush()
    expect(calls[0].title).toBe('子代理已完成')
  })
  it('does not alert for idle historical rows', async () => {
    const { calls } = notifications()
    track(); await flush(); vi.advanceTimersByTime(3000); await flush()
    expect(calls).toHaveLength(0)
  })
  it('deduplicates repeated store updates and polling but allows new keys', async () => {
    const { calls } = notifications(); const m = track()
    m.sessionStatus.set(statuses('approval')); m.sessionStatus.set(statuses('approval'))
    vi.advanceTimersByTime(3000); await flush(); expect(calls).toHaveLength(1)
    m.sessionStatus.set(statuses('approval', 's1', 'next')); await flush(); expect(calls).toHaveLength(2)
  })
  it.each(['denied', 'default', 'missing', 'throws'])('stacks fallback toasts when native permission is %s', async mode => {
    if (mode !== 'missing') notifications(mode === 'default' ? 'default' : mode === 'denied' ? 'denied' : 'granted', mode === 'throws')
    else vi.stubGlobal('Notification', undefined)
    const m = track(snapshot([summary(), summary('s2', 'Beta')]))
    m.sessionStatus.set(new Map([[id('s1'), status('approval')], [id('s2'), status('question', 's2')]]))
    await flush()
    const root = document.getElementById('dsh-approval-toast-root')
    expect(root?.textContent).toContain('审批请求'); expect(root?.textContent).toContain('提问请求')
    expect(root?.children.length).toBeGreaterThanOrEqual(3)
  })
  it('shows toast immediately when the permission prompt never resolves', async () => {
    const { Native, calls } = notifications('default')
    Native.requestPermission.mockImplementation(() => new Promise(() => {}))
    const m = track(snapshot(), statuses('question'))
    await flush()
    expect(document.body.textContent).toContain('提问请求')
    expect(calls).toHaveLength(0)
    m.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('keeps native permission failures inside the fallback path', async () => {
    const { Native } = notifications('default')
    Native.requestPermission.mockImplementation(() => { throw new Error('not available') })
    track(snapshot(), statuses('approval')); await flush()
    expect(document.body.textContent).toContain('审批请求')
  })
  it('cleans listeners/timers and blocks late permission completion after disposal', async () => {
    const { Native, calls } = notifications('default')
    let finish!: (permission: NotificationPermission) => void
    Native.requestPermission.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const m = track(snapshot(), statuses('approval')); await flush(); m.dispose()
    finish('granted'); await flush()
    expect(m.list.listeners.size).toBe(0); expect(m.sessionStatus.listeners.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0); expect(calls).toHaveLength(0)
    expect(document.getElementById('dsh-approval-toast-root')).toBeNull()
  })
  it('isolates independent client contexts and preserves another context toasts on unload', async () => {
    notifications('denied')
    const first = track(snapshot(), statuses('approval'))
    const second = track(snapshot(), statuses('question'))
    await flush()
    first.dispose()
    expect(document.body.textContent).toContain('提问请求')
    expect(document.body.textContent).not.toContain('审批请求')
    second.sessionStatus.set(statuses('question', 's1', 'second')); await flush()
    expect(document.body.textContent?.match(/提问请求/g)).toHaveLength(2)
  })
  it('reactivates after disposal', async () => {
    const { calls } = notifications()
    const first = track(snapshot(), statuses('approval')); await flush(); first.dispose()
    track(snapshot(), statuses('question')); await flush()
    expect(calls.map(c => c.title)).toEqual(['审批请求', '提问请求'])
  })
})
