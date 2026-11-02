import type { Context } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { UiSession, SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { UiWorkspace } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { diffApprovalMessages, type SessionAlert, type SessionAttentionMarker } from '../core/approval.ts'

type ApprovalNotifyContext = Context & {
  readonly sessions: ISessions
  readonly uiSession: UiSession
  readonly uiWorkspace: UiWorkspace
}

/**
 * Browser-half approval notifier for the DSH web GUI.
 *
 * DSH 0.2 exposes pending requests and unread background completion through
 * the unified uiSession.sessionStatus observable.
 */
const TOAST_ROOT_ID = 'dsh-approval-toast-root'
const TOAST_ITEM_CLASS = 'dsh-approval-toast'
const TOAST_LIFETIME_MS = 12_000
const BOOT_NOTICE = 'approval-notify 已加载'

/** Service names gate activation; package metadata only describes dependencies. */
export const inject = ['sessions', 'uiSession', 'uiWorkspace']

export function apply(ctx: ApprovalNotifyContext): void {
  let lastSeen = new Map<SessionId, SessionAttentionMarker | undefined>()
  let bootNoticeShown = false
  let permissionPrompt: Promise<NotificationPermission> | undefined
  const toastTimers = new Set<number>()
  const toasts = new Set<HTMLElement>()

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

  function createToast(title: string, body: string, onClick?: () => void): void {
    const root = ensureToastRoot()
    const el = document.createElement('div')
    el.className = TOAST_ITEM_CLASS
    if (onClick !== undefined) {
      el.setAttribute('role', 'button')
      el.tabIndex = 0
      el.addEventListener('click', onClick)
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      })
    }
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
      ...(onClick === undefined ? [] : ['cursor:pointer']),
    ].join(';')
    root.appendChild(el)
    toasts.add(el)
    console.info('[approval-notify] toast delivered:', title)
    setTimer(() => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(8px)'
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
      setTimer(() => {
        el.remove()
        toasts.delete(el)
        if (!root.hasChildNodes()) root.remove()
      }, 260)
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
    console.info('[approval-notify] loaded (session-navigation, event-driven)')
    createToast('通知已启用', BOOT_NOTICE)
  }

  async function resolveNotificationPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'denied'
    if (Notification.permission !== 'default') return Notification.permission
    if (permissionPrompt !== undefined) return permissionPrompt
    permissionPrompt = Promise.resolve().then(() => Notification.requestPermission())
      .catch(() => 'denied' as NotificationPermission)
      .finally(() => {
        permissionPrompt = undefined
      })
    return permissionPrompt
  }

  function openSession(sessionId: SessionId, active: () => boolean): void {
    if (!active()) return
    try { window.focus() } catch { /* Window activation is controlled by the platform. */ }
    try {
      ctx.uiWorkspace.openSession(sessionId)
      console.info('[approval-notify] session navigation requested')
    } catch (error) {
      console.warn('[approval-notify] unable to open session:', error)
    }
  }

  function notifyBrowser(alert: SessionAlert, active: () => boolean): boolean {
    // Permission prompts can remain pending indefinitely in embedded browsers.
    // Never hold an attention alert behind the prompt: use toast immediately.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !active()) return false
    try {
      const notification = new Notification(alert.title, {
        body: alert.body,
        requireInteraction: true,
      })
      notification.onclick = () => {
        if (active()) console.info('[approval-notify] native notification clicked')
        openSession(alert.sessionId, active)
        notification.close()
      }
      console.info('[approval-notify] native notification created:', alert.title)
      return true
    } catch {
      return false
    }
  }

  function renderAlert(alert: SessionAlert, active: () => boolean): void {
    if (!notifyBrowser(alert, active) && active()) {
      createToast(alert.title, alert.body, () => openSession(alert.sessionId, active))
    }
  }

  function runCheck(
    ctx: ApprovalNotifyContext,
    statuses: SessionStatusSnapshot,
    active: () => boolean,
  ): void {
    const { messages, nextSeen } = diffApprovalMessages(
      ctx.sessions.list.getSnapshot(),
      statuses,
      lastSeen,
    )
    lastSeen = nextSeen
    if (messages.length === 0 || !active()) return
    for (const message of messages) renderAlert(message, active)
  }

  ctx.effect(() => {
    let disposed = false
    const active = (): boolean => !disposed
    showBootNotice()
    void resolveNotificationPermission()
    const sync = (): void => {
      runCheck(ctx, ctx.uiSession.sessionStatus.getSnapshot(), active)
    }
    const unsubscribeSessions = ctx.sessions.list.subscribe(sync)
    const unsubscribePending = ctx.uiSession.sessionStatus.subscribe(sync)
    sync()
    return () => {
      disposed = true
      unsubscribeSessions()
      unsubscribePending()
      for (const item of toastTimers) window.clearTimeout(item)
      toastTimers.clear()
      lastSeen = new Map()
      bootNoticeShown = false
      permissionPrompt = undefined
      for (const toast of toasts) toast.remove()
      toasts.clear()
      const root = document.getElementById(TOAST_ROOT_ID)
      if (root !== null && !root.hasChildNodes()) root.remove()
    }
  }, 'approval-notify: watch sessions')
}

