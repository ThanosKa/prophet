/**
 * 
 * Detects Monaco, CodeMirror, and Ace editors and provides
 * specialized fill methods that use the editor's internal API
 * instead of generic input simulation.
 */

import { cdpCommander, type EvaluateResult } from './cdp-commander'

const UID_ATTRIBUTE = 'data-prophet-nodeid'

export type EditorType = 'monaco' | 'codemirror' | 'ace' | 'none'

/**
 * Detect if an element is part of a rich text editor.
 */
export async function detectEditor(tabId: number, uid: string): Promise<EditorType> {
    try {
        const result = await cdpCommander.sendCommand<EvaluateResult>(
            tabId,
            'Runtime.evaluate',
            {
                expression: `
          (function() {
            const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
            if (!el) return 'none';
            
            // Check for Monaco Editor (VS Code, GitHub, etc.)
            if (el.classList.contains('monaco-editor')) return 'monaco';
            if (el.closest('.monaco-editor')) return 'monaco';
            if (el.querySelector('.monaco-editor')) return 'monaco';
            
            // Check for CodeMirror (many code editors)
            if (el.classList.contains('CodeMirror')) return 'codemirror';
            if (el.closest('.CodeMirror')) return 'codemirror';
            if (el.querySelector('.CodeMirror')) return 'codemirror';
            
            // Check for Ace Editor
            if (el.classList.contains('ace_editor')) return 'ace';
            if (el.closest('.ace_editor')) return 'ace';
            if (el.querySelector('.ace_editor')) return 'ace';
            
            return 'none';
          })()
        `,
                returnByValue: true,
            }
        )

        if (result.exceptionDetails) {
            return 'none'
        }

        return (result.result.value as EditorType) || 'none'
    } catch {
        return 'none'
    }
}

/**
 * Fill a Monaco editor with the given value.
 */
export async function fillMonaco(tabId: number, uid: string, value: string): Promise<boolean> {
    try {
        // Escape the value for use in JavaScript string
        const escapedValue = value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')

        const result = await cdpCommander.sendCommand<EvaluateResult>(
            tabId,
            'Runtime.evaluate',
            {
                expression: `
          (function() {
            const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
            if (!el) return false;
            
            // Find the Monaco editor container
            const editorDom = el.classList.contains('monaco-editor') 
              ? el 
              : el.closest('.monaco-editor') || el.querySelector('.monaco-editor');
            
            if (!editorDom) return false;
            
            // Try to access Monaco instance
            // Monaco stores the editor instance in various ways depending on the host app
            const editor = editorDom.editor 
              || editorDom.__monaco_editor__ 
              || editorDom._editor
              || window.monaco?.editor?.getEditors?.()[0];
            
            if (editor && typeof editor.setValue === 'function') {
              editor.setValue('${escapedValue}');
              return true;
            }
            
            // Alternative: Try to find the model and set value
            if (window.monaco?.editor) {
              const model = window.monaco.editor.getModels()[0];
              if (model && typeof model.setValue === 'function') {
                model.setValue('${escapedValue}');
                return true;
              }
            }
            
            return false;
          })()
        `,
                returnByValue: true,
            }
        )

        return result.result.value === true
    } catch {
        return false
    }
}

/**
 * Fill a CodeMirror editor with the given value.
 */
export async function fillCodeMirror(tabId: number, uid: string, value: string): Promise<boolean> {
    try {
        const escapedValue = value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')

        const result = await cdpCommander.sendCommand<EvaluateResult>(
            tabId,
            'Runtime.evaluate',
            {
                expression: `
          (function() {
            const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
            if (!el) return false;
            
            // Find the CodeMirror container
            const cmDom = el.classList.contains('CodeMirror') 
              ? el 
              : el.closest('.CodeMirror') || el.querySelector('.CodeMirror');
            
            if (!cmDom) return false;
            
            // CodeMirror 5.x stores instance on the element
            const cm = cmDom.CodeMirror;
            if (cm && typeof cm.setValue === 'function') {
              cm.setValue('${escapedValue}');
              return true;
            }
            
            // CodeMirror 6.x uses a different API
            if (cmDom.view && typeof cmDom.view.dispatch === 'function') {
              cmDom.view.dispatch({
                changes: {
                  from: 0,
                  to: cmDom.view.state.doc.length,
                  insert: '${escapedValue}'
                }
              });
              return true;
            }
            
            return false;
          })()
        `,
                returnByValue: true,
            }
        )

        return result.result.value === true
    } catch {
        return false
    }
}

/**
 * Fill an Ace editor with the given value.
 */
export async function fillAce(tabId: number, uid: string, value: string): Promise<boolean> {
    try {
        const escapedValue = value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')

        const result = await cdpCommander.sendCommand<EvaluateResult>(
            tabId,
            'Runtime.evaluate',
            {
                expression: `
          (function() {
            const el = document.querySelector('[${UID_ATTRIBUTE}="${uid}"]');
            if (!el) return false;
            
            // Find the Ace editor container
            const aceDom = el.classList.contains('ace_editor') 
              ? el 
              : el.closest('.ace_editor') || el.querySelector('.ace_editor');
            
            if (!aceDom) return false;
            
            // Ace stores the editor in env.editor
            const editor = aceDom.env?.editor;
            if (editor && typeof editor.setValue === 'function') {
              editor.setValue('${escapedValue}', 1); // 1 = move cursor to end
              return true;
            }
            
            // Alternative: Global ace.edit reference
            if (window.ace && aceDom.id) {
              const editor = window.ace.edit(aceDom.id);
              if (editor && typeof editor.setValue === 'function') {
                editor.setValue('${escapedValue}', 1);
                return true;
              }
            }
            
            return false;
          })()
        `,
                returnByValue: true,
            }
        )

        return result.result.value === true
    } catch {
        return false
    }
}

/**
 * Try to fill any detected editor type.
 * Returns true if editor was detected and filled, false otherwise.
 */
export async function tryFillEditor(
    tabId: number,
    uid: string,
    value: string
): Promise<boolean> {
    const editorType = await detectEditor(tabId, uid)

    switch (editorType) {
        case 'monaco':
            console.log('[EditorDetector] Monaco editor detected, using setValue')
            return fillMonaco(tabId, uid, value)
        case 'codemirror':
            console.log('[EditorDetector] CodeMirror editor detected, using setValue')
            return fillCodeMirror(tabId, uid, value)
        case 'ace':
            console.log('[EditorDetector] Ace editor detected, using setValue')
            return fillAce(tabId, uid, value)
        default:
            return false
    }
}
