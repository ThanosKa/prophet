import { attemptAsync } from '@prophet/shared'
import { debuggerManager } from './debugger-manager'

export type {
  AXNode,
  AXTreeResult,
  CallFunctionOnResult,
  EvaluateResult,
  RemoteObject,
  ResolveNodeResult,
} from './cdp-results'

const DEFAULT_TIMEOUT_MS = 10000

export class CdpCommander {
  async sendCommand(
    tabId: number,
    method: string,
    params?: object,
    timeout: number = DEFAULT_TIMEOUT_MS
  ): Promise<unknown> {
    await debuggerManager.attach(tabId)
    debuggerManager.touchAutoDetach(tabId)

    return new Promise<unknown>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        debuggerManager.unregisterPendingCommand(tabId, pendingCommand)
        reject(new Error(`CDP command ${method} timed out after ${timeout}ms`))
      }, timeout)

      const pendingCommand = {
        resolve: (value: unknown) => {
          clearTimeout(timeoutId)
          resolve(value)
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
          resolve(result)
        }
      })
    })
  }

  async enable(tabId: number, domain: string): Promise<void> {
    await this.sendCommand(tabId, `${domain}.enable`)
  }

  async disable(tabId: number, domain: string): Promise<void> {
    await attemptAsync(async () => {
      await this.sendCommand(tabId, `${domain}.disable`)
    })
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

export interface BoxModel {
  content: number[]
  padding: number[]
  border: number[]
  margin: number[]
  width: number
  height: number
}
