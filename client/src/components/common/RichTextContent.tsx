const allowedTags = new Set([
  'P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U',
  'A', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'
]);

function safeMarkup(value: string): string {
  // Support converting markdown links [text](url) to HTML links before parsing
  const withMarkdownLinks = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const parsed = new DOMParser().parseFromString(withMarkdownLinks, 'text/html');
  const clean = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      clean(child);
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
      } else if (child.tagName === 'A') {
        const rawHref = child.getAttribute('href') || '';
        const trimmed = rawHref.trim();
        // Remove existing attributes to avoid XSS
        Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));

        // Disallow dangerous protocols like javascript:, data:, etc.
        if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
          child.setAttribute('href', trimmed);
          if (/^https?:\/\//i.test(trimmed)) {
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          }
        } else if (trimmed && !/^[a-z]+:/i.test(trimmed)) {
          child.setAttribute('href', `https://${trimmed}`);
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        } else {
          // If invalid or dangerous scheme, strip link tag and leave text
          child.replaceWith(...Array.from(child.childNodes));
        }
      } else {
        Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
      }
    }
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}

export function RichTextContent({ content, className = '' }: { content?: string; className?: string }) {
  if (!content) return null;
  const hasMarkup = /<\/?(p|br|ul|ol|li|strong|em|u|b|i|a|h\d)(\s|>)/i.test(content) || /\[.+?\]\(.+?\)/.test(content);
  const html = safeMarkup(hasMarkup ? content : content.split(/\r?\n/).map((line) => `<p>${line}</p>`).join(''));
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }}/>;
}
