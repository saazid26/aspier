import { useEffect } from 'react';
export function SEO({ title, description }: { title: string; description?: string }) {
  useEffect(() => { document.title = `${title} | ASPIER`; const meta = document.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name','description'); meta.setAttribute('content',description || 'ASPIER research and academy platform'); }, [title, description]); return null;
}
