import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { UiSession } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { alertPartsOf } from '../core/alert.ts'
import { diffApprovalMessages, type PendingInteractionLike, type SessionAttentionMarker, type SessionAttentionStatus } from '../core/approval.ts'

type ApprovalNotifyContext = Context & {
  readonly sessions: ISessions
  readonly uiSession: UiSession
}

/**
 * Browser-half approval notifier for the DSH web GUI.
 *
 * Alpha.2 keeps completed state on the session list, while pending approval,
 * question, and plan-review state is exposed by uiSession.pendingInteractions.
 */
const TOAST_ROOT_ID = 'dsh-approval-toast-root'
const TOAST_ITEM_CLASS = 'dsh-approval-toast'
const TOAST_LIFETIME_MS = 12_000
const POLL_FALLBACK_MS = 1500
const BOOT_NOTICE = 'approval-notify 已加载'

let lastSeen = new Map<SessionId, SessionAttentionMarker | undefined>()
let bootNoticeShown = false
let permissionPrompt: Promise<NotificationPermission> | undefined
let toastTimers = new Set<number>()

function ensureToastRoot(): HTMLElement {
  let root = document.getElementById(TOAST_ROOT_ID)
  if (root !== null) return root
  root = document.createElement('div')
  root.id = TOAST_ROOT_ID
  root.style.cssText = [
    'position:fixed',
    'right:24px',
    'bottom:24px',
    'display:flex',
    'flex-direction:column-reverse',
    'align-items:flex-end',
    'gap:12px',
    'z-index:2147483646',
    'max-width:min(420px, calc(100vw - 48px))',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(root)
  return root
}

function setTimer(callback: () => void, delay: number): number {
  const timer = window.setTimeout(() => {
    toastTimers.delete(timer)
    callback()
  }, delay)
  toastTimers.add(timer)
  return timer
}

function createToast(title: string, body: string): void {
  const root = ensureToastRoot()
  const el = document.createElement('div')
  el.className = TOAST_ITEM_CLASS
  el.innerHTML = `
    <div style="font-size:13px;font-weight:700;line-height:1.4;margin-bottom:6px;color:#ffd15c">${escapeHtml(title)}</div>
    <div style="font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:#f5f7fb">${escapeHtml(body)}</div>
  `
  el.style.cssText = [
    'min-width:280px',
    'max-width:420px',
    'padding:14px 16px',
    'border-radius:14px',
    'background:rgba(24, 28, 36, 0.96)',
    'color:#f5f7fb',
    'border:1px solid rgba(255,255,255,0.12)',
    'box-shadow:0 12px 34px rgba(0, 0, 0, 0.38)',
    'backdrop-filter:blur(8px)',
    'pointer-events:auto',
  ].join(';')
  root.appendChild(el)
  setTimer(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
    setTimer(() => el.remove(), 260)
  }, TOAST_LIFETIME_MS)
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function showBootNotice(): void {
  if (bootNoticeShown) return
  bootNoticeShown = true
  console.info('[approval-notify] loaded')
  createToast('通知已启用', BOOT_NOTICE)
}

async function resolveNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  if (permissionPrompt !== undefined) return permissionPrompt
  permissionPrompt = Notification.requestPermission()
    .catch(() => 'denied' as NotificationPermission)
    .finally(() => {
      permissionPrompt = undefined
    })
  return permissionPrompt
}

async function notifyBrowser(title: string, message: string, active: () => boolean): Promise<boolean> {
  if (await resolveNotificationPermission() !== 'granted' || !active()) return false
  try {
    new Notification(title, {
      body: message,
      requireInteraction: true,
    })
    return true
  } catch {
    return false
  }
}

async function renderAlert(message: string, active: () => boolean): Promise<void> {
  const { title, body } = alertPartsOf(message)
  const notified = await notifyBrowser(title, body, active)
  if (!notified && active()) createToast(title, body)
}

function runCheck(
  ctx: ApprovalNotifyContext,
  pendingInteractions: ReadonlyMap<SessionId, PendingInteractionLike>,
  active: () => boolean,
): void {
  const { messages, nextSeen } = diffApprovalMessages(
    ctx.sessions.list.getSnapshot(),
    pendingInteractions,
    lastSeen,
  )
  lastSeen = nextSeen
  if (messages.length === 0 || !active()) return
  for (const message of messages) void renderAlert(message, active)
}

/** Services provided by alpha.2's Session Controller and UI Session plugins. */
export const inject = ['sessions', 'uiSession']

export function apply(ctx: ApprovalNotifyContext): void {
  ctx.effect(() => {
    let disposed = false
    const active = (): boolean => !disposed
    showBootNotice()
    void resolveNotificationPermission()
    const sync = (): void => {
      runCheck(ctx, ctx.uiSession.pendingInteractions.getSnapshot(), active)
    }
    sync()
    const unsubscribeSessions = ctx.sessions.list.subscribe(sync)
    const unsubscribePending = ctx.uiSession.pendingInteractions.subscribe(sync)
    const timer = window.setInterval(sync, POLL_FALLBACK_MS)
    return () => {
      disposed = true
      unsubscribeSessions()
      unsubscribePending()
      window.clearInterval(timer)
      for (const item of toastTimers) window.clearTimeout(item)
      toastTimers.clear()
      lastSeen = new Map()
      bootNoticeShown = false
      permissionPrompt = undefined
      document.getElementById(TOAST_ROOT_ID)?.remove()
    }
  }, 'approval-notify: watch sessions')
}
