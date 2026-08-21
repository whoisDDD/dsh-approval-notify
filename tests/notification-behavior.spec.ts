import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { PendingInteractionStatus, SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { deliverAlert, alertPartsOf } from '../src/core/alert.ts'
import { diffApprovalMessages, type SessionAttentionStatus } from '../src/core/approval.ts'

function makeSnapshot(pendingInteraction?: PendingInteractionStatus, completed = false): SessionListState {
  const sessionId = 's1' as SessionId
  const summary: SessionSummary = {
    id: sessionId,
    displayTitle: 'Alpha',
    title: 'Alpha',
    running: false,
    blank: false,
    updatedAt: 1,
    pendingInteraction,
    completed,
  }
  return {
    ids: [sessionId],
    byId: { [sessionId]: summary },
    current: sessionId,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
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
  it('formats approval, question, plan-review, and completed messages', () => {
    const approval = diffApprovalMessages(makeSnapshot('approval'), new Map())
    const question = diffApprovalMessages(makeSnapshot('question'), new Map())
    const review = diffApprovalMessages(makeSnapshot('plan-review'), new Map())
    const done = diffApprovalMessages(makeSnapshot(undefined, true), new Map<SessionId, SessionAttentionStatus | undefined>())

    expect(approval.messages).toEqual(['审批请求：会话「Alpha」正在等待审批'])
    expect(question.messages).toEqual(['提问请求：会话「Alpha」正在等待你的选择'])
    expect(review.messages).toEqual(['计划审核：会话「Alpha」正在等待确认'])
    expect(done.messages).toEqual(['已完成：会话「Alpha」已完成'])
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


