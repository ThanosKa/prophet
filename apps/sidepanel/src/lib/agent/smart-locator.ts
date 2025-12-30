import { cdpCommander, type EvaluateResult } from './cdp-commander'
import { snapshotManager } from './snapshot-manager'
import { tryFillEditor } from './editor-detector'
import { type BoundingBox } from './types'

const UID_ATTRIBUTE = 'data-prophet-nodeid'

export class SmartLocator {
  private async highlightElement(tabId: number, uid: string, type: 'click' | 'hover' | 'fill' = 'click'): Promise<void> {
    console.warn(`[SmartLocator] Highlight requested (WARNING): uid="${uid}" type=${type} tab=${tabId}`)

    const color = type === 'fill' ? '#f59e0b' : '#3b82f6' // Amber for fill, Blue for click/hover

    try {
      await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
        expression: `
          (function() {
            try {
              console.warn('[Prophet Content] Searching for element with uid="${uid}"');
              const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
              
              if (el) {
                console.warn('[Prophet Content] Element FOUND, applying styles');
                
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
                  // console.log('[Prophet Debug] Highlight removed');
                }, 1500);
              } else {
                console.error('[Prophet Content] Element NOT found for uid="${uid}"');
              }
            } catch (err) {
              console.error('[Prophet Content] Error in highlight script:', err);
            }
          })()
        `,
        awaitPromise: false,
      })
      console.warn(`[SmartLocator] Highlight command SENT successfully`)
    } catch (error) {
      console.error(`[SmartLocator] Failed to send highlight command:`, error)
    }

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

    // AIPEX Pattern: Check if element is covered by overlay/popup
    const isCovered = await this.isElementCovered(tabId, uid, centerX, centerY)

    if (isCovered) {
      console.warn(`[SmartLocator] Element covered by overlay, using DOM click fallback`)
      await this.syntheticClick(tabId, uid, doubleClick)
      return
    }

    const clickCount = doubleClick ? 2 : 1

    // CDP "Trusted" click - simulates real hardware mouse
    await cdpCommander.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount,
    })

    // Small delay for React/Angular apps to register the click
    await new Promise(r => setTimeout(r, 50))

    await cdpCommander.sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount,
    })
  }

  /**
   * AIPEX Pattern: Check if element is covered by another element (popup, overlay, etc.)
   * Uses document.elementFromPoint to check what's actually at the click coordinates.
   */
  private async isElementCovered(tabId: number, uid: string, x: number, y: number): Promise<boolean> {
    try {
      const result = await cdpCommander.sendCommand<EvaluateResult>(tabId, 'Runtime.evaluate', {
        expression: `
          (function() {
            const target = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
            if (!target) return { isCovered: false, reason: 'target_not_found' };
            
            const topElement = document.elementFromPoint(${x}, ${y});
            if (!topElement) return { isCovered: false, reason: 'no_element_at_point' };
            
            // Check if topElement is the target or a descendant of target
            if (topElement === target) return { isCovered: false };
            if (target.contains(topElement)) return { isCovered: false };
            
            // Check if target contains the topElement (topElement is inside target)
            if (topElement.contains(target)) return { isCovered: false };
            
            // Element is covered by something else
            return { 
              isCovered: true, 
              coveredBy: topElement.tagName,
              coveredByClass: topElement.className
            };
          })()
        `,
        returnByValue: true,
      })

      if (result.exceptionDetails) {
        return false // If check fails, proceed with normal click
      }

      const value = result.result.value as { isCovered: boolean; coveredBy?: string }

      if (value.isCovered && value.coveredBy) {
        console.warn(`[SmartLocator] Element covered by <${value.coveredBy}>`)
      }

      return value.isCovered
    } catch {
      return false // If check fails, proceed with normal click
    }
  }

  async fill(tabId: number, uid: string, value: string): Promise<void> {
    const node = snapshotManager.getNodeByUid(tabId, uid)
    if (!node) {
      throw new Error(`Element with UID "${uid}" not found. The page may have changed - call take_snapshot again.`)
    }

    await this.scrollIntoView(tabId, uid)
    await this.highlightElement(tabId, uid, 'fill')

    // AIPEX Pattern: Try rich text editor APIs first (Monaco, CodeMirror, Ace)
    const filledViaEditor = await tryFillEditor(tabId, uid, value)
    if (filledViaEditor) {
      console.log('[SmartLocator] Filled via editor API')
      await this.dispatchInputEvents(tabId, uid, value)
      return
    }

    // Generic fill for standard inputs
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
