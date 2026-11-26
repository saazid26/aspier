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
  courseMode?: string;
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

const DEFAULT_TITLE = 'Research Paper Writing Courses, AI Productivity Training & Research Mentorship in Bangladesh | ASPIER';
const DEFAULT_DESCRIPTION =
  'Build a strong research profile for higher studies abroad: learn how to write and publish a research paper in Scopus journals, master AI productivity tools, and collaborate with PhD research supervisors in Bangladesh.';
const DEFAULT_KEYWORDS =
  'research paper writing course in Bangladesh, research experience for higher studies abroad from Bangladesh, AI productivity course in Bangladesh, find a research supervisor in Bangladesh, research mentorship program for undergraduate and graduate students';

const DEFAULT_IMAGE = 'https://aspierglobal.vercel.app/aspier-logo.png';
const BASE_URL =
  typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://aspierglobal.vercel.app';

const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'How can I learn to write and publish a research paper in Bangladesh for higher studies abroad?',
    answer:
      'You can enroll in the Higher Study-Oriented Research Paper Writing Course at ASPIER Academy (https://aspierglobal.vercel.app/academy), which provides step-by-step online training in topic selection, Scopus and Web of Science literature search, IMRaD manuscript writing, data analysis, and peer-reviewed journal submission for higher studies abroad.'
  },
  {
    question: 'What is the best online course for academic research methodology, Scopus literature review, and IMRaD manuscript writing?',
    answer:
      'ASPIER Academy\'s Higher Study-Oriented Research Paper Writing Course covers end-to-end academic research methodology, systematic Scopus and Web of Science literature reviews, reference management, IMRaD manuscript structuring, and journal publication workflows with mentor guidance.'
  },
  {
    question: 'How can undergraduate or graduate students find a research supervisor and join a research team in Bangladesh?',
    answer:
      'Undergraduate and graduate students can browse active PhD and MSc mentors across 10 specialized research wings at https://aspierglobal.vercel.app/team and apply directly through the Young Scholar & Research Supervisor application portal at https://aspierglobal.vercel.app/join to collaborate on peer-reviewed publications.'
  },
  {
    question: 'Which AI tools and productivity workflows are taught in the Advanced AI Productivity Masterclass?',
    answer:
      'The Advanced AI Productivity Masterclass: Work Smarter with AI is an 8-week live online training program teaching practical Artificial Intelligence tools, prompt engineering, workflow automation, AI-assisted research analysis, and professional productivity workflows.'
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
    setMetaTag('property', 'og:site_name', 'ASPIER Global');
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
          courseMode: courseSchema.courseMode || 'Online',
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
