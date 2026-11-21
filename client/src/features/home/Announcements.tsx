import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticNews } from '../../lib/staticData';

type Announcement = { _id: string; title: string; excerpt?: string; coverImage?: string; category?: string };

export function Announcements() {
  const { data: remoteData } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get('/public/news', { params: { announcements: 'true' } })).data.data as Announcement[],
    initialData: staticNews as Announcement[]
  });
  const data = remoteData && remoteData.length > 0 ? remoteData : (staticNews as Announcement[]);

  return <section className="section announcement-section"><div className="container announcement-container">
    <span className="eyebrow">Announcements</span>
    <div className="grid announcement-grid">
      {data.slice(0, 3).map((item) => <article className="card image-card news-card announcement-card" key={item._id}>
        <CoverMedia src={item.coverImage} alt={`${item.title} cover`} fallbackLabel={item.category || 'ASPIER announcement'} className="news-card-media announcement-card-media" fallbackClassName="news-cover-placeholder"/>
        <h3>{item.title}</h3><RichTextContent className="muted" content={item.excerpt || ''}/>
      </article>)}
    </div>
  </div></section>;
}
