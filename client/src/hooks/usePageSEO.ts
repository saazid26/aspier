import { useEffect } from 'react';

export interface PageSEOOptions {
  title: string;
  description: string;
  path?: string;
}

const BASE_URL = 'https://aspierglobal.vercel.app';

function upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string): void {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Lightweight hook to keep document.title, <meta name="description">,
 * <link rel="canonical">, and Open Graph / Twitter title+description in sync
 * for each public route without altering any visible UI.
 */
export function usePageSEO({ title, description, path }: PageSEOOptions): void {
  useEffect(() => {
    const resolvedPath =
      path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const normalizedPath = resolvedPath === '/' ? '/' : resolvedPath.replace(/\/+$/, '');
    const canonicalUrl = `${BASE_URL}${normalizedPath === '/' ? '/' : normalizedPath}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertCanonical(canonicalUrl);
  }, [title, description, path]);
}
