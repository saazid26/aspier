import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { AcademicSocialLinks } from '../../components/common/AcademicSocialLinks';
import { staticResearch, staticSupervisors, staticScholars } from '../../lib/staticData';

type ResearchDetailData = {
  _id: string;
  slug: string;
  title: string;
  category: 'ongoing' | 'present' | 'past' | 'future';
  abstract?: string;
  content?: string;
  objectives?: string;
  coverImage?: string;
  publicationUrl?: string;
  doiUrl?: string;
  sampleData?: boolean;
  authors?: string[];
  supervisors?: string[];
  linkedTeamMembers?: any[];
};

export function ResearchDetail() {
  const { slug, wingSlug } = useParams();
  const fallback = staticResearch.find((r) => r.slug === slug) as ResearchDetailData | undefined;
  const { data: remoteData, isError } = useQuery({
    queryKey: ['research', slug],
    queryFn: async () => (await api.get(`/public/research/${slug}`)).data.data as ResearchDetailData,
    initialData: fallback
  });
  const data = remoteData || fallback;

  // Query supervisors and scholars for fallback team links if needed
  const { data: supervisors = [] } = useQuery({
    queryKey: ['team-supervisors'],
    queryFn: async () => (await api.get('/public/supervisors')).data.data as any[]
  });
  const { data: scholars = [] } = useQuery({
    queryKey: ['team-scholars'],
    queryFn: async () => (await api.get('/public/scholars')).data.data as any[]
  });

  if (!data && isError) return (
    <main className="container section" role="alert">
      <h1>Research could not be loaded</h1>
      <p className="muted">This project may have moved or is temporarily unavailable.</p>
      <Link className="button button-secondary" to={wingSlug ? `/wings/${wingSlug}` : '/wings'}>
        Back to Wings
      </Link>
    </main>
  );
  if (!data) return <main className="container section"><p role="status">Loading research…</p></main>;

  const label = data.category === 'past' ? 'Past / Published Research' : data.category === 'future' ? 'Future Research' : 'Ongoing / Present Research';

  // Determine linked contributors: use linkedTeamMembers if present, otherwise auto-match from demo team
  let contributors = (data.linkedTeamMembers && data.linkedTeamMembers.length > 0)
    ? data.linkedTeamMembers
    : [];

  if (contributors.length === 0) {
    // Helpful fallback to show relevant scholars/supervisors if none explicitly linked yet
    const allKnown = [...(supervisors.length ? supervisors : staticSupervisors), ...(scholars.length ? scholars : staticScholars)];
    contributors = allKnown.slice(0, 2);
  }

  return (
    <main className="container section">
      <SEO title={`${data.title} | ASPIER Research`} description={data.abstract || `Research project: ${data.title}`} />
      <div style={{ marginBottom: '1rem' }}>
        <Link to={wingSlug ? `/wings/${wingSlug}` : '/wings'} style={{ fontSize: '0.9rem', color: 'var(--primary, #0f766e)', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to {wingSlug ? 'Academic Wing' : 'Academic Wings'}
        </Link>
      </div>
      <CoverMedia
        src={data.coverImage}
        alt={`${data.title} cover`}
        fallbackLabel={label}
        className="research-detail-cover"
        fallbackClassName={`research-cover-placeholder research-cover-${data.category}`}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
        <span className="badge badge-green">{label}</span>
        {data.sampleData && <span className="badge-sample">Sample research</span>}
      </div>
      <h1 style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>{data.title}</h1>
      <RichTextContent className="muted" content={data.abstract || ''}/>
      <RichTextContent content={data.content || data.abstract || ''} className="research-detail-content"/>
      {data.objectives && (
        <section className="research-objectives" style={{ marginTop: 24 }}>
          <h2>Research objectives</h2>
          <RichTextContent content={data.objectives}/>
        </section>
      )}
      {(data.publicationUrl || data.doiUrl) && (
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <a
            className="button button-primary read-paper-btn"
            href={(data.publicationUrl || data.doiUrl)!.startsWith('http') ? (data.publicationUrl || data.doiUrl) : `https://${data.publicationUrl || data.doiUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 9999,
              boxShadow: '0 4px 14px rgba(20, 143, 131, 0.25)'
            }}
          >
            <FileText size={18} />
            Read Paper
            <ExternalLink size={15} style={{ opacity: 0.85 }} />
          </a>
        </div>
      )}
      {data.category !== 'past' && (
        <div className="research-apply-cta" style={{ marginTop: 24 }}>
          <Link
            className="button button-primary"
            to={`/wings/apply-research?wing=${wingSlug || ''}&project=${data.slug}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
          >
            Apply to Join This Research (Research Mate)
          </Link>
        </div>
      )}

      {/* DEDICATED RESEARCH TEAM / CONTRIBUTORS SECTION */}
      {contributors && contributors.length > 0 && (
        <section className="section" style={{ marginTop: '3.5rem', borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: '2.5rem' }}>
          <div className="section-head" style={{ marginBottom: '1.5rem' }}>
            <div>
              <span className="eyebrow">Project Researchers</span>
              <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem' }}>Research Team / Contributors</h2>
              <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
                Scholars and faculty guiding and contributing to this investigation
              </p>
            </div>
          </div>
          <div className="grid">
            {contributors.map((member: any, mIdx: number) => (
              <article className="card profile-card" key={member._id || member.slug || member.name || mIdx}>
                <ProfileAvatar name={member.name} photo={member.photo || member.avatar} />
                <h3 style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                  {member.slug ? (
                    <Link to={member.role === 'scholar' || member.role === 'youngScholar' ? `/scholars/${member.slug}` : member.role === 'founder' ? '/team#founder' : `/supervisors/${member.slug}`}>
                      {member.name}
                    </Link>
                  ) : (
                    <span>{member.name}</span>
                  )}
                </h3>
                <p className="muted" style={{ minHeight: 24, fontSize: '0.9rem', margin: '0.25rem 0 0.5rem 0' }}>
                  {member.designation || member.roleTitle || member.role || 'ASPIER Researcher'}
                  {member.affiliation ? ` • ${member.affiliation}` : ''}
                </p>
                {(member.researchInterests || member.researchTopics || member.domains)?.length > 0 && (
                  <div className="domain-list" style={{ marginBottom: '0.75rem' }}>
                    {(member.researchInterests || member.researchTopics || member.domains).map((domain: string) => (
                      <span className="domain-chip" key={domain}>{domain}</span>
                    ))}
                  </div>
                )}
                {member.bio && (
                  <RichTextContent
                    content={member.bio}
                    className="muted"
                  />
                )}
                {member.educationalBackground && (
                  <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <strong>Education:</strong> {member.educationalBackground}
                  </p>
                )}
                {/* Academic & Social Media Links */}
                <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                  <AcademicSocialLinks member={member} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
