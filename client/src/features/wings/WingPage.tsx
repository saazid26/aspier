import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticWings, staticResearch } from '../../lib/staticData';

type ResearchItem = {
  _id: string;
  title: string;
  slug: string;
  category?: 'past' | 'present' | 'ongoing' | 'future';
  abstract?: string;
  coverImage?: string;
  authors?: string[];
  status?: string;
  publicationUrl?: string;
  doiUrl?: string;
};

export function WingPage() {
  const { slug } = useParams();
  const [activeResearchTab, setActiveResearchTab] = useState<'present' | 'past' | 'future'>('present');
  const fallback = staticWings.find((w) => w.slug === slug);
  const { data: remoteData, isError } = useQuery({
    queryKey: ['wing', slug],
    queryFn: async () => (await api.get(`/public/wings/${slug}`)).data.data,
    initialData: fallback
  });
  const data = remoteData || fallback;

  if (!data && isError) return <main className="container section" role="alert"><h1>Academic wing unavailable</h1><p className="muted">This wing may have moved or is temporarily unavailable.</p><Link className="button button-secondary" to="/wings">Back to wings</Link></main>;
  if (!data) return <main className="container section"><p role="status">Loading academic wing…</p></main>;

  // Combine wing research with static fallback research if empty
  const wingResearch: ResearchItem[] = (data.research && data.research.length > 0)
    ? data.research
    : staticResearch.map((r) => ({ ...r, category: r.category as any }));

  const pastResearch = wingResearch.filter((r) => r.category === 'past');
  const presentResearch = wingResearch.filter((r) => r.category === 'present' || r.category === 'ongoing' || !r.category);
  const futureResearch = wingResearch.filter((r) => r.category === 'future');

  const currentTabItems = activeResearchTab === 'past'
    ? pastResearch
    : activeResearchTab === 'future'
    ? futureResearch
    : presentResearch;

  return (
    <main className="container section">
      <SEO title={`${data.name} | ASPIER`} description={data.shortDescription || `Explore ${data.name} at ASPIER.`} />
      <CoverMedia src={data.coverImage} alt={`${data.name} cover`} fallbackLabel={data.name} className="research-detail-cover" fallbackClassName="wing-image-placeholder"/>
      <span className="eyebrow">Academic wing</span>
      <h1 style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>{data.name}</h1>
      <RichTextContent className="muted" content={data.description || data.shortDescription || ''}/>

      <div className="grid" style={{ marginTop: 24, marginBottom: 40 }}>
        <article className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Disciplines</h3>
          {data.disciplines?.map((item: string) => <p key={item} className="muted" style={{ margin: '0.25rem 0' }}>• {item}</p>)}
        </article>
        <article className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Objectives</h3>
          {Array.isArray(data.objectives)
            ? data.objectives.map((item: string) => <p key={item} className="muted" style={{ margin: '0.25rem 0' }}>• {item}</p>)
            : <RichTextContent content={data.objectives || 'Advancing foundational and applied research.'}/>
          }
        </article>
      </div>

      {/* EMBEDDED RESEARCH SECTION WITH 3 TABS */}
      <section className="wing-research-section" style={{ borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: '1.5rem' }}>
          <div>
            <span className="eyebrow">Wing Research & Publications</span>
            <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem' }}>Research Projects</h2>
          </div>
          {/* 3 Tabs: Past, Present, Future */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-muted, #f1f5f9)', padding: 4, borderRadius: 10, gap: 4 }}>
            <button
              type="button"
              className={`button ${activeResearchTab === 'present' ? 'button-primary' : 'button-secondary'}`}
              style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: 8 }}
              onClick={() => setActiveResearchTab('present')}
            >
              Present Research ({presentResearch.length})
            </button>
            <button
              type="button"
              className={`button ${activeResearchTab === 'past' ? 'button-primary' : 'button-secondary'}`}
              style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: 8 }}
              onClick={() => setActiveResearchTab('past')}
            >
              Past Research ({pastResearch.length})
            </button>
            <button
              type="button"
              className={`button ${activeResearchTab === 'future' ? 'button-primary' : 'button-secondary'}`}
              style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: 8 }}
              onClick={() => setActiveResearchTab('future')}
            >
              Future Research ({futureResearch.length})
            </button>
          </div>
        </div>

        {currentTabItems.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--surface-muted, #f8fafc)' }}>
            <p className="muted" style={{ margin: 0, fontSize: '1rem' }}>
              No {activeResearchTab} research projects listed under this wing yet. Check back soon for upcoming project announcements.
            </p>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {currentTabItems.map((item) => (
              <article
                className="card"
                key={item._id || item.slug}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  borderRadius: 12,
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'var(--surface, #ffffff)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {item.coverImage ? (
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    style={{ width: '100%', height: 180, objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ height: 120, background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                    {data.name}
                  </div>
                )}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge ${activeResearchTab === 'past' ? 'badge-gray' : activeResearchTab === 'future' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.75rem' }}>
                      {activeResearchTab === 'past' ? 'Completed' : activeResearchTab === 'future' ? 'Proposed' : 'Active / Present'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', lineHeight: 1.4, margin: '0.25rem 0 0.5rem 0' }}>
                    <Link to={`/wings/${slug}/research/${item.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.title}
                    </Link>
                  </h3>
                  {item.abstract && (
                    <p className="muted" style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1rem 0', flex: 1 }}>
                      {item.abstract.length > 150 ? `${item.abstract.slice(0, 150)}…` : item.abstract}
                    </p>
                  )}
                  {Array.isArray(item.authors) && item.authors.length > 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', margin: '0 0 1rem 0' }}>
                      <strong>Contributors:</strong> {item.authors.join(', ')}
                    </p>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle, #f1f5f9)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeResearchTab === 'past' && (item.publicationUrl || item.doiUrl) && (
                      <a
                        className="button button-primary read-paper-btn"
                        href={(item.publicationUrl || item.doiUrl)!.startsWith('http') ? (item.publicationUrl || item.doiUrl) : `https://${item.publicationUrl || item.doiUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                      >
                        <FileText size={15} />
                        Read Paper
                        <ExternalLink size={13} style={{ opacity: 0.8 }} />
                      </a>
                    )}
                    {activeResearchTab !== 'past' && (
                      <Link
                        className="button button-primary"
                        to={`/wings/apply-research?wing=${slug}&project=${item.slug}`}
                        style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                      >
                        Apply to Join Research
                      </Link>
                    )}
                    <Link className="button button-secondary" to={`/wings/${slug}/research/${item.slug}`} style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                      View Research Details →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
