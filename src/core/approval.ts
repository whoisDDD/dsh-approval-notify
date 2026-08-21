import type { PendingInteractionStatus, SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'

export type SessionListEntry = SessionSummary
export type SessionAttentionStatus = PendingInteractionStatus | 'completed'

export interface ApprovalDiff {
  messages: string[]
  nextSeen: Map<SessionId, SessionAttentionStatus | undefined>
}

function sessionLabel(entry: SessionListEntry): string {
  const title = entry.title?.trim()
  return title === undefined || title === '' ? entry.displayTitle : title
}

function attentionStatusOf(entry: SessionListEntry): SessionAttentionStatus | undefined {
  if (entry.pendingInteraction !== undefined) return entry.pendingInteraction
  if (entry.completed === true) return 'completed'
  return undefined
}

function messageFor(entry: SessionListEntry, status: SessionAttentionStatus): string | undefined {
  const label = sessionLabel(entry)
  switch (status) {
    case 'approval':
      return `审批请求：会话「${label}」正在等待审批`
    case 'question':
      return `提问请求：会话「${label}」正在等待你的选择`
    case 'plan-review':
      return `计划审核：会话「${label}」正在等待确认`
    case 'completed':
      return `已完成：会话「${label}」已完成`
    default:
      return undefined
  }
}

export function diffApprovalMessages(
  snapshot: SessionListState,
  previous: ReadonlyMap<SessionId, SessionAttentionStatus | undefined>,
): ApprovalDiff {
  const nextSeen = new Map<SessionId, SessionAttentionStatus | undefined>()
  const messages: string[] = []
  for (const sessionId of snapshot.ids) {
    const entry = snapshot.byId[sessionId]
    const current = attentionStatusOf(entry)
    const prior = previous.get(sessionId)
    nextSeen.set(sessionId, current)
    if (current !== undefined && prior !== current) {
      const message = messageFor(entry, current)
      if (message !== undefined) messages.push(message)
    }
  }
  return { messages, nextSeen }
}
