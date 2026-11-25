import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticResearch } from '../../lib/staticData';

type FeaturedItem = {
  _id: string;
  slug: string;
  title: string;
  abstract?: string;
  coverImage?: string;
  featured?: boolean;
  category?: string;
  sampleData?: boolean;
};

export function FeaturedResearch() {
  const { data: remoteData } = useQuery({
    queryKey: ['research-featured'],
    queryFn: async () => (await api.get('/public/research', { params: { category: 'ongoing' } })).data.data as FeaturedItem[],
    initialData: staticResearch as FeaturedItem[]
  });
  const data = remoteData && remoteData.length > 0 ? remoteData : (staticResearch as FeaturedItem[]);
  const featured = data.filter((item) => item.featured !== false).slice(0, 3);

  return <section className="section featured-research-section">
    <div className="container featured-research-container">
      <div className="section-head featured-research-head"><div><span className="eyebrow">Featured research</span><h2>Current inquiry</h2></div></div>
      {featured.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--surface-muted, #f8fafc)' }}>
          <p className="muted" style={{ margin: 0, fontSize: '1rem' }}>No active inquiries published yet.</p>
        </div>
      ) : (
        <div className="grid featured-research-grid">{featured.map((item) => <Link className="card image-card research-card" key={item._id} to={`/research/${item.slug}`}>
          <CoverMedia
            src={item.coverImage}
            alt={`${item.title} cover`}
            fallbackLabel="Current inquiry"
            className="research-card-image"
            fallbackClassName="research-cover-placeholder research-cover-ongoing"
          />
          <div className="research-card-body">
            {item.sampleData ? <span className="badge-sample">Sample research</span> : <span className="eyebrow">Current inquiry</span>}
            <h3>{item.title}</h3>
            <RichTextContent className="muted" content={item.abstract}/>
          </div>
        </Link>)}</div>
      )}
    </div>
  </section>;
}
