import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatus, SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

export const id = (value: string): SessionId => value as SessionId
export function summary(value = 's1', title = 'Alpha', child = false): SessionSummary {
  return { id: id(value), title, displayTitle: title, running: false, blank: false,
    retainedBy: {}, updatedAt: 1, ...(child ? { origin: 'subagent', parentId: id('parent') } : {}) }
}
export function snapshot(rows: SessionSummary[] = [summary()]): SessionListState {
  return { ids: rows.map(row => row.id), byId: Object.fromEntries(rows.map(row => [row.id, row])),
    phase: 'ready', projectionsBySession: {} }
}
export function status(kind?: string, value = 's1', key = `${kind}:1`): SessionStatus {
  return { running: false, completionUnread: kind === 'completed',
    pendingInteraction: kind === undefined || kind === 'completed' ? undefined
      : { kind, key, sessionId: id(value) } }
}
export function statuses(kind?: string, value = 's1', key?: string): SessionStatusSnapshot {
  return new Map([[id(value), status(kind, value, key)]])
}
