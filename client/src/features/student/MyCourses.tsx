import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

function getCourseProgress(enrollment: any) {
  const course = enrollment.courseId;
  if (!course || typeof course !== 'object') return { total: 0, completed: 0, percent: 0 };
  const modules = course.modules || [];
  let total = 0;
  for (const m of modules) {
    total += (m.lessons || []).length;
  }
  const completed = (enrollment.completedLessonIds || []).length;
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { total, completed, percent };
}

export function MyCourses() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const response = await api.get('/me/enrollments');
      const raw = response.data;
      return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    }
  });

  const enrollments = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];

  return <>
    <h1>My courses</h1>
    <p className="muted">Track your progress and continue learning across your enrolled courses.</p>
    {isLoading ? (
      <p className="muted">Loading your courses…</p>
    ) : !enrollments.length ? (
      <div className="card" style={{ padding: 32, textAlign: 'center', marginTop: 20 }}>
        <p className="muted">You have no course enrollments.</p>
        <Link to="/academy" className="button button-primary" style={{ marginTop: 12, display: 'inline-flex' }}>
          Browse Academy Catalog
        </Link>
      </div>
    ) : (
      <div className="grid" style={{ marginTop: 20 }}>
        {enrollments.map((x: any) => {
          const { total, completed, percent } = getCourseProgress(x);
          return (
            <Link className="card" key={x._id} to={`/academy/courses/${x.courseId?.slug || x.courseId?._id || x.courseId}`}>
              <h3>{x.courseId?.title || 'Course'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '8px 0' }}>
                <span className={`badge ${x.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                  {x.status}
                </span>
                {total > 0 && (
                  <small style={{ fontWeight: 600, color: '#148f83' }}>{percent}% complete</small>
                )}
              </div>
              {total > 0 && (
                <div style={{ background: '#e2ece8', borderRadius: 8, height: 6, overflow: 'hidden', margin: '8px 0' }}>
                  <div style={{ background: '#148f83', width: `${percent}%`, height: '100%', borderRadius: 8, transition: 'width 0.3s ease' }} />
                </div>
              )}
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {total > 0 ? `${completed} of ${total} lessons completed` : 'Access course modules'}
              </p>
              {x.certificateStatus === 'issued' && x.credentialId && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2ece8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                    Certificate: {x.credentialId}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#148f83', fontWeight: 600 }}>
                    Verify Certificate →
                  </span>
                </div>
              )}
              {x.certificateStatus === 'claimed' && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2ece8' }}>
                  <span className="badge badge-yellow" style={{ fontSize: '0.75rem' }}>
                    Certificate Claim Pending (6–12 Hours)
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    )}
  </>;
}
