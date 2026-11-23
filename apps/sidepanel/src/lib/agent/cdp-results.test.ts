import { describe, expect, it } from 'vitest'
import { axTreeResultSchema, callFunctionOnResultSchema, evaluateResultSchema, resolveNodeResultSchema } from './cdp-results'

describe('CDP result schemas', () => {
  it('accepts a Runtime.evaluate result with a value', () => {
    const parsed = evaluateResultSchema.parse({ result: { type: 'string', value: 'hello' } })
    expect(parsed.result.value).toBe('hello')
  })

  it('accepts a Runtime.evaluate result with exception details', () => {
    const parsed = evaluateResultSchema.parse({
      result: { type: 'object', subtype: 'error', objectId: '1' },
      exceptionDetails: { exceptionId: 1, text: 'Uncaught', lineNumber: 0, exception: { type: 'object' } },
    })
    expect(parsed.exceptionDetails?.text).toBe('Uncaught')
  })

  it('rejects a Runtime.evaluate result with no result object', () => {
    expect(() => evaluateResultSchema.parse({})).toThrow()
    expect(() => evaluateResultSchema.parse(undefined)).toThrow()
  })

  it('accepts DOM.resolveNode and Runtime.callFunctionOn results', () => {
    expect(resolveNodeResultSchema.parse({ object: { type: 'object', objectId: 'abc' } }).object.objectId).toBe('abc')
    expect(callFunctionOnResultSchema.parse({ result: { type: 'string', value: 'uid1' } }).result.value).toBe('uid1')
  })

  it('accepts an accessibility tree and rejects one without nodes', () => {
    const tree = axTreeResultSchema.parse({
      nodes: [
        {
          nodeId: '1',
          ignored: false,
          role: { type: 'role', value: 'button' },
          name: { type: 'computedString', value: 'Save' },
          properties: [{ name: 'focused', value: { type: 'booleanOrUndefined', value: true } }],
          childIds: ['2'],
          backendDOMNodeId: 7,
        },
      ],
    })
    expect(tree.nodes[0].backendDOMNodeId).toBe(7)
    expect(() => axTreeResultSchema.parse({})).toThrow()
  })

  it('skips an accessibility node of an unexpected shape and keeps the rest of the tree', () => {
    const tree = axTreeResultSchema.parse({
      nodes: [
        { nodeId: '1', ignored: false, role: { type: 'role', value: 'button' }, properties: [{ name: 'focused' }] },
        { nodeId: '2', role: { type: 'role', value: 'link' }, backendDOMNodeId: 8 },
      ],
    })
    expect(tree.nodes.map((node) => node.nodeId)).toEqual(['2'])
  })
})
