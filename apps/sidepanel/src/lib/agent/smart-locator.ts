import { cdpCommander, type EvaluateResult } from './cdp-commander'
import { snapshotManager } from './snapshot-manager'
import { type BoundingBox } from './types'

const UID_ATTRIBUTE = 'data-prophet-nodeid'

export class SmartLocator {
  private async highlightElement(tabId: number, uid: string, type: 'click' | 'hover' | 'fill' = 'click'): Promise<void> {
    const color = type === 'fill' ? '#f59e0b' : '#3b82f6' // Amber for fill, Blue for click/hover

    await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
          if (el) {
            // Store original styles if not already stored
            if (!el.dataset.prophetOriginalTransition) {
              el.dataset.prophetOriginalTransition = el.style.transition || '';
              el.dataset.prophetOriginalOutline = el.style.outline || '';
              el.dataset.prophetOriginalBoxShadow = el.style.boxShadow || '';
            }

            // Apply "AIPex-style" visual feedback
            el.style.transition = 'all 0.2s ease-in-out';
            el.style.outline = '3px solid ${color}';
            el.style.outlineOffset = '2px';
            el.style.boxShadow = '0 0 0 4px rgba(${type === 'fill' ? '245, 158, 11' : '59, 130, 246'}, 0.2), 0 0 20px rgba(${type === 'fill' ? '245, 158, 11' : '59, 130, 246'}, 0.4)';
            
            // Remove highlight after animation
            setTimeout(() => {
              el.style.transition = el.dataset.prophetOriginalTransition;
              el.style.outline = el.dataset.prophetOriginalOutline;
              el.style.boxShadow = el.dataset.prophetOriginalBoxShadow;
              
              // Cleanup dataset attributes
              delete el.dataset.prophetOriginalTransition;
              delete el.dataset.prophetOriginalOutline;
              delete el.dataset.prophetOriginalBoxShadow;
            }, 1500);
          }
        })()
      `,
      awaitPromise: false,
    })

    // Give time for the user to see the highlight before action occurs
    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  async click(tabId: number, uid: string, doubleClick: boolean = false): Promise<void> {
    const node = snapshotManager.getNodeByUid(tabId, uid)
    if (!node) {
      throw new Error(`Element with UID "${uid}" not found. The page may have changed - call take_snapshot again.`)
    }

    await this.scrollIntoView(tabId, uid)
    await this.highlightElement(tabId, uid, 'click')

    const box = await this.getBoundingBox(tabId, uid)

    if (!box || box.width === 0 || box.height === 0) {
      await this.syntheticClick(tabId, uid, doubleClick)
      return
    }

    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    const clickCount = doubleClick ? 2 : 1

    await cdpCommander.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount,
    })

    await cdpCommander.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount,
    })
  }

  async fill(tabId: number, uid: string, value: string): Promise<void> {
    const node = snapshotManager.getNodeByUid(tabId, uid)
    if (!node) {
      throw new Error(`Element with UID "${uid}" not found. The page may have changed - call take_snapshot again.`)
    }

    await this.scrollIntoView(tabId, uid)
    await this.highlightElement(tabId, uid, 'fill')
    await this.focusElement(tabId, uid)

    await this.selectAll(tabId)

    if (value) {
      await cdpCommander.sendCommand(tabId, 'Input.insertText', {
        text: value,
      })
    } else {
      await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Backspace',
        code: 'Backspace',
      })
      await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Backspace',
        code: 'Backspace',
      })
    }

    await this.dispatchInputEvents(tabId, uid, value)
  }

  async hover(tabId: number, uid: string): Promise<void> {
    const node = snapshotManager.getNodeByUid(tabId, uid)
    if (!node) {
      throw new Error(`Element with UID "${uid}" not found. The page may have changed - call take_snapshot again.`)
    }

    await this.scrollIntoView(tabId, uid)
    await this.highlightElement(tabId, uid, 'hover')

    const box = await this.getBoundingBox(tabId, uid)

    if (!box) {
      throw new Error('Could not get element bounding box')
    }

    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    await cdpCommander.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: centerX,
      y: centerY,
    })
  }

  async pressKey(
    tabId: number,
    key: string,
    modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> = []
  ): Promise<void> {
    let modifierFlags = 0
    if (modifiers.includes('alt')) modifierFlags |= 1
    if (modifiers.includes('ctrl')) modifierFlags |= 2
    if (modifiers.includes('meta')) modifierFlags |= 4
    if (modifiers.includes('shift')) modifierFlags |= 8

    const keyCode = this.getKeyCode(key)

    await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code: keyCode,
      modifiers: modifierFlags,
    })

    if (key.length === 1 && modifierFlags === 0) {
      await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'char',
        text: key,
        key,
        code: keyCode,
      })
    }

    await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code: keyCode,
      modifiers: modifierFlags,
    })
  }

  private async scrollIntoView(tabId: number, uid: string): Promise<void> {
    const node = snapshotManager.getNodeByUid(tabId, uid)
    if (!node?.backendDOMNodeId) return

    try {
      await cdpCommander.sendCommand(tabId, 'DOM.scrollIntoViewIfNeeded', {
        backendNodeId: node.backendDOMNodeId,
      })
    } catch {
      await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
        expression: `
          (function() {
            const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
            if (el) {
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
          })()
        `,
        awaitPromise: false,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  private async getBoundingBox(tabId: number, uid: string): Promise<BoundingBox | null> {
    const result = await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          };
        })()
      `,
      returnByValue: true,
    })

    if (result.exceptionDetails || !result.result.value) {
      return null
    }

    return result.result.value as BoundingBox
  }

  private async focusElement(tabId: number, uid: string): Promise<void> {
    await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
          if (el) {
            el.focus();
          }
        })()
      `,
      awaitPromise: false,
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  private async selectAll(tabId: number): Promise<void> {
    const isMac = navigator.platform.toLowerCase().includes('mac')
    const modifier = isMac ? 4 : 2

    await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'a',
      code: 'KeyA',
      modifiers: modifier,
    })

    await cdpCommander.sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'a',
      code: 'KeyA',
      modifiers: modifier,
    })
  }

  private async dispatchInputEvents(tabId: number, uid: string, _value: string): Promise<void> {
    await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
          if (!el) return;

          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `,
      awaitPromise: false,
    })
  }

  private async syntheticClick(tabId: number, uid: string, doubleClick: boolean): Promise<void> {
    await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
          if (!el) return;

          el.click();
          ${doubleClick ? 'el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));' : ''}
        })()
      `,
      awaitPromise: false,
    })
  }

  private getKeyCode(key: string): string {
    const keyMap: Record<string, string> = {
      Enter: 'Enter',
      Tab: 'Tab',
      Escape: 'Escape',
      Backspace: 'Backspace',
      Delete: 'Delete',
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      Space: 'Space',
      ' ': 'Space',
    }

    if (keyMap[key]) {
      return keyMap[key]
    }

    if (key.length === 1) {
      const code = key.toUpperCase()
      if (code >= 'A' && code <= 'Z') {
        return `Key${code}`
      }
      if (code >= '0' && code <= '9') {
        return `Digit${code}`
      }
    }

    return key
  }
}

export const smartLocator = new SmartLocator()
