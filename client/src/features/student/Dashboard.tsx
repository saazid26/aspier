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

export function Dashboard() {
  const { data } = useQuery({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      const response = await api.get('/me/enrollments');
      return response.data.data;
    }
  });

  const enrollments = data || [];
  const activeCount = enrollments.filter((x: any) => x.status === 'active').length;

  return <>
    <h1>Student dashboard</h1>
    <div className="kpis">
      <div className="card">
        <div className="kpi">{enrollments.length}</div>
        <p className="muted">Total Enrollments</p>
      </div>
      <div className="card">
        <div className="kpi">{activeCount}</div>
        <p className="muted">Active Courses</p>
      </div>
    </div>
    <section className="section">
      <h2>Continue learning</h2>
      {!enrollments.length ? (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p className="muted">You are not enrolled in any courses yet.</p>
          <Link to="/academy" className="button button-primary" style={{ marginTop: 12, display: 'inline-flex' }}>
            Explore Academy Courses
          </Link>
        </div>
      ) : (
        <div className="grid">
          {enrollments.map((x: any) => {
            const { total, completed, percent } = getCourseProgress(x);
            return (
              <Link className="card" key={x._id} to={`/academy/courses/${x.courseId?.slug || x.courseId?._id || x.courseId}`}>
                <h3>{x.courseId?.title || 'Course'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '6px 0' }}>
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
                <small className="muted">
                  {total > 0 ? `${completed} of ${total} lessons finished` : 'Curriculum available'}
                </small>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  </>;
}
