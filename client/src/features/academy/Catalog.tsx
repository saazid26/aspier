import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';

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
  return mode || 'Online and Live';
}

function formatStartDate(startDate?: string) {
  if (!startDate) return 'Starts: Upcoming Batch';
  const date = new Date(startDate);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(startDate)) {
    return `Starts: ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date)}`;
  }
  return `Starts: ${startDate}`;
}

export function Catalog() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/academy/courses')).data.data as Course[]
  });
  return <main className="container section academy-catalog">
    <header className="academy-catalog-header">
      <span className="eyebrow">ASPIER Academy</span>
      <h1>Research learning for every stage</h1>
      <p className="muted">Courses are managed in Admin → ASPIER Academy / Courses.</p>
      <div className="academy-header-actions">
        <Link className="button button-primary" to="/register">Register</Link>
        <Link className="button button-secondary" to="/login">Student Login</Link>
      </div>
    </header>
    {isLoading && <p role="status">Loading courses…</p>}
    {isError && <p role="alert">Could not load courses. Please try again.</p>}
    <div className="grid academy-course-grid">{data.map((course) => <Link className="card image-card course-card" key={course._id} to={`/academy/courses/${course.slug || course._id}`}>
      <CoverMedia src={course.thumbnail} alt={`${course.title} course thumbnail`} fallbackLabel={course.title} className="course-card-media" imageClassName="card-cover" fallbackClassName="course-image-placeholder"/>
      {course.sampleData && <span className="badge-sample">Sample course</span>}
      <h2>{course.title}</h2><RichTextContent className="muted course-description" content={course.description}/>
      <div className="course-card-meta">
        {course.duration && <span>{course.duration}</span>}
        <span>{normalizeDeliveryMode(course.deliveryMode || course.mode)}</span>
      </div>
      <p className="course-start-date">{formatStartDate(course.startDate)}</p>
      <strong>৳{course.price} BDT</strong>
    </Link>)}</div>
  </main>;
}
