const allowedTags = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U']);

function safeMarkup(value: string): string {
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const clean = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      clean(child);
      if (!allowedTags.has(child.tagName)) child.replaceWith(...Array.from(child.childNodes));
      else Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
    }
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}

export function RichTextContent({ content, className = '' }: { content?: string; className?: string }) {
  if (!content) return null;
  const hasMarkup = /<\/?(p|br|ul|ol|li|strong|em|u|b|i)(\s|>)/i.test(content);
  const html = safeMarkup(hasMarkup ? content : content.split(/\r?\n/).map((line) => `<p>${line}</p>`).join(''));
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }}/>;
}
