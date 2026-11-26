import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCourseFee } from '../../lib/format';
import { SEO } from '../../components/common/SEO';
import { usePageSEO } from '../../hooks/usePageSEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticCourses } from '../../lib/staticData';
import { useMe } from '../auth/useMe';

type Course = {
  _id: string;
  slug?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  price: number;
  duration?: string;
  mode?: string;
  deliveryMode?: string;
  startDate?: string;
  sampleData?: boolean;
};

function normalizeDeliveryMode(mode?: string) {
  if (mode === 'Online / Live' || mode === 'Online and Live') return 'Online and Live';
  if (mode === 'In-Person Workshop' || mode === 'Offline' || mode === 'Offline (Physical)') return 'In-Person Workshop';
  return 'Online and Recorded';
}

function formatFooterLabel(startDate?: string, deliveryMode?: string) {
  const normalizedMode = normalizeDeliveryMode(deliveryMode);
  if (normalizedMode === 'Online and Recorded') {
    return 'Available Now';
  }
  if (!startDate || /instant access/i.test(startDate)) return 'Course Fee';
  const date = new Date(startDate);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(startDate)) {
    const formatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return startUtc > todayUtc ? `Starts from ${formatted}` : `Started on ${formatted}`;
  }
  return 'Course Fee';
}

export function Catalog() {
  const { me } = useMe();
  const { data: remoteData } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/academy/courses')).data.data as Course[],
    initialData: staticCourses as Course[]
  });
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments-catalog', me?._id],
    queryFn: async () => (await api.get('/academy/my-enrollments')).data.data as any[],
    enabled: Boolean(me)
  });

  const enrollmentByCourseId = new Map<string, string>();
  for (const enr of myEnrollments) {
    const cid = String(enr?.courseId?._id || enr?.courseId || '');
    if (cid && enr?.status) enrollmentByCourseId.set(cid, enr.status);
  }

  const data = remoteData && remoteData.length > 0 ? remoteData : (staticCourses as Course[]);
  const academyTitle = 'Online Research Paper Writing, Methodology & AI Productivity Courses in Bangladesh | ASPIER Academy';
  const academyDescription =
    'Step-by-step online live and recorded courses in academic research methodology, literature review, Scopus journal publication, and AI workflow automation for students, researchers, and professionals.';
  usePageSEO({
    title: academyTitle,
    description: academyDescription,
    path: '/academy'
  });

  return (
    <main className="container section academy-catalog">
      <SEO
        title={academyTitle}
        exact
        description={academyDescription}
        keywords="academic research methodology course online, how to write and publish a research paper for beginners, AI tools training for students researchers and professionals, thesis and publication guidance for undergraduate students"
        canonicalPath="/academy"
        coursesList={data.map((c) => ({
          name: c.title,
          description: c.description ? c.description.replace(/<[^>]+>/g, '').slice(0, 300) : c.title,
          price: c.price,
          currency: 'BDT',
          category: c.mode
        }))}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'ASPIER Academy', path: '/academy' }
        ]}
      />
      <header className="academy-catalog-header">
        <span className="eyebrow">ASPIER Academy</span>
        <h1>Research learning for every stage</h1>
        <p className="muted">Courses are managed in Admin → ASPIER Academy / Courses.</p>
        <div className="academy-header-actions">
          <Link className="button button-primary" to="/academy/register">Register</Link>
          <Link className="button button-secondary" to="/academy/student">Student Portal</Link>
        </div>
      </header>
      <div className="grid academy-course-grid">
        {data.map((course) => (
          <Link
            className="card image-card course-card"
            key={course._id}
            to={`/academy/courses/${course.slug || course._id}`}
          >
            <CoverMedia
              src={course.thumbnail}
              alt={`${course.title} course thumbnail`}
              fallbackLabel={course.title}
              className="course-card-media"
              imageClassName="card-cover"
              fallbackClassName="course-image-placeholder"
            />
            <div className="course-card-body">
              <div className="course-card-content">
                <h2 className="course-card-title" title={course.title}>
                  {course.title}
                </h2>
                <RichTextContent className="muted course-description" content={course.description} />
                <div className="course-card-meta">
                  {course.duration && <span>{course.duration}</span>}
                  <span>{normalizeDeliveryMode(course.deliveryMode || course.mode)}</span>
                </div>
              </div>
              <div className="course-card-footer">
                {(() => {
                  const enrStatus = enrollmentByCourseId.get(String(course._id));
                  if (enrStatus && ['active', 'approved', 'final_approved', 'completed'].includes(enrStatus)) {
                    return <span className="badge badge-green">Enrolled · Access Course →</span>;
                  }
                  if (enrStatus === 'pending') {
                    return <span className="badge badge-yellow">Enrollment Under Review</span>;
                  }
                  const footerLabel = formatFooterLabel(course.startDate, course.deliveryMode || course.mode);
                  return (
                    <>
                      {footerLabel === 'Available Now' ? (
                        <p className="course-start-date inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
                          <span>Available Now</span>
                        </p>
                      ) : (
                        <p className="course-start-date">{footerLabel}</p>
                      )}
                      <strong className="course-price">৳{formatCourseFee((course as any).fee ?? course.price)} BDT</strong>
                    </>
                  );
                })()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
