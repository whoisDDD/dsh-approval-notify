import type { Context } from '@deepseek-ai/cordis';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { UiSession } from '@deepseek-ai/dsh-client-ui-session/client';
import type { UiWorkspace } from '@deepseek-ai/dsh-client-ui-workspace/client';
type ApprovalNotifyContext = Context & {
    readonly sessions: ISessions;
    readonly uiSession: UiSession;
    readonly uiWorkspace: UiWorkspace;
};
/** Service names gate activation; package metadata only describes dependencies. */
export declare const inject: string[];
export declare function apply(ctx: ApprovalNotifyContext): void;
export {};
