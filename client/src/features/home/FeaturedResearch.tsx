import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';

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
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['research-featured'],
    queryFn: async () => (await api.get('/public/research', { params: { category: 'ongoing' } })).data.data as FeaturedItem[]
  });
  const featured = data.filter((item) => item.featured).slice(0, 3);

  return <section className="section featured-research-section">
    <div className="container featured-research-container">
      <div className="section-head featured-research-head"><div><span className="eyebrow">Featured research</span><h2>Current inquiry</h2></div></div>
      {isLoading && <p role="status">Loading featured research…</p>}
      {isError && <p role="alert">Could not load featured research. Please try again later.</p>}
      {!isLoading && !isError && featured.length === 0 && <p className="muted">No current inquiries are featured yet.</p>}
      <div className="grid featured-research-grid">{featured.map((item) => <Link className="card image-card research-card" key={item._id} to={`/research/${item.slug}`}>
        <CoverMedia
          src={item.coverImage}
          alt={`${item.title} cover`}
          fallbackLabel="Current inquiry"
          className="research-card-image"
          fallbackClassName="research-cover-placeholder research-cover-ongoing"
        />
        {item.sampleData ? <span className="badge-sample">Sample research</span> : <span className="eyebrow">Current inquiry</span>}
        <h3>{item.title}</h3>
        <RichTextContent className="muted" content={item.abstract}/>
      </Link>)}</div>
    </div>
  </section>;
}
