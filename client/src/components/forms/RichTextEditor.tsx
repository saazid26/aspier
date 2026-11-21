import { useEffect, useRef } from 'react';

const controls = [
  ['bold', 'B', 'Bold'],
  ['italic', 'I', 'Italic'],
  ['underline', 'U', 'Underline'],
  ['insertUnorderedList', '• List', 'Bulleted list'],
  ['insertOrderedList', '1. List', 'Numbered list']
] as const;

function cleanHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'SPAN', 'H1', 'H2', 'H3', 'H4']);
  const visit = (node: Element) => {
    for (const child of Array.from(node.children)) {
      visit(child);
      if (!allowed.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
      } else if (child.tagName === 'A') {
        const rawHref = child.getAttribute('href') || '';
        const trimmed = rawHref.trim();
        Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
        if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
          child.setAttribute('href', trimmed);
          if (/^https?:\/\//i.test(trimmed)) {
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          }
        } else if (trimmed) {
          child.setAttribute('href', `https://${trimmed}`);
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        } else {
          child.replaceWith(...Array.from(child.childNodes));
        }
      } else {
        Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
        if (child.tagName === 'B') child.replaceWith(Object.assign(document.createElement('strong'), { innerHTML: child.innerHTML }));
        if (child.tagName === 'I') child.replaceWith(Object.assign(document.createElement('em'), { innerHTML: child.innerHTML }));
      }
    }
  };
  visit(parsed.body);
  return parsed.body.innerHTML;
}

export function RichTextEditor({ value = '', onChange }: { value?: string; onChange: (value: string) => void }) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value;
  }, [value]);

  const format = (command: string) => {
    editor.current?.focus();
    document.execCommand(command, false);
    if (editor.current) onChange(cleanHtml(editor.current.innerHTML));
  };

  const insertLink = () => {
    editor.current?.focus();
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    const url = window.prompt('Enter URL to link to:', 'https://');
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'https://') return;
    const targetUrl = /^https?:\/\/|mailto:|tel:|\/|#/i.test(trimmed) ? trimmed : `https://${trimmed}`;

    if (!selectedText) {
      document.execCommand('insertHTML', false, `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer">${targetUrl}</a>`);
    } else {
      document.execCommand('createLink', false, targetUrl);
    }
    if (editor.current) onChange(cleanHtml(editor.current.innerHTML));
  };

  const unlink = () => {
    editor.current?.focus();
    document.execCommand('unlink', false);
    if (editor.current) onChange(cleanHtml(editor.current.innerHTML));
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Text formatting">
        {controls.map(([command, label, title]) => (
          <button
            type="button"
            key={command}
            title={title}
            aria-label={title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => format(command)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          title="Insert Link on selected words"
          aria-label="Insert Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={insertLink}
        >
          🔗 Link
        </button>
        <button
          type="button"
          title="Remove Link"
          aria-label="Remove Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={unlink}
        >
          Unlink
        </button>
        <button
          type="button"
          title="Clear formatting"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => format('removeFormat')}
        >
          Clear
        </button>
      </div>
      <div
        ref={editor}
        className="rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={() => { if (editor.current) onChange(cleanHtml(editor.current.innerHTML)); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            document.execCommand(event.shiftKey ? 'insertLineBreak' : 'insertParagraph', false);
            if (editor.current) onChange(cleanHtml(editor.current.innerHTML));
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
      />
    </div>
  );
}
