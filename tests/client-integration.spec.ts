// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { apply, inject } from '../src/client/index.ts'

function makeSummary(id: string, title: string, completed = false, subagent = false): SessionSummary {
  return {
    id: id as SessionId,
    displayTitle: title,
    title,
    running: false,
    blank: false,
    updatedAt: 1,
    completed,
    ...(subagent ? { origin: 'subagent' as const, parentId: 'parent' as SessionId } : {}),
  }
}

function makeSnapshot(summaries: SessionSummary[]): SessionListState {
  return {
    ids: summaries.map((summary) => summary.id),
    byId: Object.fromEntries(summaries.map((summary) => [summary.id, summary])) as Record<SessionId, SessionSummary>,
    current: summaries[0]?.id,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function makeStore<T>(initial: T) {
  const listeners = new Set<() => void>()
  let snapshot = initial
  return {
    store: {
      subscribe(listener: () => void) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      getSnapshot: () => snapshot,
    },
    set(next: T) {
      snapshot = next
      for (const listener of listeners) listener()
    },
    listenerCount: () => listeners.size,
  }
}

function makeSessions(initial: SessionListState) {
  const list = makeStore(initial)
  return {
    list: list.store,
    set: list.set,
    listenerCount: list.listenerCount,
  }
}

function makePending(initial: ReadonlyMap<SessionId, { key: string; kind: string; sessionId: SessionId }> = new Map()) {
  const pending = makeStore(initial)
  return {
    pendingInteractions: pending.store,
    set: pending.set,
    listenerCount: pending.listenerCount,
  }
}

function installNotificationMock(mode: {
  permission: NotificationPermission
  requestResult?: NotificationPermission
  throwOnCreate?: boolean
}) {
  const createCalls: Array<{ title: string; options: NotificationOptions }> = []
  const requestCalls: string[] = []
  class MockNotification {
    static permission: NotificationPermission = mode.permission
    static async requestPermission(): Promise<NotificationPermission> {
      requestCalls.push('request')
      const result = mode.requestResult ?? 'granted'
      MockNotification.permission = result
      return result
    }
    constructor(title: string, options: NotificationOptions) {
      if (mode.throwOnCreate === true) throw new Error('notification failed')
      createCalls.push({ title, options })
    }
  }
  ;(globalThis as typeof globalThis & { Notification?: typeof Notification }).Notification = MockNotification as unknown as typeof Notification
  return { createCalls, requestCalls }
}

function pending(kind: string, sessionId = 's1'): ReadonlyMap<SessionId, { key: string; kind: string; sessionId: SessionId }> {
  return new Map([[sessionId as SessionId, { key: `${kind}:1`, kind, sessionId: sessionId as SessionId }]])
}

function mountPlugin(initial: SessionListState, initialPending = new Map<SessionId, { key: string; kind: string; sessionId: SessionId }>()) {
  const sessions = makeSessions(initial)
  const uiSession = makePending(initialPending)
  const disposers: Array<() => void> = []
  const ctx = {
    sessions: { list: sessions.list },
    uiSession: { pendingInteractions: uiSession.pendingInteractions },
    effect(fn: () => () => void) {
      const dispose = fn()
      disposers.push(dispose)
      return dispose
    },
  } as any
  apply(ctx)
  return {
    sessions,
    uiSession,
    dispose() {
      for (const dispose of disposers) dispose()
    },
  }
}

async function flushAsync(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('approval-notify browser integration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    delete (globalThis as { Notification?: typeof Notification }).Notification
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('declares the alpha.2 services used by the client half', () => {
    expect(inject).toEqual(['sessions', 'uiSession'])
  })

  it('requests notification permission on mount when permission is default', async () => {
    const { requestCalls } = installNotificationMock({ permission: 'default', requestResult: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    await flushAsync()
    expect(requestCalls).toEqual(['request'])
    mounted.dispose()
  })

  it.each([
    ['approval', '审批请求', '会话「Alpha」正在等待审批'],
    ['question', '提问请求', '会话「Alpha」正在等待你的选择'],
    ['plan-review', '计划审核', '会话「Alpha」正在等待确认'],
  ] as const)('creates a system notification for alpha.2 %s interaction', async (kind: 'approval' | 'question' | 'plan-review', title: string, body: string) => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([makeSummary('s1', 'Alpha')]))
    mounted.uiSession.set(pending(kind))
    await flushAsync()
    expect(createCalls).toContainEqual({ title, options: { body, requireInteraction: true } })
    mounted.dispose()
  })

  it('creates a system notification for completed sessions', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Alpha', true)]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '已完成',
      options: { body: '会话「Alpha」已完成', requireInteraction: true },
    })
    mounted.dispose()
  })

  it('creates a system notification for completed subagents with a distinct title', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Visual Agent', true, true)]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '子代理已完成',
      options: { body: '会话「Visual Agent」已完成', requireInteraction: true },
    })
    mounted.dispose()
  })

  it('falls back to a large stacked toast when notification is unavailable', async () => {
    installNotificationMock({ permission: 'denied' })
    const mounted = mountPlugin(makeSnapshot([makeSummary('s1', 'Alpha')]))
    mounted.uiSession.set(pending('question'))
    await flushAsync()
    const root = document.getElementById('dsh-approval-toast-root')
    expect(root).not.toBeNull()
    expect(root?.style.flexDirection).toBe('column-reverse')
    expect(root?.textContent).toContain('提问请求')
    expect(root?.textContent).toContain('Alpha')
    mounted.dispose()
  })

  it('falls back to toast when permission request is unavailable', async () => {
    installNotificationMock({ permission: 'default', requestResult: 'denied' })
    const mounted = mountPlugin(makeSnapshot([makeSummary('s1', 'Alpha')]))
    mounted.uiSession.set(pending('approval'))
    await flushAsync()
    expect(document.getElementById('dsh-approval-toast-root')?.textContent).toContain('审批请求')
    mounted.dispose()
  })


  it('stacks multiple fallback toasts upward', async () => {
    installNotificationMock({ permission: 'denied' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([
      makeSummary('s1', 'Alpha'),
      makeSummary('s2', 'Beta'),
      makeSummary('s3', 'Gamma'),
      makeSummary('s4', 'Delta', true),
      makeSummary('s5', 'Visual Agent', true, true),
    ]))
    mounted.uiSession.set(new Map([
      ...pending('approval', 's1'),
      ...pending('question', 's2'),
      ...pending('plan-review', 's3'),
    ]))
    await flushAsync()
    const root = document.getElementById('dsh-approval-toast-root')
    expect(root?.children.length).toBeGreaterThanOrEqual(5)
    expect(root?.textContent).toContain('审批请求')
    expect(root?.textContent).toContain('提问请求')
    expect(root?.textContent).toContain('计划审核')
    expect(root?.textContent).toContain('已完成')
    expect(root?.textContent).toContain('子代理已完成')
    mounted.dispose()
  })

  it('does not repeat a notification while the same pending state remains unchanged', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([makeSummary('s1', 'Alpha')]))
    const pendingState = pending('approval')
    mounted.uiSession.set(pendingState)
    mounted.uiSession.set(pendingState)
    await flushAsync()
    expect(createCalls.filter((call) => call.title === '审批请求')).toHaveLength(1)
    mounted.dispose()
  })

  it('does not repeat a completed notification while completed remains unchanged', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    const completed = makeSnapshot([makeSummary('s1', 'Alpha', true)])
    mounted.sessions.set(completed)
    mounted.sessions.set(completed)
    await flushAsync()
    expect(createCalls.filter((call) => call.title === '已完成')).toHaveLength(1)
    mounted.dispose()
  })

  it('removes both subscriptions and prevents late async fallback after disposal', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([makeSummary('s1', 'Alpha')]))
    mounted.dispose()
    expect(mounted.sessions.listenerCount()).toBe(0)
    expect(mounted.uiSession.listenerCount()).toBe(0)
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Late', true)]))
    mounted.uiSession.set(pending('approval'))
    await flushAsync()
    expect(createCalls.filter((call) => call.title !== '通知已启用')).toHaveLength(0)
    expect(document.getElementById('dsh-approval-toast-root')).toBeNull()
  })
})
