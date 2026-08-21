import { describe, expect, it } from 'vitest'
import type { PendingInteractionStatus, SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { diffApprovalMessages } from '../src/core/approval.ts'

function makeSnapshot(pendingInteraction?: PendingInteractionStatus): SessionListState {
  const sessionId = 's1' as SessionId
  const summary: SessionSummary = {
    id: sessionId,
    displayTitle: 'Alpha',
    title: 'Alpha',
    running: false,
    blank: false,
    updatedAt: 1,
    pendingInteraction,
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

describe('approval-notify', () => {
  it('emits one message on approval edge', () => {
    const first = diffApprovalMessages(makeSnapshot('approval'), new Map())
    expect(first.messages).toEqual(['审批请求：会话「Alpha」正在等待审批'])

    const second = diffApprovalMessages(makeSnapshot('approval'), first.nextSeen)
    expect(second.messages).toEqual([])
  })
})

