import { describe, expect, it, vi } from 'vitest'
import { alertPartsOf, deliverAlert } from '../src/core/alert.ts'
import { diffApprovalMessages } from '../src/core/approval.ts'
import { id, snapshot, statuses, status, summary } from './fixtures.ts'

describe('unified DSH session status', () => {
  it.each([
    ['approval', '审批请求：会话「Alpha」正在等待审批'],
    ['question', '提问请求：会话「Alpha」正在等待你的选择'],
    ['plan-review', '计划审核：会话「Alpha」正在等待确认'],
    ['completed', '已完成：会话「Alpha」已完成'],
  ])('formats %s', (kind, expected) => {
    expect(diffApprovalMessages(snapshot(), statuses(kind), new Map()).messages).toEqual([expected])
  })
  it('labels retained subagents outside catalog ids', () => {
    const list = snapshot([summary('s1', 'Child', true)])
    list.ids = []
    expect(diffApprovalMessages(list, statuses('completed'), new Map()).messages)
      .toEqual(['子代理已完成：会话「Child」已完成'])
  })
  it('ignores idle historic sessions, even with a legacy completed field', () => {
    const row = { ...summary(), completed: true }
    expect(diffApprovalMessages(snapshot([row]), statuses(), new Map()).messages).toEqual([])
  })
  it('does not invent completion while running or for an unknown pending domain', () => {
    for (const state of [
      { ...status('completed'), running: true },
      { ...status('future'), completionUnread: true },
    ]) expect(diffApprovalMessages(snapshot(), new Map([[id('s1'), state]]), new Map()).messages).toEqual([])
  })
  it('prefers known pending requests over completionUnread', () => {
    expect(diffApprovalMessages(snapshot(), new Map([[id('s1'), { ...status('approval'), completionUnread: true }]]), new Map()).messages)
      .toEqual(['审批请求：会话「Alpha」正在等待审批'])
  })
  it('deduplicates unchanged requests and notifies replacements with new keys', () => {
    const first = diffApprovalMessages(snapshot(), statuses('approval'), new Map())
    expect(diffApprovalMessages(snapshot(), statuses('approval'), first.nextSeen).messages).toEqual([])
    expect(diffApprovalMessages(snapshot(), statuses('approval', 's1', 'approval:2'), first.nextSeen).messages).toHaveLength(1)
  })
  it('notifies subsequent completion after acknowledgement and another run', () => {
    const first = diffApprovalMessages(snapshot(), statuses('completed'), new Map())
    expect(diffApprovalMessages(snapshot(), statuses('completed'), first.nextSeen).messages).toEqual([])
    const cleared = diffApprovalMessages(snapshot(), statuses(), first.nextSeen)
    expect(diffApprovalMessages(snapshot(), statuses('completed'), cleared.nextSeen).messages).toHaveLength(1)
  })
  it('cleans markers when a session disappears; tolerates status before metadata', () => {
    const first = diffApprovalMessages(snapshot(), statuses('approval'), new Map())
    const removed = diffApprovalMessages(snapshot([]), statuses('approval'), first.nextSeen)
    expect(removed.messages).toEqual([])
    expect(removed.nextSeen.size).toBe(0)
    expect(diffApprovalMessages(snapshot(), statuses('approval'), removed.nextSeen).messages).toHaveLength(1)
  })
  it('uses displayTitle for blank titles and redacts tokens without exposing cwd', () => {
    const row = { ...summary(), title: '  ', displayTitle: 'Deploy bearer: sk-live-abcdefghijklmnop', cwd: '/private/secret' }
    expect(diffApprovalMessages(snapshot([row]), statuses('approval'), new Map()).messages)
      .toEqual(['审批请求：会话「Deploy [redacted-secret]」正在等待审批'])
  })
})
describe('delivery helpers', () => {
  it('splits title/body and prefers native notifications', () => {
    expect(alertPartsOf('审批请求：Alpha')).toEqual({ title: '审批请求', body: 'Alpha' })
    const notify = vi.fn(() => true); const toast = vi.fn()
    deliverAlert('审批请求：Alpha', notify, toast)
    expect(notify).toHaveBeenCalledWith('审批请求', 'Alpha')
    expect(toast).not.toHaveBeenCalled()
  })
  it('falls back when native delivery fails', () => {
    const toast = vi.fn()
    deliverAlert('提问请求：Alpha', () => false, toast)
    expect(toast).toHaveBeenCalledWith('提问请求', 'Alpha')
  })
})
