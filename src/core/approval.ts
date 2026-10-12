import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatus, SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

export type SessionListEntry = SessionSummary
export type SessionAttentionStatus = 'approval' | 'question' | 'plan-review' | 'completed'
export type SessionAttentionMarker = string

/** Stable pending request fields from uiSession.sessionStatus. */
export interface PendingInteractionLike {
  readonly key: string
  readonly kind: string
  readonly sessionId: SessionId
}

export interface ApprovalDiff {
  messages: string[]
  nextSeen: Map<SessionId, SessionAttentionMarker | undefined>
}

function sessionLabel(entry: SessionListEntry): string {
  const title = entry.title?.trim()
  const label = title === undefined || title === '' ? entry.displayTitle : title
  return redactSensitiveText(label).slice(0, 160)
}

function redactSensitiveText(text: string): string {
  return text
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/gi, '[redacted-token]')
    .replace(/\b(?:sk|pat|ghp|glpat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/gi, '[redacted-token]')
    .replace(/\b(?:bearer|api[-_ ]?key|access[-_ ]?token|password|secret)\s*[:=]\s*\S+/gi, '[redacted-secret]')
}

function pendingStatusOf(interaction: PendingInteractionLike | undefined): SessionAttentionStatus | undefined {
  switch (interaction?.kind) {
    case 'approval':
    case 'question':
    case 'plan-review':
      return interaction.kind
    default:
      // New interaction domains must not be guessed into a misleading alert.
      return undefined
  }
}

function attentionStatusOf(
  state: SessionStatus | undefined,
): SessionAttentionStatus | undefined {
  if (state?.pendingInteraction !== undefined) return pendingStatusOf(state.pendingInteraction)
  return state?.completionUnread === true && state.running !== true ? 'completed' : undefined
}

function attentionMarkerOf(
  interaction: PendingInteractionLike | undefined,
  status: SessionAttentionStatus | undefined,
): SessionAttentionMarker | undefined {
  if (status === undefined) return undefined
  if (interaction !== undefined && pendingStatusOf(interaction) !== undefined) {
    return `${status}:${interaction.key}`
  }
  return status
}

function completedMessageFor(entry: SessionListEntry, label: string): string {
  if (entry.origin === 'subagent' || entry.parentId !== undefined) {
    return `子代理已完成：会话「${label}」已完成`
  }
  return `已完成：会话「${label}」已完成`
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
      return completedMessageFor(entry, label)
    default:
      return undefined
  }
}

export function diffApprovalMessages(
  snapshot: SessionListState,
  statuses: SessionStatusSnapshot,
  previous: ReadonlyMap<SessionId, SessionAttentionMarker | undefined>,
): ApprovalDiff {
  const nextSeen = new Map<SessionId, SessionAttentionMarker | undefined>()
  const messages: string[] = []
  // Retained child rows can live in byId without belonging to the Host catalog ids.
  for (const sessionId of Object.keys(snapshot.byId) as SessionId[]) {
    const entry = snapshot.byId[sessionId]
    const state = statuses.get(sessionId)
    const interaction = state?.pendingInteraction
    const status = attentionStatusOf(state)
    const current = attentionMarkerOf(interaction, status)
    const prior = previous.get(sessionId)
    nextSeen.set(sessionId, current)
    if (status !== undefined && current !== prior) {
      const message = messageFor(entry, status)
      if (message !== undefined) messages.push(message)
    }
  }
  return { messages, nextSeen }
}
