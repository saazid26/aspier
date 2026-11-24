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
    <SEO
      title={`${data.title} | ASPIER Academy`}
      exact
      description={data.description ? data.description.replace(/<[^>]+>/g, '').slice(0, 160) : `Learn ${data.title} at ASPIER Academy with hands-on research mentorship and practical scientific training.`}
      keywords={`${data.title}, ASPIER Academy, scientific course, ${data.level || 'research'} training, research paper writing`}
      canonicalPath={`/academy/courses/${data.slug || id}`}
      courseSchema={{
        name: data.title,
        description: data.description ? data.description.replace(/<[^>]+>/g, '').slice(0, 300) : data.title,
        price: data.price,
        currency: 'BDT',
        instructor: typeof data.instructorId === 'object' ? data.instructorId?.name : undefined,
        category: data.level
      }}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'ASPIER Academy', path: '/academy' },
        { name: data.title, path: `/academy/courses/${data.slug || id}` }
      ]}
    />
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
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border, #e5e7eb)', paddingBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.65rem' }}>Course Module</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Comprehensive curriculum and structured learning path for this program</p>
        </div>
        <span className="badge badge-blue">
          {(data.modules && data.modules.length > 0 ? data.modules.length : 4)} Modules
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {((data.modules && data.modules.length > 0) ? data.modules : [
          {
            moduleNumber: 1,
            title: "Module 1: Foundations & Research Framing",
            description: "Formulating high-impact research questions, hypothesis framing, and academic standards.",
            week: "Weeks 1–2",
            lessons: [
              { title: "Session 1: Identifying Research Gaps & Problem Formulation" },
              { title: "Session 2: Formulating Hypotheses and Research Objectives" },
              { title: "Session 3: Ethical Considerations in Scientific Inquiry" }
            ]
          },
          {
            moduleNumber: 2,
            title: "Module 2: Literature Review & Methodology",
            description: "Systematic literature search, synthesis matrices, and robust experimental/analytical design.",
            week: "Weeks 3–4",
            lessons: [
              { title: "Session 4: Advanced Scopus & Web of Science Literature Search" },
              { title: "Session 5: Building a Critical Literature Synthesis Matrix" },
              { title: "Session 6: Quantitative & Qualitative Methodology Design" }
            ]
          },
          {
            moduleNumber: 3,
            title: "Module 3: Data Analysis & Tools",
            description: "Statistical modeling, reproducible analysis workflows, and effective visualization.",
            week: "Weeks 5–6",
            lessons: [
              { title: "Session 7: Data Preparation, Cleaning & Exploratory Analysis" },
              { title: "Session 8: Statistical Hypothesis Testing & Interpretation" },
              { title: "Session 9: Creating Publication-Quality Plots and Tables" }
            ]
          },
          {
            moduleNumber: 4,
            title: "Module 4: Academic Writing & Publication",
            description: "Manuscript drafting (IMRaD), target journal selection, peer review response, and publication ethics.",
            week: "Weeks 7–8",
            lessons: [
              { title: "Session 10: Drafting Title, Abstract, and High-Impact Introduction" },
              { title: "Session 11: Results, Discussion, and Conclusion Mastery" },
              { title: "Session 12: Journal Selection, Cover Letters, and Peer Review Rebuttal" }
            ]
          }
        ]).map((module: any, idx: number) => (
          <article
            className="card"
            key={module._id || module.title || idx}
            style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border, #e5e7eb)', background: 'var(--surface, #ffffff)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary, #0f766e)', color: '#ffffff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {module.moduleNumber || idx + 1}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>{module.title}</h3>
              </div>
              {module.week && (
                <span className="badge badge-gray" style={{ fontSize: '0.8rem' }}>
                  {module.week}
                </span>
              )}
            </div>

            {module.description && (
              <p className="muted" style={{ margin: '0 0 1rem 0', fontSize: '0.925rem', lineHeight: 1.5 }}>
                {module.description}
              </p>
            )}

            {module.lessons && module.lessons.length > 0 && (
              <div style={{ background: 'var(--surface-muted, #f8fafc)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid var(--border-subtle, #f1f5f9)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', marginBottom: '0.5rem' }}>
                  Sessions & Topics Covered
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
                  {module.lessons.map((lesson: any, lIdx: number) => (
                    <li key={lesson._id || lesson.title || lIdx} style={{ color: 'var(--text, #1e293b)' }}>
                      {lesson.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  </main>;
}
