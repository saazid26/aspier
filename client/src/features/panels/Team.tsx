import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { AcademicSocialLinks, type ProfileSocialMedia } from '../../components/common/AcademicSocialLinks';
import { staticSupervisors, staticScholars, staticFoundingMembers } from '../../lib/staticData';

type FoundingMember = ProfileSocialMedia & {
  _id: string;
  name: string;
  slug: string;
  role?: string;
  designation?: string;
  affiliation?: string;
  bio?: string;
  photo?: string;
  researchInterests?: string[];
  educationalBackground?: string;
  order?: number;
  displayOrder?: number;
  sampleData?: boolean;
};

type Supervisor = ProfileSocialMedia & {
  _id: string;
  name: string;
  slug: string;
  designation?: string;
  affiliation?: string;
  bio?: string;
  photo?: string;
  researchInterests?: string[];
  educationalBackground?: string;
  education?: string;
  order?: number;
  displayOrder?: number;
  sampleData?: boolean;
};

type Scholar = ProfileSocialMedia & {
  _id: string;
  name: string;
  slug: string;
  cohort?: string;
  bio?: string;
  photo?: string;
  researchTopics?: string[];
  designation?: string;
  affiliation?: string;
  education?: string;
  educationalBackground?: string;
  order?: number;
  displayOrder?: number;
  sampleData?: boolean;
};

type Founder = {
  founderName?: string;
  founderPhoto?: string;
  founderBio?: string;
  founderDescription?: string;
  founderTitle?: string;
  founderResearchDomains?: string[];
  founderGoogleScholarId?: string;
  founderGoogleScholarUrl?: string;
  founderGoogleScholar?: string;
  founderResearchGate?: string;
  founderLinkedin?: string;
  founderOrcid?: string;
  founderTwitter?: string;
  founderGithub?: string;
  founderFacebook?: string;
  founderWebsite?: string;
  founderPhotoIsPlaceholder?: boolean;
};

