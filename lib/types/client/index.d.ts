/**
 * Browser-half approval notifier for the DSH web GUI.
 *
 * It watches the session list snapshot for pending user interactions and
 * completed sessions. It emits a browser notification first, then falls back
 * to a right-bottom stacked toast panel if the browser notification cannot be shown.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
