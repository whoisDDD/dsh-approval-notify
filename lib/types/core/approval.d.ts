import type { PendingInteractionStatus, SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client';
export type SessionListEntry = SessionSummary;
export type SessionAttentionStatus = PendingInteractionStatus | 'completed';
export interface ApprovalDiff {
    messages: string[];
    nextSeen: Map<SessionId, SessionAttentionStatus | undefined>;
}
export declare function diffApprovalMessages(snapshot: SessionListState, previous: ReadonlyMap<SessionId, SessionAttentionStatus | undefined>): ApprovalDiff;