export function Team() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace(/^#/, '');
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(targetId) ||
          (targetId === 'scholars' ? document.getElementById('young-scholars') : null) ||
          (targetId === 'young-scholars' ? document.getElementById('scholars') : null);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(scrollTimer);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  const founderQuery = useQuery({
    queryKey: ['team-founder'],
    queryFn: async () => (await api.get('/public/settings')).data.data as Founder
  });
  const foundingMembersQuery = useQuery({
    queryKey: ['team-founding-members'],
    queryFn: async () => (await api.get('/public/founding-members')).data.data as FoundingMember[]
  });
  const supervisorsQuery = useQuery({
    queryKey: ['team-supervisors'],
    queryFn: async () => (await api.get('/public/supervisors')).data.data as Supervisor[]
  });
  const scholarsQuery = useQuery({
    queryKey: ['team-scholars'],
    queryFn: async () => (await api.get('/public/scholars')).data.data as Scholar[]
  });

  const founder: Founder = founderQuery.data || {
    founderName: 'Md Saazid Bin Saif',
    founderTitle: 'Founder & Executive Director, ASPIER',
    founderDescription: 'Founder, ASPIER',
    founderBio: '<p>Founder of the Aeronautical, Spatial, Planetary Institute for Environmental Research (ASPIER), advancing collaborative inquiry, open data practices, and research education.</p>',
    founderResearchDomains: [
      'Aeronautical & Spatial Systems',
      'Environmental Research',
      'Remote Sensing & Geospatial Intelligence'
    ],
    founderGoogleScholar: 'https://scholar.google.com/',
    founderResearchGate: 'https://www.researchgate.net/',
    founderLinkedin: 'https://www.linkedin.com/',
    founderTwitter: 'https://x.com/'
  };

  const sortByOrder = <T extends { order?: number; displayOrder?: number }>(arr: T[]): T[] => {
    return [...arr].sort((a, b) => {
      const ordA = a.order ?? a.displayOrder ?? 999;
      const ordB = b.order ?? b.displayOrder ?? 999;
      return ordA - ordB;
    });
  };

  const foundingMembers: FoundingMember[] = sortByOrder(
    (foundingMembersQuery.data && foundingMembersQuery.data.length > 0)
      ? foundingMembersQuery.data
      : (staticFoundingMembers as unknown as FoundingMember[])
  );

  const supervisors: Supervisor[] = sortByOrder(
    (supervisorsQuery.data && supervisorsQuery.data.length > 0)
      ? supervisorsQuery.data
      : (staticSupervisors as unknown as Supervisor[])
  );

  const scholars: Scholar[] = sortByOrder(
    (scholarsQuery.data && scholarsQuery.data.length > 0)
      ? scholarsQuery.data
      : (staticScholars as unknown as Scholar[])
  );

  const founderLinks: ProfileSocialMedia = {
    researchGate: founder.founderResearchGate,
    googleScholar: founder.founderGoogleScholar || founder.founderGoogleScholarUrl,
    linkedin: founder.founderLinkedin,
    orcid: founder.founderOrcid,
    twitter: founder.founderTwitter,
    github: founder.founderGithub,
    facebook: founder.founderFacebook,
    website: founder.founderWebsite
  };

  return (
    <>
      <SEO
        title="Research Supervisors, Young Scholars & Research Mates | ASPIER"
        exact
        description="Meet the multidisciplinary research leadership, university supervisors, young scholars, and research mates driving discovery at ASPIER."
        keywords="ASPIER team, ASPIER Research Supervisors, ASPIER Young Scholars, ASPIER Research Mate, aerospace researchers, planetary scientists, environmental scientists, ASPIER faculty mentors"
        canonicalPath="/team"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Team', path: '/team' }
        ]}
      />
      <section className="team-hero">
        <div className="container">
          <span className="eyebrow">ASPIER Team</span>
          <h1>Meet the ASPIER Team</h1>
          <p className="muted" style={{ maxWidth: 720, fontSize: '1.12rem', lineHeight: 1.75 }}>
            Our supervisors and scholars connect rigorous inquiry with interdisciplinary research and meaningful public impact.
          </p>
        </div>
      </section>

      {/* DEDICATED FOUNDER SECTION */}
      <section className="section founder-section" id="founder">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Vision & Leadership</span>
              <h2>Meet our Founder</h2>
            </div>
          </div>
          <article className="card founder-card flex flex-col md:flex-row items-center md:items-stretch lg:items-center gap-6 md:gap-8 lg:gap-10 p-6 md:p-8 lg:p-10">
            <div className="founder-avatar-wrap shrink-0 w-44 h-44 sm:w-52 sm:h-52 md:w-[230px] md:h-auto lg:w-[275px] xl:w-[300px] md:aspect-[4/5] md:min-h-[280px] lg:min-h-[330px] mx-auto md:mx-0 flex justify-center">
              <div className="founder-portrait-frame relative w-full h-full rounded-2xl overflow-hidden border border-emerald-900/15 shadow-md bg-emerald-50/40">
                <ProfileAvatar
                  name={founder.founderName || 'Md Saazid Bin Saif'}
                  photo={founder.founderPhoto}
                  className="founder-profile-photo w-full h-full"
                />
              </div>
            </div>
            <div className="founder-copy flex-1 text-center md:text-left flex flex-col items-center md:items-start min-w-0">
              <span className="eyebrow founder-role-badge">Leadership</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 mb-1">
                {founder.founderName || 'Md Saazid Bin Saif'}
              </h3>
              <h4 className="text-base sm:text-lg font-semibold text-teal-800 mb-4">
                {founder.founderTitle || founder.founderDescription || 'Founder & Executive Director, ASPIER'}
              </h4>
              {founder.founderBio ? (
                <RichTextContent content={founder.founderBio} className="muted founder-bio text-justify leading-relaxed text-sm sm:text-base text-slate-600 space-y-4 hyphens-none break-normal" />
              ) : (
                <p className="muted founder-bio text-justify leading-relaxed text-sm sm:text-base text-slate-600 space-y-4 hyphens-none break-normal">
                  Founder of the Aeronautical, Spatial, Planetary Institute for Environmental Research (ASPIER), advancing collaborative inquiry, open data practices, and research education.
                </p>
              )}
              {!!founder.founderResearchDomains?.length && (
                <div className="domain-list mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                  {founder.founderResearchDomains.map((domain) => (
                    <span className="domain-chip" key={domain}>{domain}</span>
                  ))}
                </div>
              )}
              {/* Conditional academic and social media profile icons */}
              <div className="mt-5 w-full flex justify-center md:justify-start">
                <AcademicSocialLinks member={founderLinks} className="founder-social-links" />
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* MEET OUR FOUNDING MEMBERS SECTION */}
      <section className="section founding-members-section" id="founding-members">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Foundation & Co-Creators</span>
              <h2>Meet our Founding Members</h2>
            </div>
          </div>
          <div className="founding-members-grid">
            {foundingMembers.map((member) => (
              <article className="card profile-card founding-card" key={member._id}>
                <ProfileAvatar name={member.name} photo={member.photo} />
                <h3>{member.name}</h3>
                <p className="muted founding-role">
                  <span style={{ color: '#0d736e', fontWeight: 600 }}>{member.role || member.designation || 'Founding Member'}</span>
                  {member.affiliation ? ` • ${member.affiliation}` : ''}
                </p>
                <div className="domain-list">
                  {(member.researchInterests || []).map((domain) => (
                    <span className="domain-chip" key={domain}>{domain}</span>
                  ))}
                </div>
                <div className="founding-bio-wrap">
                  <RichTextContent
                    content={member.bio || 'ASPIER founding member advancing collaborative inquiry and research education.'}
                    className="muted founding-bio-clamp"
                  />
                  {member.educationalBackground && (
                    <p className="muted" style={{ marginTop: '6px', fontSize: '0.86rem' }}><strong>Education:</strong> {member.educationalBackground}</p>
                  )}
                </div>
                {/* Conditional academic and social media profile icons */}
                <AcademicSocialLinks member={member} className="academic-social-links-center" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SUPERVISORS SECTION */}
      <section className="section" id="supervisors">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Leadership & Guidance</span>
              <h2>Meet our Supervisors</h2>
            </div>
          </div>
          <div className="grid">
            {supervisors.map((supervisor) => (
              <article className="card profile-card supervisor-card" key={supervisor._id}>
                <ProfileAvatar name={supervisor.name} photo={supervisor.photo} />
                <h3>
                  <Link to={`/supervisors/${supervisor.slug}`}>{supervisor.name}</Link>
                </h3>
                <p className="muted profile-role">
                  {supervisor.designation}{supervisor.affiliation ? ` • ${supervisor.affiliation}` : ''}
                </p>
                <div className="domain-list">
                  {(supervisor.researchInterests || []).map((domain) => (
                    <span className="domain-chip" key={domain}>{domain}</span>
                  ))}
                </div>
                <RichTextContent
                  content={supervisor.bio || 'ASPIER supervisor advancing interdisciplinary research.'}
                  className="muted"
                />
                {(supervisor.education || supervisor.educationalBackground) && (
                  <p className="muted"><strong>Education:</strong> {supervisor.education || supervisor.educationalBackground}</p>
                )}
                {/* Conditional academic and social media profile icons */}
                <AcademicSocialLinks member={supervisor} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* YOUNG SCHOLARS SECTION */}
      <section
        className="section"
        id="young-scholars"
        style={{ background: 'rgba(255,255,255,.018)', borderBlock: '1px solid rgba(255,255,255,.06)' }}
      >
        <span id="scholars" style={{ position: 'relative', top: '-86px', display: 'block', visibility: 'hidden' }} />
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Research Community</span>
              <h2>Meet our Young Scholars</h2>
            </div>
          </div>
          <div className="grid">
            {scholars.map((scholar) => (
              <article className="card profile-card scholar-card" key={scholar._id}>
                <ProfileAvatar name={scholar.name} photo={scholar.photo} />
                <h3>
                  <Link to={`/scholars/${scholar.slug}`}>{scholar.name}</Link>
                </h3>
                <p className="muted profile-role">
                  ASPIER Scholar{scholar.cohort ? ` • Cohort ${scholar.cohort}` : ''}
                </p>
                <div className="domain-list">
                  {(scholar.researchTopics || []).map((domain) => (
                    <span className="domain-chip" key={domain}>{domain}</span>
                  ))}
                </div>
                <RichTextContent
                  content={scholar.bio || 'Conducting focused research across ASPIER academic wings.'}
                  className="muted"
                />
                {(scholar.designation || scholar.affiliation) && (
                  <p className="muted">{[scholar.designation, scholar.affiliation].filter(Boolean).join(' · ')}</p>
                )}
                {(scholar.education || scholar.educationalBackground) && (
                  <p className="muted"><strong>Education:</strong> {scholar.education || scholar.educationalBackground}</p>
                )}
                {/* Conditional academic and social media profile icons */}
                <AcademicSocialLinks member={scholar} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BECOME AN ASPIER SCHOLAR CTA */}
      <section className="section apply-section" id="apply">
        <div className="container">
          <div className="cta-band apply-cta-band">
            <div>
              <span className="eyebrow">Join the community</span>
              <h2>Become an ASPIER scholar</h2>
              <p className="muted" style={{ marginTop: 6, maxWidth: 560 }}>
                Collaborate across aeronautical, spatial, planetary, and environmental research wings. Submit your interest to start your fellowship journey.
              </p>
            </div>
            <Link className="button button-primary button-lg" to="/join">Submit your interest</Link>
          </div>
        </div>
      </section>
    </>
  );
}
