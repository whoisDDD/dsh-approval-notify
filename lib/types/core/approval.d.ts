import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
export type SessionListEntry = SessionSummary;
export type SessionAttentionStatus = 'approval' | 'question' | 'plan-review' | 'completed';
export type SessionAttentionMarker = string;
/** Stable pending request fields from uiSession.sessionStatus. */
export interface PendingInteractionLike {
    readonly key: string;
    readonly kind: string;
    readonly sessionId: SessionId;
}
export interface ApprovalDiff {
    messages: string[];
    nextSeen: Map<SessionId, SessionAttentionMarker | undefined>;
}
export declare function diffApprovalMessages(snapshot: SessionListState, statuses: SessionStatusSnapshot, previous: ReadonlyMap<SessionId, SessionAttentionMarker | undefined>): ApprovalDiff;
