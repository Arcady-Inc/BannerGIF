import React, { useEffect, useRef } from 'react';
import { uniqueIconIds } from '../utils/iconStore';

interface TextareaWithTokensProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  /** Imperative handle (we expose a way to focus + insert at cursor). */
  editorRef?: React.RefObject<TextareaWithTokensHandle>;
  className?: string;
}

export interface TextareaWithTokensHandle {
  focus: () => void;
  insertAtCursor: (text: string) => void;
}

/**
 * Inline-token editor built on contentEditable.
 *
 * Source of truth is a plain string of the form
 *
 *   "Hi {{icon:material-symbols:rocket-launch}} world"
 *
 * On render we parse that into DOM nodes — plain text runs and "chip"
 * elements (a contentEditable="false" span containing the icon + close
 * button). On every user input we serialize the DOM back to the canonical
 * string and emit via onChange. The browser handles caret positioning,
 * selection, and atomic-chip navigation natively.
 */
const TextareaWithTokens = React.forwardRef<HTMLDivElement, TextareaWithTokensProps>(
  function TextareaWithTokens(
    { value, onChange, placeholder = 'Enter banner text...', rows = 2, editorRef, className = '' },
    forwardedRef
  ) {
    const innerRef = useRef<HTMLDivElement>(null);
    const composingRef = useRef(false);
    // Last-known caret position inside the editor. We snapshot every
    // selectionchange while the editor has focus, so insertAtCursor can
    // restore the right caret even after the user clicks a picker button
    // (which steals focus from the editor).
    const savedRangeRef = useRef<Range | null>(null);

    // Wire forwardedRef + innerRef together.
    useEffect(() => {
      if (typeof forwardedRef === 'function') forwardedRef(innerRef.current);
      else if (forwardedRef && 'current' in forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current =
          innerRef.current;
      }
    }, [forwardedRef]);

    // Imperative API for callers (icon picker, emoji picker).
    useEffect(() => {
      if (!editorRef) return;
      (editorRef as React.MutableRefObject<TextareaWithTokensHandle | null>).current = {
        focus: () => innerRef.current?.focus(),
        insertAtCursor: (text: string) => insertAtCursor(text),
      };
    }, [editorRef]);

    // Re-paint the contentEditable DOM whenever `value` changes from the
    // outside (e.g. another component edits config.text). We skip the
    // re-paint when the change came from the user's own typing — the
    // browser already updated the DOM in place and we don't want to fight
    // its caret position.
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const serialized = serializeDom(el);
      if (serialized === value) return; // already in sync — user just typed
      renderValueIntoDom(el, value);
    }, [value]);

    // Snapshot the selection range whenever it changes inside our editor.
    // We can't capture it inside insertAtCursor because by the time that
    // runs, focus has already left (the picker button stole it).
    useEffect(() => {
      const onSelectionChange = () => {
        const el = innerRef.current;
        if (!el) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        // Only remember the range if the caret is actually inside our editor.
        if (el.contains(range.startContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      };
      document.addEventListener('selectionchange', onSelectionChange);
      return () => document.removeEventListener('selectionchange', onSelectionChange);
    }, []);

    const insertAtCursor = (text: string) => {
      const el = innerRef.current;
      if (!el) return;

      // Restore the previously-saved caret. We do this BEFORE focus() because
      // some browsers move the caret to position 0 on focus().
      const sel = window.getSelection();
      let range: Range | null = null;

      if (savedRangeRef.current && el.contains(savedRangeRef.current.startContainer)) {
        range = savedRangeRef.current.cloneRange();
      } else if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
      } else {
        // Truly no known caret — append at the end.
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }

      el.focus();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }

      // Insert via DOM mutation, then serialize. This is more reliable than
      // string-splicing because contentEditable's caret position doesn't
      // correspond 1:1 to character offsets in the serialized string.
      range.deleteContents();

      // Build the new nodes from the inserted-text string. If the inserted
      // text contains a token, that token gets a chip; surrounding text gets
      // a text node. We use a DocumentFragment so the caret can sit after
      // the inserted content.
      const fragment = document.createDocumentFragment();
      const pieces = parseStringToDomPieces(text);
      pieces.forEach((p) => fragment.appendChild(p));

      const lastNode = fragment.lastChild;
      range.insertNode(fragment);

      if (lastNode && sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        // Snapshot the new caret so subsequent insertions land here.
        savedRangeRef.current = newRange.cloneRange();
      }

      onChange(serializeDom(el));
    };

    const handleInput = () => {
      if (composingRef.current) return;
      const el = innerRef.current;
      if (!el) return;
      onChange(serializeDom(el));
    };

    return (
      <div
        ref={innerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={() => {
          composingRef.current = false;
          handleInput();
        }}
        onPaste={(e) => {
          // Strip rich content; only paste plain text.
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          insertAtCursor(text);
        }}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        spellCheck={false}
        className={`bannergif-editor w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm leading-5 focus:ring-1 focus:ring-[#4F6FF5] focus:border-[#4F6FF5] transition-all outline-none whitespace-pre-wrap break-words pr-16 ${className}`}
        style={{ minHeight: `${rows * 1.5}em` }}
      />
    );
  }
);

