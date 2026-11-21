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
  const allowed = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U']);
  const visit = (node: Element) => {
    for (const child of Array.from(node.children)) {
      visit(child);
      if (!allowed.has(child.tagName)) child.replaceWith(...Array.from(child.childNodes));
      else {
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

  return <div className="rich-editor">
    <div className="rich-editor-toolbar" role="toolbar" aria-label="Text formatting">
      {controls.map(([command, label, title]) => <button type="button" key={command} title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={() => format(command)}>{label}</button>)}
      <button type="button" title="Clear formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => format('removeFormat')}>Clear</button>
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
  </div>;
}
