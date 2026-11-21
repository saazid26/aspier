import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticNews } from '../../lib/staticData';

type Announcement = {
  _id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  publishedAt?: string;
};

export function Announcements() {
  const { data: remoteData } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get('/public/news', { params: { announcements: 'true' } })).data.data as Announcement[],
    initialData: staticNews as Announcement[]
  });
  const data = remoteData && remoteData.length > 0 ? remoteData : (staticNews as Announcement[]);

  return (
    <section className="section announcement-section">
      <div className="container announcement-container">
        <div className="section-head announcement-head">
          <div>
            <span className="eyebrow">Announcements</span>
            <h2>Latest Updates & News</h2>
          </div>
          <Link className="button button-secondary" to="/news">
            View all announcements
          </Link>
        </div>
        <div className="grid announcement-grid">
          {data.slice(0, 3).map((item) => {
            const targetUrl = `/announcements/${item.slug || item._id}`;
            return (
              <Link
                className="card image-card news-card announcement-card"
                key={item._id}
                to={targetUrl}
              >
                <CoverMedia
                  src={item.coverImage}
                  alt={`${item.title} cover`}
                  fallbackLabel={item.category || 'ASPIER announcement'}
                  className="news-card-media announcement-card-media"
                  fallbackClassName="news-cover-placeholder"
                />
                <div className="announcement-card-body">
                  <div className="announcement-card-content">
                    {item.category && <span className="announcement-category-tag">{item.category}</span>}
                    <h3>{item.title}</h3>
                    <RichTextContent className="muted" content={item.excerpt || ''} />
                  </div>
                  <div className="announcement-card-footer">
                    <span className="button button-secondary button-sm announcement-view-btn">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
