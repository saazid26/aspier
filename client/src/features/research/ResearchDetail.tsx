import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticResearch } from '../../lib/staticData';

type ResearchDetailData = {
  _id: string;
  slug: string;
  title: string;
  category: 'ongoing' | 'past' | 'future';
  abstract?: string;
  content?: string;
  objectives?: string;
  coverImage?: string;
  publicationUrl?: string;
  sampleData?: boolean;
};

export function ResearchDetail() {
  const { slug } = useParams();
  const fallback = staticResearch.find((r) => r.slug === slug) as ResearchDetailData | undefined;
  const { data: remoteData, isError } = useQuery({
    queryKey: ['research', slug],
    queryFn: async () => (await api.get(`/public/research/${slug}`)).data.data as ResearchDetailData,
    initialData: fallback
  });
  const data = remoteData || fallback;

  if (!data && isError) return <main className="container section" role="alert"><h1>Research could not be loaded</h1><p className="muted">This project may have moved or is temporarily unavailable.</p><Link className="button button-secondary" to="/research">Back to research</Link></main>;
  if (!data) return <main className="container section"><p role="status">Loading research…</p></main>;

  const label = data.category === 'past' ? 'Past / Published Research' : data.category === 'future' ? 'Future Research' : 'Ongoing Research';
  return <main className="container section">
    <SEO title={`${data.title} | ASPIER Research`} description={data.abstract || `Research project: ${data.title}`} />
    <CoverMedia
      src={data.coverImage}
      alt={`${data.title} cover`}
      fallbackLabel={label}
      className="research-detail-cover"
      fallbackClassName={`research-cover-placeholder research-cover-${data.category}`}
    />
    <span className="badge badge-green">{label}</span>
    {data.sampleData && <span className="badge-sample">Sample research</span>}
    <h1>{data.title}</h1>
    <RichTextContent className="muted" content={data.abstract || ''}/>
    <RichTextContent content={data.content || data.abstract || ''} className="research-detail-content"/>
    {data.objectives && <section className="research-objectives"><h2>Research objectives</h2><RichTextContent content={data.objectives}/></section>}
    {data.publicationUrl && <a className="publication-link" href={data.publicationUrl.startsWith('http') ? data.publicationUrl : `https://${data.publicationUrl}`} target="_blank" rel="noreferrer">{data.sampleData ? 'Sample publication reference' : 'Publication / DOI'}</a>}
    {data.category !== 'past' && <div className="research-apply-cta"><Link className="button button-primary" to={`/research?category=${data.category}&apply=${data._id}`}>Apply to Join Research</Link></div>}
  </main>;
}
