import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';

type Supervisor = {
  _id: string;
  name: string;
  slug: string;
  designation?: string;
  affiliation?: string;
  bio?: string;
  photo?: string;
  researchInterests?: string[];
  educationalBackground?: string;
  googleScholar?: string;
  researchGate?: string;
  orcid?: string;
  linkedin?: string;
  socialLinks?: { linkedin?: string };
  sampleData?: boolean;
};

type Scholar = {
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
  googleScholar?: string;
  researchGate?: string;
  orcid?: string;
  linkedin?: string;
  socialLinks?: { linkedin?: string };
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
  founderPhotoIsPlaceholder?: boolean;
};

export function Team() {
  const founderQuery = useQuery({
    queryKey: ['team-founder'],
    queryFn: async () => (await api.get('/public/settings')).data.data as Founder
  });
  const supervisorsQuery = useQuery({
    queryKey: ['team-supervisors'],
    queryFn: async () => (await api.get('/public/supervisors')).data.data as Supervisor[]
  });
  const scholarsQuery = useQuery({
    queryKey: ['team-scholars'],
    queryFn: async () => (await api.get('/public/scholars')).data.data as Scholar[]
  });
  const founder = founderQuery.data || {
    founderName: 'Md Saazid Bin Saif',
    founderTitle: 'Founder, ASPIER',
    founderResearchDomains: ['Aeronautical & Spatial Systems', 'Environmental Research', 'Remote Sensing & Geospatial Intelligence']
  };

  return <>
    <SEO title="ASPIER Team" description="Meet the ASPIER supervisors and research scholars."/>
    <section className="team-hero">
      <div className="container">
        <span className="eyebrow">ASPIER Team</span>
        <h1>Meet the ASPIER Team</h1>
        <p className="muted" style={{maxWidth:720,fontSize:'1.12rem',lineHeight:1.75}}>
          Our supervisors and scholars connect rigorous inquiry with interdisciplinary research and meaningful public impact.
        </p>
      </div>
    </section>

    <section className="section founder-section" id="founder">
      <div className="container">
        <div className="section-head">
          <div><span className="eyebrow">Vision & leadership</span><h2>Meet our Founder</h2></div>
        </div>
        {founderQuery.isError && <p className="applicant-error-message" role="alert">Could not load the latest founder profile.</p>}
        <article className="card founder-card">
          <ProfileAvatar name={founder.founderName || 'Md Saazid Bin Saif'} photo={founder.founderPhoto}/>
          <div className="founder-copy">
            <h3>{founder.founderName || 'Md Saazid Bin Saif'}</h3>
            <h4>{founder.founderTitle || founder.founderDescription || 'Founder, ASPIER'}</h4>
            {founder.founderPhoto && founder.founderPhotoIsPlaceholder && <span className="badge-sample">Illustrative avatar · replace with verified portrait</span>}
            {founder.founderGoogleScholarId && <p className="muted">Google Scholar ID: {founder.founderGoogleScholarId}</p>}
            {founder.founderGoogleScholarUrl && <a className="profile-external-link" href={founder.founderGoogleScholarUrl} target="_blank" rel="noreferrer">Google Scholar Profile</a>}
            {founder.founderBio && <RichTextContent content={founder.founderBio} className="muted"/>}
            {!!founder.founderResearchDomains?.length && <div className="domain-list">
              {founder.founderResearchDomains.map((domain) => <span className="domain-chip" key={domain}>{domain}</span>)}
            </div>}
          </div>
        </article>
      </div>
    </section>

    <section className="section" id="supervisors">
      <div className="container">
        <div className="section-head">
          <div><span className="eyebrow">Leadership & guidance</span><h2>Meet our Supervisors</h2></div>
        </div>
        {supervisorsQuery.isLoading && <p role="status">Loading supervisors…</p>}
        {supervisorsQuery.isError && <p className="applicant-error-message" role="alert">Could not load supervisors.</p>}
        {!supervisorsQuery.isLoading && !supervisorsQuery.isError && !supervisorsQuery.data?.length && <p className="muted">No supervisors are listed yet.</p>}
        <div className="grid">
          {(supervisorsQuery.data || []).map((supervisor) =>
            <article className="card profile-card" key={supervisor._id}>
              <ProfileAvatar name={supervisor.name} photo={supervisor.photo}/>
              <h3><Link to={`/supervisors/${supervisor.slug}`}>{supervisor.name}</Link></h3>
              {supervisor.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
              <p className="muted" style={{minHeight:24}}>{supervisor.designation}{supervisor.affiliation ? ` • ${supervisor.affiliation}` : ''}</p>
              <div className="domain-list">
                {(supervisor.researchInterests || []).map((domain) => <span className="domain-chip" key={domain}>{domain}</span>)}
              </div>
              <RichTextContent content={supervisor.bio || 'ASPIER supervisor advancing interdisciplinary research.'} className="muted"/>
              {supervisor.educationalBackground && <p className="muted"><strong>Education:</strong> {supervisor.educationalBackground}</p>}
              <ProfileLinks member={supervisor}/>
            </article>
          )}
        </div>
      </div>
    </section>

    <section className="section" id="scholars" style={{background:'rgba(255,255,255,.018)',borderBlock:'1px solid rgba(255,255,255,.06)'}}>
      <div className="container">
        <div className="section-head">
          <div><span className="eyebrow">Research community</span><h2>Meet our Young Scholars</h2></div>
        </div>
        {scholarsQuery.isLoading && <p role="status">Loading scholars…</p>}
        {scholarsQuery.isError && <p className="applicant-error-message" role="alert">Could not load scholars.</p>}
        {!scholarsQuery.isLoading && !scholarsQuery.isError && !scholarsQuery.data?.length && <p className="muted">No scholars are listed yet.</p>}
        <div className="grid">
          {(scholarsQuery.data || []).map((scholar) =>
            <article className="card profile-card" key={scholar._id}>
              <ProfileAvatar name={scholar.name} photo={scholar.photo}/>
              <h3><Link to={`/scholars/${scholar.slug}`}>{scholar.name}</Link></h3>
              {scholar.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
              <p className="muted">ASPIER Scholar{scholar.cohort ? ` • Cohort ${scholar.cohort}` : ''}</p>
              <div className="domain-list">
                {(scholar.researchTopics || []).map((domain) => <span className="domain-chip" key={domain}>{domain}</span>)}
              </div>
              <RichTextContent content={scholar.bio || 'Conducting focused research across ASPIER academic wings.'} className="muted"/>
              {(scholar.designation || scholar.affiliation) && <p className="muted">{[scholar.designation, scholar.affiliation].filter(Boolean).join(' · ')}</p>}
              {scholar.educationalBackground && <p className="muted"><strong>Education:</strong> {scholar.educationalBackground}</p>}
              <ProfileLinks member={scholar}/>
            </article>
          )}
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="cta-band">
          <div><span className="eyebrow">Join the community</span><h2>Become an ASPIER scholar</h2></div>
          <Link className="button button-primary" to="/join">Submit your interest</Link>
        </div>
      </div>
    </section>
  </>;
}

function ProfileLinks({ member }: { member: Supervisor | Scholar }) {
  const links = [
    ['Google Scholar', member.googleScholar],
    ['ResearchGate', member.researchGate],
    ['ORCID', member.orcid],
    ['LinkedIn', member.linkedin || member.socialLinks?.linkedin]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (!links.length) return null;
  return <div className="profile-external-links">{links.map(([label, url]) =>
    <a key={label} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{label}</a>
  )}</div>;
}
