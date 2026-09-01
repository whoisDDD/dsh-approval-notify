import type { Context } from '@deepseek-ai/cordis';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { UiSession } from '@deepseek-ai/dsh-client-ui-session/client';
type ApprovalNotifyContext = Context & {
    readonly sessions: ISessions;
    readonly uiSession: UiSession;
};
/** Services provided by alpha.2's Session Controller and UI Session plugins. */
export declare const inject: string[];
export declare function apply(ctx: ApprovalNotifyContext): void;
export {};
