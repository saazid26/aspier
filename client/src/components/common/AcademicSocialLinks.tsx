import React from 'react';
import { Globe, Linkedin, Github, Twitter } from 'lucide-react';

export type ProfileSocialMedia = {
  researchGate?: string;
  googleScholar?: string;
  linkedin?: string;
  orcid?: string;
  twitter?: string;
  github?: string;
  facebook?: string;
  website?: string;
  socialLinks?: {
    researchGate?: string;
    googleScholar?: string;
    linkedin?: string;
    orcid?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
    website?: string;
  };
};

function formatUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Crisp, lightweight inline SVG icons for academic and social networks
function ResearchGateIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.586 0c-.818 0-1.508.19-2.074.565-.566.377-.97.936-1.213 1.68a3.193 3.193 0 0 0-.112.437 8.363 8.363 0 0 0-.078.531c-.387.06-.74.14-1.06.242a4.408 4.408 0 0 0-.96.425c-.287.172-.533.37-.738.595-.205.225-.36.47-.465.736a2.203 2.203 0 0 0-.158.825c0 .356.09.673.272.951.18.277.433.504.757.68.324.177.712.305 1.164.384.453.078.948.118 1.487.118.176 0 .36-.005.553-.014.193-.01.385-.024.577-.044.02.26.03.504.03.731 0 .61-.064 1.15-.192 1.62-.128.471-.32.863-.576 1.176-.256.313-.574.544-.954.693-.38.15-.82.225-1.32.225-.49 0-.92-.08-1.29-.24-.37-.16-.67-.39-.9-.69-.23-.3-.39-.67-.48-1.11a6.11 6.11 0 0 1-.135-1.395c0-.67.065-1.31.195-1.92.13-.61.325-1.16.585-1.65.26-.49.58-.9.96-1.23.38-.33.82-.57 1.32-.72.5-.15 1.05-.225 1.65-.225.26 0 .52.015.78.045.26.03.5.075.72.135V2.37a5.53 5.53 0 0 0-.75-.135 6.47 6.47 0 0 0-.87-.06c-.84 0-1.62.11-2.34.33-.72.22-1.35.545-1.89.975-.54.43-.97.965-1.29 1.605-.32.64-.525 1.38-.615 2.22-.09.84-.135 1.765-.135 2.775 0 1.07.055 2.05.165 2.94.11.89.3 1.66.57 2.31.27.65.63 1.17 1.08 1.56.45.39.99.66 1.62.81.63.15 1.34.225 2.13.225.96 0 1.83-.12 2.61-.36.78-.24 1.44-.61 1.98-1.11.54-.5.94-1.14 1.2-1.92.26-.78.39-1.72.39-2.82 0-.28-.01-.57-.03-.87-.02-.3-.06-.59-.12-.87h-4.38v-2.04h7.02c.06.32.1.66.12 1.02.02.36.03.73.03 1.11 0 1.48-.2 2.78-.6 3.9-.4 1.12-1 2.05-1.8 2.79-.8.74-1.78 1.29-2.94 1.65-1.16.36-2.48.54-3.96.54-1.08 0-2.07-.12-2.97-.36-.9-.24-1.68-.61-2.34-1.11-.66-.5-1.18-1.14-1.56-1.92-.38-.78-.62-1.72-.72-2.82-.1-1.1-.15-2.36-.15-3.78 0-1.36.06-2.6.18-3.72.12-1.12.35-2.09.69-2.91.34-.82.8-1.5 1.38-2.04.58-.54 1.28-.94 2.1-1.2 1.04-.32 2.15-.48 3.33-.48.84 0 1.62.08 2.34.24.72.16 1.34.39 1.86.69l.54-2.19c-.66-.36-1.42-.64-2.28-.84A12.78 12.78 0 0 0 19.586 0z"/>
    </svg>
  );
}

function GoogleScholarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.8 3.8v6.2h2.4v-4.3L12 19l9.6-7.6V20h2.4V9.5L12 0z"/>
    </svg>
  );
}

function OrcidIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm-40.4 196.2H61.8V76.3h25.8v119.9zm-12.9-138c-8.9 0-16.1-7.2-16.1-16.1s7.2-16.1 16.1-16.1 16.1 7.2 16.1 16.1-7.2 16.1-16.1 16.1zm128.5 73.1c0 36.6-26.6 64.9-74.9 64.9H99.6V76.3h33.8c42.5 0 69.8 24.3 69.8 61.3zm-27.1 0c0-23.7-16.5-39.7-44.5-39.7h-7.6v79.4h7.6c27.5 0 44.5-16 44.5-39.7z"/>
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

type AcademicSocialLinksProps = {
  member: ProfileSocialMedia;
  className?: string;
};

export function AcademicSocialLinks({ member, className = '' }: AcademicSocialLinksProps) {
  // Collect all potential links, prioritizing direct fields then nested socialLinks
  const researchGate = member.researchGate || member.socialLinks?.researchGate;
  const googleScholar = member.googleScholar || member.socialLinks?.googleScholar;
  const linkedin = member.linkedin || member.socialLinks?.linkedin;
  const orcid = member.orcid || member.socialLinks?.orcid;
  const twitter = member.twitter || member.socialLinks?.twitter;
  const github = member.github || member.socialLinks?.github;
  const facebook = member.facebook || member.socialLinks?.facebook;
  const website = member.website || member.socialLinks?.website;

  const items = [
    {
      id: 'researchgate',
      label: 'ResearchGate',
      url: researchGate,
      icon: <ResearchGateIcon size={17} />,
      hoverClass: 'hover-rg'
    },
    {
      id: 'googlescholar',
      label: 'Google Scholar',
      url: googleScholar,
      icon: <GoogleScholarIcon size={17} />,
      hoverClass: 'hover-scholar'
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: linkedin,
      icon: <Linkedin size={17} />,
      hoverClass: 'hover-linkedin'
    },
    {
      id: 'orcid',
      label: 'ORCID',
      url: orcid,
      icon: <OrcidIcon size={17} />,
      hoverClass: 'hover-orcid'
    },
    {
      id: 'twitter',
      label: 'X (Twitter)',
      url: twitter,
      icon: <XIcon size={16} />,
      hoverClass: 'hover-x'
    },
    {
      id: 'github',
      label: 'GitHub',
      url: github,
      icon: <Github size={17} />,
      hoverClass: 'hover-github'
    },
    {
      id: 'facebook',
      label: 'Facebook',
      url: facebook,
      icon: <FacebookIcon size={17} />,
      hoverClass: 'hover-facebook'
    },
    {
      id: 'website',
      label: 'Website',
      url: website,
      icon: <Globe size={17} />,
      hoverClass: 'hover-website'
    }
  ];

  // STRICT CONDITIONAL RENDERING: Only keep links that have a non-empty, valid URL
  const validItems = items.filter((item) => {
    if (!item.url || typeof item.url !== 'string') return false;
    const trimmed = item.url.trim();
    return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== '#';
  });

  if (validItems.length === 0) return null;

  return (
    <div className={`academic-social-links ${className}`.trim()} role="group" aria-label="Academic & social profile links">
      {validItems.map((item) => {
        const href = formatUrl(item.url);
        return (
          <a
            key={item.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.label}
            aria-label={`${item.label} Profile`}
            className={`social-icon-btn ${item.hoverClass}`}
            onClick={(event) => event.stopPropagation()}
          >
            {item.icon}
          </a>
        );
      })}
    </div>
  );
}
