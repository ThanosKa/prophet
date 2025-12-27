import { debuggerManager } from './debugger-manager'

const DEFAULT_TIMEOUT_MS = 10000

export class CdpCommander {
  async sendCommand<T = unknown>(
    tabId: number,
    method: string,
    params?: object,
    timeout: number = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    await debuggerManager.attach(tabId)
    debuggerManager.touchAutoDetach(tabId)

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        debuggerManager.unregisterPendingCommand(tabId, pendingCommand)
        reject(new Error(`CDP command ${method} timed out after ${timeout}ms`))
      }, timeout)

      const pendingCommand = {
        resolve: (value: unknown) => {
          clearTimeout(timeoutId)
          resolve(value as T)
        },
        reject: (reason: unknown) => {
          clearTimeout(timeoutId)
          reject(reason)
        },
      }

      debuggerManager.registerPendingCommand(tabId, pendingCommand)

      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        debuggerManager.unregisterPendingCommand(tabId, pendingCommand)
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(result as T)
        }
      })
    })
  }

  async enable(tabId: number, domain: string): Promise<void> {
    await this.sendCommand(tabId, `${domain}.enable`)
  }

  async disable(tabId: number, domain: string): Promise<void> {
    try {
      await this.sendCommand(tabId, `${domain}.disable`)
    } catch {
      // Ignore errors when disabling
    }
  }
}

export const cdpCommander = new CdpCommander()

export interface DOMNode {
  nodeId: number
  backendNodeId: number
  nodeType: number
  nodeName: string
  localName: string
  nodeValue: string
  childNodeCount?: number
  children?: DOMNode[]
  attributes?: string[]
}

export interface RemoteObject {
  type: string
  subtype?: string
  className?: string
  value?: unknown
  objectId?: string
  description?: string
}

export interface AXNode {
  nodeId: string
  ignored: boolean
  ignoredReasons?: Array<{ name: string; value?: { type: string; value?: unknown } }>
  role?: { type: string; value: string }
  name?: { type: string; value: string; sources?: unknown[] }
  value?: { type: string; value: unknown }
  description?: { type: string; value: string }
  properties?: Array<{ name: string; value: { type: string; value: unknown } }>
  childIds?: string[]
  backendDOMNodeId?: number
  frameId?: string
}

export interface AXTreeResult {
  nodes: AXNode[]
}

export interface BoxModel {
  content: number[]
  padding: number[]
  border: number[]
  margin: number[]
  width: number
  height: number
}

export interface ResolveNodeResult {
  object: RemoteObject
}

export interface CallFunctionOnResult {
  result: RemoteObject
  exceptionDetails?: {
    exception: RemoteObject
    text: string
  }
}

export interface EvaluateResult {
  result: RemoteObject
  exceptionDetails?: {
    exception: RemoteObject
    text: string
  }
}
