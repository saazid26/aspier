import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';

type NewsItem = { _id: string; slug: string; title: string; excerpt?: string; coverImage?: string; category?: string; sampleData?: boolean };

export function NewsList() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['news'],
    queryFn: async () => (await api.get('/public/news')).data.data as NewsItem[]
  });
  return <section className="section"><div className="container">
    <h1>News & announcements</h1>
    {isLoading && <p role="status">Loading news…</p>}
    {isError && <p role="alert">Could not load news. Please try again later.</p>}
    {!isLoading && !isError && data.length === 0 && <p className="muted">No news has been published yet.</p>}
    <div className="grid announcement-grid news-grid">{data.map((item) => <Link className="card image-card news-card" key={item._id} to={`/news/${item.slug}`}>
      <CoverMedia src={item.coverImage} alt={`${item.title} cover`} fallbackLabel={item.category || 'News & announcements'} className="news-card-media" imageClassName="card-cover" fallbackClassName="news-cover-placeholder"/>
      {item.sampleData && <span className="badge-sample">Sample announcement</span>}
      <h3>{item.title}</h3><RichTextContent className="muted" content={item.excerpt || ''}/>
    </Link>)}</div>
  </div></section>;
}
