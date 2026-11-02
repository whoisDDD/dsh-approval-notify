import { describe, expect, it, vi } from 'vitest'
import { diffApprovalMessages } from '../src/core/approval.ts'
import { id, snapshot, statuses, status, summary } from './fixtures.ts'

function diffMessages(...args: Parameters<typeof diffApprovalMessages>) {
  const result = diffApprovalMessages(...args)
  return { ...result, messages: result.messages.map(alert => `${alert.title}：${alert.body}`) }
}

describe('unified DSH session status', () => {
  it.each([
    ['approval', '审批请求：会话「Alpha」正在等待审批'],
    ['question', '提问请求：会话「Alpha」正在等待你的选择'],
    ['plan-review', '计划审核：会话「Alpha」正在等待确认'],
    ['completed', '已完成：会话「Alpha」已完成'],
  ])('formats %s', (kind, expected) => {
    expect(diffMessages(snapshot(), statuses(kind), new Map()).messages).toEqual([expected])
  })
  it('labels retained subagents outside catalog ids', () => {
    const list = snapshot([summary('s1', 'Child', true)])
    list.ids = []
    expect(diffMessages(list, statuses('completed'), new Map()).messages)
      .toEqual(['子代理已完成：会话「Child」已完成'])
  })
  it('ignores idle historic sessions, even with a legacy completed field', () => {
    const row = { ...summary(), completed: true }
    expect(diffMessages(snapshot([row]), statuses(), new Map()).messages).toEqual([])
  })
  it('does not invent completion while running or for an unknown pending domain', () => {
    for (const state of [
      { ...status('completed'), running: true },
      { ...status('future'), completionUnread: true },
    ]) expect(diffMessages(snapshot(), new Map([[id('s1'), state]]), new Map()).messages).toEqual([])
  })
  it('prefers known pending requests over completionUnread', () => {
    expect(diffMessages(snapshot(), new Map([[id('s1'), { ...status('approval'), completionUnread: true }]]), new Map()).messages)
      .toEqual(['审批请求：会话「Alpha」正在等待审批'])
  })
  it('deduplicates unchanged requests and notifies replacements with new keys', () => {
    const first = diffMessages(snapshot(), statuses('approval'), new Map())
    expect(diffMessages(snapshot(), statuses('approval'), first.nextSeen).messages).toEqual([])
    expect(diffMessages(snapshot(), statuses('approval', 's1', 'approval:2'), first.nextSeen).messages).toHaveLength(1)
  })
  it('notifies subsequent completion after acknowledgement and another run', () => {
    const first = diffMessages(snapshot(), statuses('completed'), new Map())
    expect(diffMessages(snapshot(), statuses('completed'), first.nextSeen).messages).toEqual([])
    const cleared = diffMessages(snapshot(), statuses(), first.nextSeen)
    expect(diffMessages(snapshot(), statuses('completed'), cleared.nextSeen).messages).toHaveLength(1)
  })
  it('cleans markers when a session disappears; tolerates status before metadata', () => {
    const first = diffMessages(snapshot(), statuses('approval'), new Map())
    const removed = diffMessages(snapshot([]), statuses('approval'), first.nextSeen)
    expect(removed.messages).toEqual([])
    expect(removed.nextSeen.size).toBe(0)
    expect(diffMessages(snapshot(), statuses('approval'), removed.nextSeen).messages).toHaveLength(1)
  })
  it('uses displayTitle for blank titles and redacts tokens without exposing cwd', () => {
    const row = { ...summary(), title: '  ', displayTitle: 'Deploy bearer: sk-live-abcdefghijklmnop', cwd: '/private/secret' }
    expect(diffMessages(snapshot([row]), statuses('approval'), new Map()).messages)
      .toEqual(['审批请求：会话「Deploy [redacted-secret]」正在等待审批'])
  })
})

it('retains session identity and preserves colons in titles', () => {
  const row = summary('s1', '项目A：施工交底')
  expect(diffApprovalMessages(snapshot([row]), statuses('approval'), new Map()).messages)
    .toEqual([{ sessionId: id('s1'), title: '审批请求', body: '会话「项目A：施工交底」正在等待审批' }])
})
