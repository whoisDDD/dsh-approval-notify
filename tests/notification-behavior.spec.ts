import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { deliverAlert, alertPartsOf } from '../src/core/alert.ts'
import { diffApprovalMessages, type PendingInteractionLike, type SessionAttentionStatus } from '../src/core/approval.ts'

function makeSummary(options: {
  title?: string
  displayTitle?: string
  completed?: boolean
  subagent?: boolean
  cwd?: string
} = {}): SessionSummary {
  const sessionId = 's1' as SessionId
  return {
    id: sessionId,
    displayTitle: options.displayTitle ?? 'Alpha',
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    running: false,
    blank: false,
    updatedAt: 1,
    ...(options.completed === undefined ? {} : { completed: options.completed }),
    ...(options.subagent ? { origin: 'subagent' as const, parentId: 'parent' as SessionId } : {}),
  }
}

function makeSnapshot(summary = makeSummary()): SessionListState {
  return {
    ids: [summary.id],
    byId: { [summary.id]: summary },
    current: summary.id,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function pending(kind: string): ReadonlyMap<SessionId, PendingInteractionLike> {
  return new Map([[('s1' as SessionId), { key: `${kind}:1`, kind, sessionId: 's1' as SessionId }]])
}

function makeNotifyRecorder(permission: 'granted' | 'denied' | 'default') {
  const calls: Array<{ title: string; body: string }> = []
  const notify = (title: string, body: string): boolean => {
    if (permission !== 'granted') return false
    calls.push({ title, body })
    return true
  }
  const toast = vi.fn<(title: string, body: string) => void>()
  return { calls, notify, toast }
}

describe('approval-notify core', () => {
  it('formats alpha.2 pending interaction kinds and completed messages', () => {
    const approval = diffApprovalMessages(makeSnapshot(), pending('approval'), new Map())
    const question = diffApprovalMessages(makeSnapshot(), pending('question'), new Map())
    const review = diffApprovalMessages(makeSnapshot(), pending('plan-review'), new Map())
    const done = diffApprovalMessages(makeSnapshot(makeSummary({ completed: true })), new Map(), new Map<SessionId, SessionAttentionStatus | undefined>())
    const subagentDone = diffApprovalMessages(makeSnapshot(makeSummary({ completed: true, subagent: true })), new Map(), new Map<SessionId, SessionAttentionStatus | undefined>())

    expect(approval.messages).toEqual(['审批请求：会话「Alpha」正在等待审批'])
    expect(question.messages).toEqual(['提问请求：会话「Alpha」正在等待你的选择'])
    expect(review.messages).toEqual(['计划审核：会话「Alpha」正在等待确认'])
    expect(done.messages).toEqual(['已完成：会话「Alpha」已完成'])
    expect(subagentDone.messages).toEqual(['子代理已完成：会话「Alpha」已完成'])
  })

  it('ignores unknown pending interaction kinds safely', () => {
    const result = diffApprovalMessages(makeSnapshot(), pending('future-interaction'), new Map())
    expect(result.messages).toEqual([])
    expect(result.nextSeen.get('s1' as SessionId)).toBeUndefined()
  })

  it('prefers a known pending interaction over completed state', () => {
    const result = diffApprovalMessages(makeSnapshot(makeSummary({ completed: true })), pending('approval'), new Map())
    expect(result.messages).toEqual(['审批请求：会话「Alpha」正在等待审批'])
  })

  it('does not include unrelated sensitive summary fields in notification text', () => {
    const result = diffApprovalMessages(makeSnapshot(makeSummary({
      cwd: 'C:\\private\\sk-live-api-key-and-pat',
      completed: true,
    })), new Map(), new Map())
    expect(result.messages).toEqual(['已完成：会话「Alpha」已完成'])
    expect(result.messages.join(' ')).not.toContain('sk-live-api-key-and-pat')
  })

  it('redacts common token-shaped content from the session label', () => {
    const result = diffApprovalMessages(makeSnapshot(makeSummary({
      title: 'Deploy bearer: sk-live-abcdefghijklmnop',
      completed: true,
    })), new Map(), new Map())
    expect(result.messages).toEqual(['已完成：会话「Deploy [redacted-secret]」已完成'])
    expect(result.messages.join(' ')).not.toContain('sk-live-abcdefghijklmnop')
  })

  it('does not repeat a new pending request with the same kind but a new alpha.2 key', () => {
    const first = pending('approval')
    const next = new Map([[('s1' as SessionId), { key: 'approval:2', kind: 'approval', sessionId: 's1' as SessionId }]])
    const firstResult = diffApprovalMessages(makeSnapshot(), first, new Map())
    const nextResult = diffApprovalMessages(makeSnapshot(), next, firstResult.nextSeen)
    expect(nextResult.messages).toEqual(['审批请求：会话「Alpha」正在等待审批'])
  })
  it('uses displayTitle when the durable title is blank', () => {
    const result = diffApprovalMessages(makeSnapshot(makeSummary({ title: '   ', displayTitle: 'Workspace' })), pending('question'), new Map())
    expect(result.messages).toEqual(['提问请求：会话「Workspace」正在等待你的选择'])
  })

  it('splits alert messages into title and body', () => {
    expect(alertPartsOf('审批请求：会话「Alpha」正在等待审批')).toEqual({
      title: '审批请求',
      body: '会话「Alpha」正在等待审批',
    })
  })

  it('prefers notification and skips toast when granted', () => {
    const { calls, notify, toast } = makeNotifyRecorder('granted')
    deliverAlert('审批请求：会话「Alpha」正在等待审批', notify, toast)
    expect(calls).toEqual([{ title: '审批请求', body: '会话「Alpha」正在等待审批' }])
    expect(toast).not.toHaveBeenCalled()
  })

  it('falls back to toast when notification is unavailable', () => {
    const { calls, notify, toast } = makeNotifyRecorder('denied')
    deliverAlert('提问请求：会话「Alpha」正在等待你的选择', notify, toast)
    expect(calls).toEqual([])
    expect(toast).toHaveBeenCalledWith('提问请求', '会话「Alpha」正在等待你的选择')
  })
})

describe('approval-notify notification mode', () => {
  beforeEach(() => {
    ;(globalThis as typeof globalThis & { Notification?: any }).Notification = class FakeNotification {
      static permission: NotificationPermission = 'default'
      static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
      constructor(public title: string, public options: NotificationOptions) {}
    } as unknown as typeof Notification
  })

  afterEach(() => {
    delete (globalThis as typeof globalThis & { Notification?: any }).Notification
    vi.restoreAllMocks()
  })

  it('prompts for permission when default and then creates a notification', async () => {
    const permissionRequest = vi.fn(async () => 'granted' as NotificationPermission)
    const created = vi.fn()
    ;(globalThis as typeof globalThis & { Notification: any }).Notification = class {
      static permission: NotificationPermission = 'default'
      static requestPermission = permissionRequest
      constructor(title: string, options: NotificationOptions) {
        created(title, options)
      }
    }

    const notifyBrowser = async (title: string, body: string): Promise<boolean> => {
      const NotificationCtor = globalThis.Notification as unknown as {
        permission: NotificationPermission
        requestPermission: () => Promise<NotificationPermission>
      }
      if (NotificationCtor.permission === 'default') {
        await NotificationCtor.requestPermission()
        NotificationCtor.permission = 'granted'
      }
      if (NotificationCtor.permission !== 'granted') return false
      new (globalThis.Notification as unknown as { new (title: string, options: NotificationOptions): Notification })(title, {
        body,
        requireInteraction: true,
      })
      return true
    }

    const notified = await notifyBrowser('审批请求', '会话「Alpha」正在等待审批')
    expect(permissionRequest).toHaveBeenCalled()
    expect(created).toHaveBeenCalledWith('审批请求', {
      body: '会话「Alpha」正在等待审批',
      requireInteraction: true,
    })
    expect(notified).toBe(true)
  })
})
