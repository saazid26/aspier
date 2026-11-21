import { useEffect } from 'react';
export function SEO({ title, description, exact }: { title: string; description?: string; exact?: boolean }) {
  useEffect(() => {
    document.title = exact || title === 'ASPIER' ? 'ASPIER' : `${title} | ASPIER`;
    const meta = document.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', description || 'ASPIER research and academy platform');
  }, [title, description, exact]);
  return null;
}

