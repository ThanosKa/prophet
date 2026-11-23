import { z } from 'zod'

export const remoteObjectSchema = z.object({
  type: z.string().optional(),
  subtype: z.string().optional(),
  className: z.string().optional(),
  value: z.unknown(),
  objectId: z.string().optional(),
  description: z.string().optional(),
})

const exceptionDetailsSchema = z.object({
  exception: remoteObjectSchema.optional(),
  text: z.string(),
})

export const evaluateResultSchema = z.object({
  result: remoteObjectSchema,
  exceptionDetails: exceptionDetailsSchema.optional(),
})

export const callFunctionOnResultSchema = evaluateResultSchema

export const resolveNodeResultSchema = z.object({
  object: remoteObjectSchema,
})

const axValueSchema = z.object({ type: z.string().optional(), value: z.unknown() })

export const axNodeSchema = z.object({
  nodeId: z.string(),
  ignored: z.boolean().optional(),
  ignoredReasons: z.array(z.object({ name: z.string(), value: axValueSchema.optional() })).optional(),
  role: axValueSchema.optional(),
  name: axValueSchema.optional(),
  value: axValueSchema.optional(),
  description: axValueSchema.optional(),
  properties: z.array(z.object({ name: z.string(), value: axValueSchema })).optional(),
  childIds: z.array(z.string()).optional(),
  backendDOMNodeId: z.number().optional(),
  frameId: z.string().optional(),
})

export const axTreeResultSchema = z.object({
  nodes: z.array(z.unknown()).transform((nodes) =>
    nodes.flatMap((node) => {
      const parsed = axNodeSchema.safeParse(node)
      return parsed.success ? [parsed.data] : []
    })
  ),
})

export type RemoteObject = z.infer<typeof remoteObjectSchema>
export type EvaluateResult = z.infer<typeof evaluateResultSchema>
export type CallFunctionOnResult = z.infer<typeof callFunctionOnResultSchema>
export type ResolveNodeResult = z.infer<typeof resolveNodeResultSchema>
export type AXNode = z.infer<typeof axNodeSchema>
export type AXTreeResult = z.infer<typeof axTreeResultSchema>
