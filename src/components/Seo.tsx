// components/Seo.tsx
// Lightweight per-route SEO: updates document title and meta description
// without adding a dependency.
import { useEffect } from 'react';

const APP_BASE = 'https://menen-oshs-app.pxxl.click';

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
}

export default function Seo({ title, description, path = '/' }: SeoProps) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
    if (path) {
      let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = `${APP_BASE}${path}`;
    }
  }, [title, description, path]);

  return null;
}