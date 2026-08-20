import type { PendingInteractionStatus, SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'

export type SessionListEntry = SessionSummary

export interface ApprovalDiff {
  messages: string[]
  nextSeen: Map<SessionId, PendingInteractionStatus | undefined>
}

function sessionLabel(entry: SessionListEntry): string {
  const title = entry.title?.trim()
  return title === undefined || title === '' ? entry.displayTitle : title
}

export function diffApprovalMessages(
  snapshot: SessionListState,
  previous: ReadonlyMap<SessionId, PendingInteractionStatus | undefined>,
): ApprovalDiff {
  const nextSeen = new Map<SessionId, PendingInteractionStatus | undefined>()
  const messages: string[] = []
  for (const sessionId of snapshot.ids) {
    const entry = snapshot.byId[sessionId]
    const current = entry.pendingInteraction
    const prior = previous.get(sessionId)
    nextSeen.set(sessionId, current)
    if (current === 'approval' && prior !== 'approval') {
      messages.push(`会话「${sessionLabel(entry)}」正在等待审批`)
    }
  }
  return { messages, nextSeen }
}
