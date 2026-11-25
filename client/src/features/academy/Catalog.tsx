import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticCourses } from '../../lib/staticData';

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
  if (mode === 'Online / Live') return 'Online and Live';
  if (mode === 'Online and Recorded' || mode === 'Online Recorded') return 'Online Recorded';
  return mode || 'Online Recorded';
}

function formatStartDate(startDate?: string, deliveryMode?: string) {
  if (deliveryMode === 'Online Recorded' || deliveryMode === 'Online and Recorded') {
    return 'Instant Access (Recorded)';
  }
  if (!startDate) return 'Starts: Upcoming Batch';
  const date = new Date(startDate);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(startDate)) {
    return `Starts: ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date)}`;
  }
  return `Starts: ${startDate}`;
}

export function Catalog() {
  const { data: remoteData } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/academy/courses')).data.data as Course[],
    initialData: staticCourses as Course[]
  });
  const data = remoteData && remoteData.length > 0 ? remoteData : (staticCourses as Course[]);

  return (
    <main className="container section academy-catalog">
      <SEO
        title="ASPIER Academy | Research Training, Scientific Writing & Technical Courses"
        exact
        description="Master scientific paper writing, geospatial data modeling, and machine learning research with ASPIER Academy courses taught by active researchers."
        keywords="ASPIER Academy, ASPIER Academy courses, ASPIER Academy student portal, Higher Study Oriented Basic to Advance Research Paper Writing Course, Responsible AI Foundations, Climate Data Modeling, Research Training Bangladesh, scientific writing course, research training, academic writing Bangladesh, scientific research academy"
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
                {course.sampleData && <span className="badge-sample">Sample course</span>}
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
                <p className="course-start-date">{formatStartDate(course.startDate, course.deliveryMode || course.mode)}</p>
                <strong className="course-price">৳{course.price} BDT</strong>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
