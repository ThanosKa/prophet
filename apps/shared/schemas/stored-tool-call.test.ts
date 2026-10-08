import { describe, it, expect } from 'vitest'
import { parseStoredToolCalls, readStoredToolCalls } from './stored-tool-call'

const navigate = { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }

describe('readStoredToolCalls', () => {
  it('keeps the valid entries of a list; one bad entry never hides the rest', () => {
    expect(readStoredToolCalls([navigate, { id: 'toolu_2' }, { ...navigate, id: 'toolu_3', isError: true }])).toEqual([
      navigate,
      { ...navigate, id: 'toolu_3', isError: true },
    ])
  })

  it('reads anything but a list as no calls', () => {
    expect(readStoredToolCalls(null)).toEqual([])
    expect(readStoredToolCalls({ 0: navigate })).toEqual([])
  })

  it('drops fields the record never stores', () => {
    expect(readStoredToolCalls([{ ...navigate, caller: { type: 'direct' } }])).toEqual([navigate])
  })
})

describe('parseStoredToolCalls', () => {
  it('reads the tool_calls column with the same per-entry rule', () => {
    expect(parseStoredToolCalls(JSON.stringify([navigate, { id: 'toolu_2' }]))).toEqual([navigate])
  })

  it('reads no column or a column that is not JSON as no calls', () => {
    expect(parseStoredToolCalls(null)).toEqual([])
    expect(parseStoredToolCalls('{not json')).toEqual([])
  })
})
