import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { useMe } from '../auth/useMe';
import { staticCourses } from '../../lib/staticData';

export function CourseDetail() {
  const { id } = useParams();
  const { me } = useMe();
  const fallback = staticCourses.find((c) => c.slug === id || c._id === id);
  const { data: remoteData, isError } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => (await api.get(`/academy/courses/${id}`)).data.data,
    initialData: fallback
  });
  const data = remoteData || fallback;

  const deliveryMode = data?.deliveryMode || data?.mode;
  const normalizedDeliveryMode = deliveryMode === 'Online / Live' ? 'Online and Live' : deliveryMode || 'Online and Live';
  const formatStartDate = (startDate?: string) => {
    if (!startDate) return 'Upcoming Batch';
    const date = new Date(startDate);
    if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(startDate)) {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
    }
    return startDate;
  };

  if (!data && isError) return <main className="container section"><h1>Course unavailable</h1><p className="muted">This course may have been unpublished or removed.</p><Link to="/academy">Back to Academy</Link></main>;
  if (!data) return <main className="container section"><p role="status">Loading course…</p></main>;

  return <main className="container section">
    <SEO title={`${data.title} | ASPIER Academy`} description={data.description || `Course details for ${data.title}`} />
    <CoverMedia src={data.thumbnail} alt={`${data.title} course banner`} fallbackLabel={data.title} className="research-detail-cover course-detail-cover" fallbackClassName="course-image-placeholder"/>
    {data.sampleData && <span className="badge-sample">Sample course</span>}
    <span className="eyebrow">{data.level} course · ASPIER Academy</span>
    <h1>{data.title}</h1>
    <RichTextContent className="muted course-overview" content={data.description}/>
    <dl className="course-metadata">
      {data.duration && <div><dt>Duration</dt><dd>{data.duration}</dd></div>}
      <div><dt>Delivery Mode</dt><dd>{normalizedDeliveryMode}</dd></div>
      <div><dt>Course Start Date</dt><dd>{formatStartDate(data.startDate)}</dd></div>
      {data.targetAudience && <div><dt>Target audience</dt><dd>{data.targetAudience}</dd></div>}
    </dl>
    <div className="course-enroll-bar">
      <strong style={{ fontSize: '1.5rem' }}>৳{data.price} BDT</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link className="button button-primary" to={`/academy/courses/${id}/payment`}>Enroll & pay</Link>
        {!me && (
          <span className="muted" style={{ fontSize: '0.88rem' }}>
            New learner? <Link to={`/academy/register?redirect=${encodeURIComponent(`/academy/courses/${id}/payment`)}`} style={{ textDecoration: 'underline' }}>Create account</Link>
          </span>
        )}
      </div>
    </div>
    {data.enrollmentContact && <RichTextContent className="muted" content={data.enrollmentContact}/>}
    <h2>Course syllabus</h2>
    <div className="grid">{data.modules?.map((module: any) => <article className="card" key={module._id || module.title}>
      <h3>{module.title}</h3>
      <ol>{module.lessons?.map((lesson: any) => <li key={lesson._id || lesson.title}>{lesson.title}</li>)}</ol>
    </article>)}</div>
  </main>;
}