export default TextareaWithTokens;

// ============================================================================
// DOM <-> string serialization
// ============================================================================

const TOKEN_RE = /\{\{icon:[a-zA-Z0-9_:-]+\}\}/g;

/** Walk the contentEditable DOM and reconstruct the canonical string. */
const serializeDom = (root: HTMLElement): string => {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // Chip → re-emit canonical token.
      const tokenAttr = el.getAttribute('data-token');
      if (tokenAttr) {
        out += tokenAttr;
        return;
      }
      // <br> → newline.
      if (el.tagName === 'BR') {
        out += '\n';
        return;
      }
      // <div> (browser-inserted on Enter in contentEditable) → newline before content.
      const isBlock = el.tagName === 'DIV' || el.tagName === 'P';
      if (isBlock && out.length > 0 && !out.endsWith('\n')) out += '\n';
      el.childNodes.forEach(walk);
    }
  };
  root.childNodes.forEach(walk);
  return out;
};

/** Build chip + text DOM nodes from a canonical string. */
const parseStringToDomPieces = (value: string): Node[] => {
  const pieces: Node[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m = TOKEN_RE.exec(value); m !== null; m = TOKEN_RE.exec(value)) {
    if (m.index > lastIndex) {
      pieces.push(document.createTextNode(value.slice(lastIndex, m.index)));
    }
    pieces.push(buildChipElement(m[0]));
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < value.length) {
    pieces.push(document.createTextNode(value.slice(lastIndex)));
  }
  return pieces;
};

const renderValueIntoDom = (root: HTMLElement, value: string): void => {
  // Remember selection offset (best-effort).
  while (root.firstChild) root.removeChild(root.firstChild);
  parseStringToDomPieces(value).forEach((n) => root.appendChild(n));
};

/**
 * Build a chip element for a `{{icon:set:name}}` token.
 *
 * `data-token` carries the canonical token text so serialization is round-trip
 * stable even if the visible text drifts. `contentEditable="false"` makes the
 * chip behave as a single atomic unit for caret + selection + delete.
 */
const buildChipElement = (token: string): HTMLElement => {
  const match = /\{\{icon:([a-zA-Z0-9_:-]+)\}\}/.exec(token);
  const iconId = match?.[1] ?? '';
  const shortName = iconId.split(':').pop() ?? iconId;

  const chip = document.createElement('span');
  chip.setAttribute('data-token', token);
  chip.contentEditable = 'false';
  chip.className =
    'bannergif-chip inline-flex items-center gap-1 align-middle mx-0.5 px-1.5 py-0.5 rounded-md bg-[#4F6FF5]/15 border border-[#4F6FF5]/40 text-[#A5B4FC] text-[11px] font-medium leading-tight select-none';

  const img = document.createElement('img');
  img.src = `https://api.iconify.design/${iconId}.svg`;
  img.alt = iconId;
  img.style.width = '0.9em';
  img.style.height = '0.9em';
  img.style.filter = 'invert(0.7) sepia(1) saturate(5) hue-rotate(200deg)';
  chip.appendChild(img);

  const label = document.createElement('span');
  label.textContent = shortName;
  label.style.maxWidth = '120px';
  label.style.overflow = 'hidden';
  label.style.textOverflow = 'ellipsis';
  label.style.whiteSpace = 'nowrap';
  chip.appendChild(label);

  // Close button — removes this chip when clicked. We delete the chip
  // element directly from the DOM; the parent will pick up the change via
  // its MutationObserver/onInput because removing a child fires `input`.
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Remove icon');
  close.className =
    'ml-0.5 text-[#7E94FF] hover:text-white leading-none text-[14px] cursor-pointer';
  close.style.background = 'transparent';
  close.style.border = 'none';
  close.style.padding = '0 2px';
  close.addEventListener('mousedown', (e) => {
    // mousedown (not click) — click on a button inside contentEditable can
    // steal focus / mess with selection before we get a chance to delete.
    e.preventDefault();
    e.stopPropagation();
    const parent = chip.parentElement;
    if (parent) {
      parent.removeChild(chip);
      // Trigger an 'input' event on the parent so React picks it up.
      parent.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  chip.appendChild(close);

  return chip;
};

// Export the icon-id helper so callers can keep using it on the serialized
// string without round-tripping through DOM.
export { uniqueIconIds };
