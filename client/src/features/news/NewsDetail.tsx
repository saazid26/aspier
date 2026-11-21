import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticNews } from '../../lib/staticData';

type NewsItem = {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  category?: string;
  publishedAt?: string;
  isAnnouncement?: boolean;
  sampleData?: boolean;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function NewsDetail() {
  const { slug } = useParams();

  const staticFallback = (staticNews as unknown as NewsItem[]).find(
    (n) => n.slug === slug || n._id === slug
  );

  const { data: remoteData, isLoading, isError } = useQuery({
    queryKey: ['news', slug],
    queryFn: async () => (await api.get(`/public/news/${slug}`)).data.data as NewsItem,
    initialData: staticFallback
  });

  const data = remoteData || staticFallback;

  if (isLoading && !data) {
    return (
      <main className="container section">
        <p role="status">Loading announcement…</p>
      </main>
    );
  }

  if ((isError && !data) || !data) {
    return (
      <main className="container section" role="alert">
        <h1>Announcement unavailable</h1>
        <p className="muted">This announcement may have moved or is temporarily unavailable.</p>
        <Link className="button button-secondary" to="/news">
          &larr; Back to announcements
        </Link>
      </main>
    );
  }

  const categoryLabel = data.category || (data.isAnnouncement ? 'Announcement' : 'Notice');
  const formattedDate = formatDate(data.publishedAt);

  return (
    <main className="container section announcement-detail-page">
      <SEO
        title={`${data.title} | ASPIER Announcement`}
        description={data.excerpt || data.title}
      />
      <div className="detail-navigation-bar">
        <Link className="detail-back-link" to="/news">
          &larr; Back to all announcements & news
        </Link>
      </div>

      <article className="announcement-article card">
        <CoverMedia
          src={data.coverImage}
          alt={`${data.title} banner`}
          fallbackLabel={categoryLabel}
          className="research-detail-cover announcement-detail-cover"
          fallbackClassName="news-cover-placeholder"
        />

        <div className="announcement-article-header">
          <div className="announcement-meta-row">
            <span className="eyebrow announcement-eyebrow">{categoryLabel}</span>
            {formattedDate && (
              <span className="announcement-date-badge">Published on {formattedDate}</span>
            )}
            {data.sampleData && <span className="badge-sample">Sample announcement</span>}
          </div>
          <h1 className="announcement-article-title">{data.title}</h1>
          {data.excerpt && (
            <div className="announcement-article-lead">
              <RichTextContent className="muted" content={data.excerpt} />
            </div>
          )}
        </div>

        <div className="announcement-article-body">
          <RichTextContent content={data.content || data.excerpt || ''} />
        </div>
      </article>
    </main>
  );
}
