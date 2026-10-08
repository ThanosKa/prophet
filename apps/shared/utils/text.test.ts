import { describe, it, expect } from 'vitest'
import { errorMessage, keepChars } from './text'

describe('keepChars', () => {
  it('returns text within the count unchanged', () => {
    expect(keepChars({ text: 'abc', count: 3 })).toBe('abc')
    expect(keepChars({ text: 'abc', count: 3, from: 'end' })).toBe('abc')
  })

  it('keeps the first or the last `count` characters', () => {
    expect(keepChars({ text: 'abcdef', count: 4 })).toBe('abcd')
    expect(keepChars({ text: 'abcdef', count: 4, from: 'end' })).toBe('cdef')
  })

  it('never keeps half of an emoji at the cut', () => {
    // '😀' is two UTF-16 units; a cut through it drops the half.
    expect(keepChars({ text: 'ab😀cd', count: 3 })).toBe('ab')
    expect(keepChars({ text: 'ab😀cd', count: 3, from: 'end' })).toBe('cd')
    expect(keepChars({ text: 'ab😀cd', count: 4 })).toBe('ab😀')
  })

  it('keeps nothing for a count of zero', () => {
    expect(keepChars({ text: 'abc', count: 0, from: 'end' })).toBe('')
  })
})

describe('errorMessage', () => {
  it("returns an Error's message, or anything else as text", () => {
    expect(errorMessage(new Error('socket hang up'))).toBe('socket hang up')
    expect(errorMessage('timeout')).toBe('timeout')
    expect(errorMessage(429)).toBe('429')
  })
})
