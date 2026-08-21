// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendingInteractionStatus, SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { apply } from '../src/client/index.ts'

function makeSummary(id: string, title: string, pendingInteraction?: PendingInteractionStatus, completed = false, subagent = false): SessionSummary {
  return {
    id: id as SessionId,
    displayTitle: title,
    title,
    running: false,
    blank: false,
    updatedAt: 1,
    pendingInteraction,
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

function makeSessions(initial: SessionListState) {
  const listeners = new Set<() => void>()
  let snapshot = initial
  return {
    list: {
      subscribe(listener: () => void) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      getSnapshot: () => snapshot,
    },
    set(next: SessionListState) {
      snapshot = next
      for (const listener of listeners) listener()
    },
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

function mountPlugin(initial: SessionListState) {
  const sessions = makeSessions(initial)
  const disposers: Array<() => void> = []
  const ctx = {
    sessions: { list: sessions.list },
    effect(fn: () => () => void) {
      const dispose = fn()
      disposers.push(dispose)
      return dispose
    },
  } as any
  apply(ctx)
  return {
    sessions,
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

  it('requests notification permission on mount when permission is default', async () => {
    const { requestCalls } = installNotificationMock({ permission: 'default', requestResult: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    await flushAsync()
    expect(requestCalls).toEqual(['request'])
    mounted.dispose()
  })

  it('creates a system notification for approval when permission is granted', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Alpha', 'approval')]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '审批请求',
      options: {
        body: '会话「Alpha」正在等待审批',
        requireInteraction: true,
      },
    })
    mounted.dispose()
  })

  it('creates a system notification for question with a distinct title', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Alpha', 'question')]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '提问请求',
      options: {
        body: '会话「Alpha」正在等待你的选择',
        requireInteraction: true,
      },
    })
    mounted.dispose()
  })

  it('creates a system notification for plan review with a distinct title', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Alpha', 'plan-review')]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '计划审核',
      options: {
        body: '会话「Alpha」正在等待确认',
        requireInteraction: true,
      },
    })
    mounted.dispose()
  })

  it('creates a system notification for completed sessions with a distinct title', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Alpha', undefined, true)]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '已完成',
      options: {
        body: '会话「Alpha」已完成',
        requireInteraction: true,
      },
    })
    mounted.dispose()
  })

  it('creates a system notification for completed subagents with a distinct title', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Visual Agent', undefined, true, true)]))
    await flushAsync()
    expect(createCalls).toContainEqual({
      title: '子代理已完成',
      options: {
        body: '会话「Visual Agent」已完成',
        requireInteraction: true,
      },
    })
    mounted.dispose()
  })

  it('falls back to a large stacked toast when notification creation fails', async () => {
    installNotificationMock({ permission: 'granted', throwOnCreate: true })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([makeSummary('s1', 'Alpha', 'question')]))
    await flushAsync()
    const root = document.getElementById('dsh-approval-toast-root')
    expect(root).not.toBeNull()
    expect(root?.style.flexDirection).toBe('column-reverse')
    expect(root?.textContent).toContain('提问请求')
    expect(root?.textContent).toContain('Alpha')
    mounted.dispose()
  })

  it('stacks multiple fallback toasts upward', async () => {
    installNotificationMock({ permission: 'denied' })
    const mounted = mountPlugin(makeSnapshot([]))
    mounted.sessions.set(makeSnapshot([
      makeSummary('s1', 'Alpha', 'approval'),
      makeSummary('s2', 'Beta', 'question'),
      makeSummary('s3', 'Gamma', 'plan-review'),
      makeSummary('s4', 'Delta', undefined, true),
      makeSummary('s5', 'Visual Agent', undefined, true, true),
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
    const mounted = mountPlugin(makeSnapshot([]))
    const pending = makeSnapshot([makeSummary('s1', 'Alpha', 'approval')])
    mounted.sessions.set(pending)
    mounted.sessions.set(pending)
    await flushAsync()
    const approvalCalls = createCalls.filter((call) => call.title === '审批请求')
    expect(approvalCalls).toHaveLength(1)
    mounted.dispose()
  })

  it('does not repeat a completed notification while completed remains unchanged', async () => {
    const { createCalls } = installNotificationMock({ permission: 'granted' })
    const mounted = mountPlugin(makeSnapshot([]))
    const completed = makeSnapshot([makeSummary('s1', 'Alpha', undefined, true)])
    mounted.sessions.set(completed)
    mounted.sessions.set(completed)
    await flushAsync()
    const completedCalls = createCalls.filter((call) => call.title === '已完成')
    expect(completedCalls).toHaveLength(1)
    mounted.dispose()
  })
})

