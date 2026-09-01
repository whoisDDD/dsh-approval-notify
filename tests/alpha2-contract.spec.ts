import { describe, expect, it } from 'vitest'
import pkg from '../package.json'

describe('alpha.2 package contract', () => {
  it('declares the web client graph and ./client export', () => {
    expect(pkg.dsh?.client).toEqual({
      inject: [
        '@deepseek-ai/dsh-api-session-controller',
        '@deepseek-ai/dsh-client-ui-session',
      ],
      platform: 'web',
    })
    expect(pkg.exports?.['./client']?.default).toBe('./lib/client.js')
  })

  it('does not declare removed or forbidden client dependencies', () => {
    const serialized = JSON.stringify(pkg)
    for (const forbidden of ['@deepseek-ai/dsh-client-runtime', 'ApiProxy', 'data-pane', 'useSyncExternalStore']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
