import { useEffect } from 'react';

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export type CourseSchemaProps = {
  name: string;
  description: string;
  price?: number;
  currency?: string;
  instructor?: string;
  category?: string;
};

export type SeoHeadProps = {
  title?: string;
  exactTitle?: boolean;
  exact?: boolean;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  courseSchema?: CourseSchemaProps;
  breadcrumbs?: BreadcrumbItem[];
};

const DEFAULT_TITLE = 'ASPIER | Aeronautical, Spatial, Planetary Institution for Environmental Research';
const DEFAULT_DESCRIPTION =
  'ASPIER (Aeronautical, Spatial, Planetary Institution for Environmental Research) is a multidisciplinary research institution and academy advancing aeronautical engineering, satellite remote sensing, planetary exploration, and environmental data science.';
const DEFAULT_KEYWORDS =
  'ASPIER, ASPIER Global, ASPIER Academy, Aeronautical Spatial Planetary Institution for Environmental Research, Aeronautical Engineering Research, Spatial Data and Remote Sensing, Planetary Science Research, Environmental Research Institute, Research Paper Writing Course, Academic Research Wings, Research Mates, Young Scholars';
const DEFAULT_IMAGE = 'https://aspier.org/aspier-logo.png';
const BASE_URL = 'https://aspier.org';

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string): void {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function injectJsonLd(id: string, data: object): void {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.text = JSON.stringify(data);
}

export function SeoHead({
  title,
  exactTitle,
  exact,
  description,
  keywords,
  canonicalPath,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  courseSchema,
  breadcrumbs
}: SeoHeadProps) {
  useEffect(() => {
    // 1. Compute Full Page Title
    const isExact = exactTitle || exact;
    let finalTitle = DEFAULT_TITLE;
    if (isExact && title) {
      finalTitle = title;
    } else if (title && title !== 'ASPIER') {
      finalTitle = `${title} | ASPIER`;
    }
    document.title = finalTitle;

    // 2. Meta Tags
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const finalKeywords = keywords || DEFAULT_KEYWORDS;
    const currentPath = canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const finalUrl = `${BASE_URL}${currentPath === '/' ? '' : currentPath}`;

    setMetaTag('name', 'description', finalDesc);
    setMetaTag('name', 'keywords', finalKeywords);
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Open Graph
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', finalUrl);
    setMetaTag('property', 'og:site_name', 'ASPIER — Aeronautical, Spatial, Planetary Institution for Environmental Research');
    setMetaTag('property', 'og:image', ogImage);

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDesc);
    setMetaTag('name', 'twitter:image', ogImage);

    // Canonical Link
    setCanonical(finalUrl);

    // 3. Invisible Schema.org JSON-LD Structured Data
    const graphObjects: any[] = [
      {
        '@type': ['ResearchOrganization', 'Organization'],
        '@id': `${BASE_URL}/#organization`,
        name: 'ASPIER — Aeronautical, Spatial, Planetary Institution for Environmental Research',
        alternateName: [
          'ASPIER',
          'ASPIER Global',
          'Aeronautical, Spatial, Planetary Institution for Environmental Research'
        ],
        url: BASE_URL,
        logo: `${BASE_URL}/aspier-logo.png`,
        description: DEFAULT_DESCRIPTION,
        knowsAbout: [
          'Aeronautical Engineering',
          'Spatial Science & Remote Sensing',
          'Planetary Science',
          'Environmental Research',
          'Climate Data Modeling',
          'Responsible AI',
          'Scientific Research & Publications'
        ],
        subOrganization: {
          '@type': 'EducationalOrganization',
          '@id': `${BASE_URL}/#academy`,
          name: 'ASPIER Academy',
          alternateName: 'ASPIER Academy LMS',
          url: `${BASE_URL}/academy`
        }
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'ASPIER',
        publisher: { '@id': `${BASE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/research?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ];

    if (courseSchema) {
      graphObjects.push({
        '@type': 'Course',
        name: courseSchema.name,
        description: courseSchema.description,
        provider: {
          '@type': 'EducationalOrganization',
          name: 'ASPIER Academy',
          sameAs: `${BASE_URL}/academy`
        },
        offers: {
          '@type': 'Offer',
          price: courseSchema.price ?? 0,
          priceCurrency: courseSchema.currency || 'BDT',
          availability: 'https://schema.org/InStock',
          validFrom: '2026-01-01'
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'Online',
          instructor: courseSchema.instructor
            ? {
                '@type': 'Person',
                name: courseSchema.instructor
              }
            : undefined
        }
      });
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      graphObjects.push({
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: `${BASE_URL}${b.path}`
        }))
      });
    }

    injectJsonLd('aspier-schema-graph', {
      '@context': 'https://schema.org',
      '@graph': graphObjects
    });
  }, [
    title,
    exactTitle,
    exact,
    description,
    keywords,
    canonicalPath,
    ogType,
    ogImage,
    courseSchema,
    breadcrumbs
  ]);

  return null;
}

// Backward-compatible alias
export const SEO = SeoHead;
