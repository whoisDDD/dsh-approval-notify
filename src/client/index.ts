/**
 * Browser-half approval notifier for the DSH web GUI.
 *
 * It watches the session list snapshot for pending user interactions and
 * completed sessions. It emits a browser notification first, then falls back
 * to a right-bottom stacked toast panel if the browser notification cannot be shown.
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { alertPartsOf } from '../core/alert.ts'
import { diffApprovalMessages, type SessionAttentionStatus } from '../core/approval.ts'

const TOAST_ROOT_ID = 'dsh-approval-toast-root'
const TOAST_ITEM_CLASS = 'dsh-approval-toast'
const TOAST_LIFETIME_MS = 12_000
const POLL_FALLBACK_MS = 1500
const BOOT_NOTICE = 'approval-notify 已加载'

let lastSeen = new Map<SessionId, SessionAttentionStatus | undefined>()
let bootNoticeShown = false
let permissionPrompt: Promise<NotificationPermission> | undefined
let toastTimers: number[] = []

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
  const timer = window.setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
    window.setTimeout(() => el.remove(), 260)
  }, TOAST_LIFETIME_MS)
  toastTimers.push(timer)
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
  permissionPrompt = Notification.requestPermission().finally(() => {
    permissionPrompt = undefined
  })
  return permissionPrompt
}

async function notifyBrowser(title: string, message: string): Promise<boolean> {
  const permission = await resolveNotificationPermission()
  if (permission !== 'granted') return false
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

async function renderAlert(message: string): Promise<void> {
  const { title, body } = alertPartsOf(message)
  const notified = await notifyBrowser(title, body)
  if (!notified) createToast(title, body)
}

function runCheck(ctx: ClientContext): void {
  const snapshot = ctx.sessions.list.getSnapshot()
  const { messages, nextSeen } = diffApprovalMessages(snapshot, lastSeen)
  lastSeen = nextSeen
  if (messages.length === 0) return
  for (const message of messages) void renderAlert(message)
}

export const inject = ['sessions']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    showBootNotice()
    void resolveNotificationPermission()
    const sync = (): void => { runCheck(ctx) }
    sync()
    const unsubscribe = ctx.sessions.list.subscribe(sync)
    const timer = window.setInterval(sync, POLL_FALLBACK_MS)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
      for (const item of toastTimers) window.clearTimeout(item)
      toastTimers = []
      lastSeen = new Map()
      bootNoticeShown = false
      permissionPrompt = undefined
      const root = document.getElementById(TOAST_ROOT_ID)
      root?.remove()
    }
  }, 'approval-notify: watch sessions')
}

