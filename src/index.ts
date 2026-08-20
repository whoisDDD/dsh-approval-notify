/**
 * Host half for the approval-notify plugin.
 *
 * This plugin is browser-only: the host half intentionally does nothing.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'approval-notify'
export const inject = [] as const

export function apply(_ctx: Context): void {
  // Browser-only plugin; no host wiring required.
}
