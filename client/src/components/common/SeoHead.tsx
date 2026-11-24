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
  url?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
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
  coursesList?: CourseSchemaProps[];
  breadcrumbs?: BreadcrumbItem[];
  faqItems?: FaqItem[];
  googleSiteVerification?: string;
};

const DEFAULT_TITLE = 'ASPIER | Aeronautical, Spatial, Planetary Institution for Environmental Research';
const DEFAULT_DESCRIPTION =
  'ASPIER (Aeronautical, Spatial, Planetary Institution for Environmental Research) is an autonomous research institution and academy advancing aeronautical engineering, spatial remote sensing, planetary science, environmental data science, and higher-study research training.';
const DEFAULT_KEYWORDS =
  'ASPIER, ASPIER Global, ASPIER Academy, Aeronautical, Spatial, Planetary Institution for Environmental Research, Aeronautical Spatial Planetary Institution for Environmental Research, ASPIER Research Institute, aspierglobal, ASPIER Academy courses, ASPIER Academy student portal, Higher Study Oriented Basic to Advance Research Paper Writing Course, Responsible AI Foundations, Climate Data Modeling, Research Training Bangladesh, ASPIER Academic Wings, ASPIER Research Mate, ASPIER Young Scholars, ASPIER Research Supervisors, Aeronautical Engineering and UAV Systems, Spatial Data and Remote Sensing, Planetary Science, Environmental Research Institute';

const DEFAULT_IMAGE = 'https://aspierglobal.vercel.app/aspier-logo.png';
const BASE_URL =
  typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://aspierglobal.vercel.app';

const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'What is ASPIER (Aeronautical, Spatial, Planetary Institution for Environmental Research)?',
    answer:
      'ASPIER (Aeronautical, Spatial, Planetary Institution for Environmental Research) is an autonomous scientific research institution advancing multidisciplinary science across aerospace systems, satellite remote sensing, planetary exploration, and environmental ecosystems.'
  },
  {
    question: 'What is ASPIER Academy?',
    answer:
      'ASPIER Academy is the educational division of ASPIER, providing specialized training programs including the Higher Study Oriented Basic to Advance Research Paper Writing Course, Responsible AI Foundations, Climate Data Modeling, and live mentor-led research masterclasses.'
  },
  {
    question: 'How to join ASPIER as a Research Mate, Young Scholar, or Supervisor?',
    answer:
      'Prospective researchers, students, and academics can apply directly through the ASPIER portal at /wings/apply-research or /join to collaborate as Research Mates, Young Scholars, or Research Supervisors across our 10 Academic Wings.'
  }
];

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
  coursesList,
  breadcrumbs,
  faqItems,
  googleSiteVerification
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

    // Google Search Console Verification (only rendered when set)
    const verificationCode =
      googleSiteVerification ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_SITE_VERIFICATION);
    if (verificationCode) {
      setMetaTag('name', 'google-site-verification', verificationCode);
    }

    // Open Graph
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', finalUrl);
    setMetaTag(
      'property',
      'og:site_name',
      'ASPIER — Aeronautical, Spatial, Planetary Institution for Environmental Research'
    );
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
          'ASPIER Academy',
          'Aeronautical, Spatial, Planetary Institution for Environmental Research',
          'Aeronautical Spatial Planetary Institution for Environmental Research',
          'ASPIER Research Institute',
          'aspierglobal'
        ],
        url: BASE_URL,
        logo: `${BASE_URL}/aspier-logo.png`,
        description: DEFAULT_DESCRIPTION,
        knowsAbout: [
          'Aeronautical Engineering & UAV Systems',
          'Planetary Science & Astrobiology',
          'Hydrology & Atmospheric Physics',
          'Geospatial Intelligence & Remote Sensing',
          'Geomicrobiology & Biogeology',
          'Environmental Chemistry & Toxicology',
          'Applied Biotechnology',
          'Agricultural Sciences & Food Security',
          'Economic Geography & Resource Management',
          'Environmental Policy & Governance',
          'Higher Study Oriented Basic to Advance Research Paper Writing Course',
          'Responsible AI Foundations',
          'Climate Data Modeling',
          'Research Training Bangladesh',
          'ASPIER Academic Wings',
          'ASPIER Research Mate',
          'ASPIER Young Scholars',
          'ASPIER Research Supervisors'
        ],
        subOrganization: {
          '@type': 'EducationalOrganization',
          '@id': `${BASE_URL}/#academy`,
          name: 'ASPIER Academy',
          alternateName: ['ASPIER Academy LMS', 'ASPIER Academy Student Portal'],
          url: `${BASE_URL}/academy`,
          description:
            'Educational wing of ASPIER providing higher-study oriented research paper writing courses, responsible AI foundations, and scientific research training.'
        }
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'ASPIER',
        alternateName: 'ASPIER Global',
        publisher: { '@id': `${BASE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/research?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'FAQPage',
        '@id': `${BASE_URL}/#faq`,
        mainEntity: (faqItems && faqItems.length > 0 ? faqItems : DEFAULT_FAQS).map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
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

    if (coursesList && coursesList.length > 0) {
      coursesList.forEach((course) => {
        graphObjects.push({
          '@type': 'Course',
          name: course.name,
          description: course.description,
          provider: {
            '@type': 'EducationalOrganization',
            name: 'ASPIER Academy',
            sameAs: `${BASE_URL}/academy`
          },
          offers: {
            '@type': 'Offer',
            price: course.price ?? 0,
            priceCurrency: course.currency || 'BDT',
            availability: 'https://schema.org/InStock',
            validFrom: '2026-01-01'
          },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'Online',
            instructor: course.instructor
              ? {
                  '@type': 'Person',
                  name: course.instructor
                }
              : undefined
          }
        });
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
    coursesList,
    breadcrumbs,
    faqItems,
    googleSiteVerification
  ]);

  return null;
}

// Backward-compatible alias
export const SEO = SeoHead;
