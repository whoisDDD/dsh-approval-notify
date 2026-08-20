/**
 * Browser-half approval notifier for the DSH web GUI.
 *
 * It watches the session list snapshot for new approval requests and emits a
 * right-bottom toast, plus a browser notification when permission exists.
 */
import type { ClientContext, PendingInteractionStatus, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { diffApprovalMessages } from '../core/approval.ts'

const TOAST_CLASS = 'dsh-approval-toast'
const TOAST_GAP_MS = 2200
const POLL_FALLBACK_MS = 1500

let lastSeen = new Map<SessionId, PendingInteractionStatus | undefined>()
let autoHideTimer: number | undefined

function showToast(message: string): void {
  const existing = document.querySelector<HTMLElement>(`.${TOAST_CLASS}`)
  if (existing !== null) existing.remove()
  const el = document.createElement('div')
  el.className = TOAST_CLASS
  el.textContent = message
  el.style.cssText = [
    'position:fixed',
    'right:24px',
    'bottom:24px',
    'z-index:2147483647',
    'max-width:320px',
    'padding:10px 14px',
    'border-radius:10px',
    'background:#1d2330',
    'color:#f5f7fb',
    'font:13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    'box-shadow:0 8px 26px rgba(0, 0, 0, 0.28)',
    'border:1px solid rgba(255,255,255,0.08)',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';')
  document.body.appendChild(el)
  window.clearTimeout(autoHideTimer)
  autoHideTimer = window.setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(6px)'
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
    window.setTimeout(() => el.remove(), 240)
  }, TOAST_GAP_MS)
}

function maybeNotify(message: string): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  new Notification('DSH 需要审批', { body: message })
}

function runCheck(ctx: ClientContext): void {
  const snapshot = ctx.sessions.list.getSnapshot()
  const { messages, nextSeen } = diffApprovalMessages(snapshot, lastSeen)
  lastSeen = nextSeen
  if (messages.length === 0) return
  const body = messages.join('\n')
  showToast(body)
  maybeNotify(body)
}

export const inject = ['sessions']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const sync = (): void => { runCheck(ctx) }
    sync()
    const unsubscribe = ctx.sessions.list.subscribe(sync)
    const timer = window.setInterval(sync, POLL_FALLBACK_MS)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
      window.clearTimeout(autoHideTimer)
      lastSeen = new Map()
    }
  }, 'approval-notify: watch sessions')
}
