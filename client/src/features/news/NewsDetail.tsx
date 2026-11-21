import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';

export function NewsDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['news', slug],
    queryFn: async () => (await api.get(`/public/news/${slug}`)).data.data
  });
  if (isLoading) return <main className="container section"><p role="status">Loading news…</p></main>;
  if (isError || !data) return <main className="container section" role="alert"><h1>News item unavailable</h1><p className="muted">This story may have moved or is temporarily unavailable.</p><Link className="button button-secondary" to="/news">Back to news</Link></main>;
  return <main className="container section">
    <CoverMedia src={data.coverImage} alt={`${data.title} cover`} fallbackLabel={data.category || 'News & announcements'} className="research-detail-cover" fallbackClassName="news-cover-placeholder"/>
    {data.sampleData && <span className="badge-sample">Sample announcement</span>}
    <h1>{data.title}</h1>
    <RichTextContent className="muted" content={data.excerpt || ''}/>
    <RichTextContent content={data.content || ''}/>
  </main>;
}
