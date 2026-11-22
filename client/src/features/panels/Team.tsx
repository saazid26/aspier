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
  educationalBackground?: string;
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

  const foundingMembers: FoundingMember[] = (foundingMembersQuery.data && foundingMembersQuery.data.length > 0)
    ? foundingMembersQuery.data
    : (staticFoundingMembers as unknown as FoundingMember[]);

  const supervisors: Supervisor[] = (supervisorsQuery.data && supervisorsQuery.data.length > 0)
    ? supervisorsQuery.data
    : (staticSupervisors as unknown as Supervisor[]);

  const scholars: Scholar[] = (scholarsQuery.data && scholarsQuery.data.length > 0)
    ? scholarsQuery.data
    : (staticScholars as unknown as Scholar[]);

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
      <SEO title="ASPIER Team" description="Meet the ASPIER supervisors and research scholars." />
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
          <article className="card founder-card">
            <div className="founder-avatar-wrap mx-auto md:mx-0 flex justify-center md:justify-start">
              <ProfileAvatar name={founder.founderName || 'Md Saazid Bin Saif'} photo={founder.founderPhoto} className="profile-photo founder-profile-photo mx-auto md:mx-0" />
            </div>
            <div className="founder-copy">
              <span className="eyebrow founder-role-badge">Leadership</span>
              <h3>{founder.founderName || 'Md Saazid Bin Saif'}</h3>
              <h4>{founder.founderTitle || founder.founderDescription || 'Founder & Executive Director, ASPIER'}</h4>
              {founder.founderPhoto && founder.founderPhotoIsPlaceholder && (
                <span className="badge-sample">Illustrative avatar · replace with verified portrait</span>
              )}
              {founder.founderBio ? (
                <RichTextContent content={founder.founderBio} className="muted founder-bio" />
              ) : (
                <p className="muted founder-bio">
                  Founder of the Aeronautical, Spatial, Planetary Institute for Environmental Research (ASPIER), advancing collaborative inquiry, open data practices, and research education.
                </p>
              )}
              {!!founder.founderResearchDomains?.length && (
                <div className="domain-list">
                  {founder.founderResearchDomains.map((domain) => (
                    <span className="domain-chip" key={domain}>{domain}</span>
                  ))}
                </div>
              )}
              {/* Conditional academic and social media profile icons */}
              <AcademicSocialLinks member={founderLinks} className="founder-social-links" />
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
                {member.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
                <p className="muted founding-role" style={{ minHeight: 24 }}>
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
              <article className="card profile-card" key={supervisor._id}>
                <ProfileAvatar name={supervisor.name} photo={supervisor.photo} />
                <h3>
                  <Link to={`/supervisors/${supervisor.slug}`}>{supervisor.name}</Link>
                </h3>
                {supervisor.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
                <p className="muted" style={{ minHeight: 24 }}>
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
                {supervisor.educationalBackground && (
                  <p className="muted"><strong>Education:</strong> {supervisor.educationalBackground}</p>
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
              <article className="card profile-card" key={scholar._id}>
                <ProfileAvatar name={scholar.name} photo={scholar.photo} />
                <h3>
                  <Link to={`/scholars/${scholar.slug}`}>{scholar.name}</Link>
                </h3>
                {scholar.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
                <p className="muted">
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
                {scholar.educationalBackground && (
                  <p className="muted"><strong>Education:</strong> {scholar.educationalBackground}</p>
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
