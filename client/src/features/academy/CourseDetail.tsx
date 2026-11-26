import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlayCircle, Clock, CheckCircle2, ShieldCheck, Users, ExternalLink, AlertCircle, BookOpen, Linkedin, Globe } from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { ResearchGateIcon, GoogleScholarIcon, OrcidIcon } from '../../components/common/AcademicSocialLinks';
import { useMe } from '../auth/useMe';
import { staticCourses } from '../../lib/staticData';
import { RESEARCH_PAPER_WRITING_CLASSES, CourseClassItem } from './researchCourseCurriculum';

function normalizeProfileUrl(url?: string, isOrcid = false): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '#') return '';
  if (isOrcid && /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(trimmed)) {
    return `https://orcid.org/${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function CourseDetail() {
  const { id } = useParams();
  const { me } = useMe();
  const playerRef = useRef<HTMLDivElement>(null);

  const fallback = staticCourses.find((c) => c.slug === id || c._id === id);
  const { data: remoteData, isError } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => (await api.get(`/academy/courses/${id}`)).data.data,
    initialData: fallback
  });
  const data = remoteData || fallback;

  // Determine classes list
  const courseClasses: CourseClassItem[] =
    data?.classes && data.classes.length > 0
      ? data.classes
      : RESEARCH_PAPER_WRITING_CLASSES;

  const [activeClassIndex, setActiveClassIndex] = useState(0);
  const activeClass = courseClasses[activeClassIndex] || courseClasses[0];

  const handleSelectClass = (idx: number) => {
    setActiveClassIndex(idx);
    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const deliveryMode = data?.deliveryMode || data?.mode;
  const normalizedDeliveryMode =
    deliveryMode === 'Online Recorded'
      ? 'Online Recorded'
      : deliveryMode === 'Online / Live'
      ? 'Online and Live'
      : deliveryMode || 'Online Recorded';

  const formatStartDate = (startDate?: string) => {
    if (!startDate) return 'Open Enrollment (Instant Access)';
    const date = new Date(startDate);
    if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(startDate)) {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
    }
    return startDate;
  };

  if (!data && isError) {
    return (
      <main className="container section">
        <h1>Course unavailable</h1>
        <p className="muted">This course may have been unpublished or removed.</p>
        <Link to="/academy" className="button button-secondary">Back to Academy</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container section">
        <p role="status">Loading course…</p>
      </main>
    );
  }

  const coursePrice = typeof data.price === 'number' ? data.price : 2000;
  const formattedPrice = `৳${coursePrice.toLocaleString()} BDT`;

  return (
    <main className="container section">
      <SEO
        title={`${data.title} | ASPIER Academy`}
        exact
        description={data.description ? data.description.replace(/<[^>]+>/g, '').slice(0, 160) : `Learn ${data.title} at ASPIER Academy with hands-on research mentorship and practical scientific training.`}
        keywords={`${data.title}, ASPIER Academy, scientific course, ${data.level || 'research'} training, research paper writing`}
        canonicalPath={`/academy/courses/${data.slug || id}`}
        courseSchema={{
          name: data.title,
          description: data.description ? data.description.replace(/<[^>]+>/g, '').slice(0, 300) : data.title,
          price: coursePrice,
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

      <CoverMedia
        src={data.thumbnail}
        alt={`${data.title} course banner`}
        fallbackLabel={data.title}
        className="course-detail-hero-cover"
        imageClassName="course-detail-hero-img"
        fallbackClassName="course-image-placeholder"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <span className="eyebrow" style={{ margin: 0 }}>{data.level || 'Advanced'} course · ASPIER Academy</span>
        <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
          {normalizedDeliveryMode}
        </span>
      </div>

      <h1 style={{ marginTop: 8, marginBottom: 12 }}>{data.title}</h1>
      <RichTextContent className="muted course-overview" content={data.description} />

      <dl className="course-metadata">
        <div>
          <dt>Format / Duration</dt>
          <dd>{data.duration || '15 Recorded Classes (Classes 0–14)'}</dd>
        </div>
        <div>
          <dt>Delivery Mode</dt>
          <dd>{normalizedDeliveryMode}</dd>
        </div>
        <div>
          <dt>Course Access</dt>
          <dd>{formatStartDate(data.startDate)}</dd>
        </div>
        {data.targetAudience && (
          <div>
            <dt>Target audience</dt>
            <dd>{data.targetAudience}</dd>
          </div>
        )}
      </dl>

      {/* Course Enroll & Pricing Bar */}
      <div className="course-enroll-bar" style={{ borderRadius: 12, padding: '1.25rem 1.5rem', background: 'var(--surface-muted, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Course Enrollment Fee
          </div>
          <strong style={{ fontSize: '1.75rem', color: '#0f766e', lineHeight: 1.2 }}>
            {formattedPrice}
          </strong>
          <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: 8 }}>
            (Full Lifetime Access to Classes 0–14)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link className="button button-primary" to={`/academy/courses/${id}/payment`} style={{ fontSize: '1rem', padding: '10px 22px', fontWeight: 600 }}>
            Enroll & Pay Now ({formattedPrice})
          </Link>
          {!me && (
            <span className="muted" style={{ fontSize: '0.88rem' }}>
              New learner? <Link to={`/academy/register?redirect=${encodeURIComponent(`/academy/courses/${id}/payment`)}`} style={{ textDecoration: 'underline', fontWeight: 600, color: '#0f766e' }}>Create account</Link>
            </span>
          )}
        </div>
      </div>

      {data.enrollmentContact && <RichTextContent className="muted" content={data.enrollmentContact} />}

      {/* Access Model Banner: Existing Batch Alumni vs New Students */}
      <section
        style={{
          marginTop: '2rem',
          borderRadius: 14,
          border: '1px solid #cbd5e1',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <ShieldCheck size={22} style={{ color: '#0f766e' }} />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Course Access & Class Video Player Notice
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Column A: Existing Batch Alumni */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '1rem 1.25rem',
              border: '1px solid #86efac',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
              <strong style={{ fontSize: '0.95rem', color: '#166534' }}>Existing Batch Alumni (Pre-Website Cohort)</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
              All 15 recorded classes (Classes 0–14) are directly accessible below. You can click and watch any class video directly using your authorized Google/YouTube account without any website login or barrier.
            </p>
          </div>

          {/* Column B: New Students */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '1rem 1.25rem',
              border: '1px solid #93c5fd',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Users size={18} style={{ color: '#2563eb' }} />
              <strong style={{ fontSize: '0.95rem', color: '#1e40af' }}>New Enrolling Students</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
              Enroll for <strong>2,000 BDT</strong> via your student account and bKash/Nagad payment. Once verified, private YouTube playback permission is granted directly to your registered Gmail address.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Video Player */}
      <section
        ref={playerRef}
        style={{
          marginTop: '2.5rem',
          background: '#0f172a',
          borderRadius: 14,
          padding: '1.25rem',
          color: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: '#0d9488',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.825rem'
              }}
            >
              Class {activeClass.classNumber}
            </span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#f8fafc' }}>
              {activeClass.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeClass.duration && (
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} /> {activeClass.duration}
              </span>
            )}
            {activeClass.youtubeVideoId && (
              <a
                href={activeClass.videoUrl || `https://youtu.be/${activeClass.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.8rem',
                  color: '#38bdf8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none'
                }}
              >
                Open in YouTube <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Video Screen Container (16:9) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio
            background: '#000000',
            borderRadius: 10,
            overflow: 'hidden'
          }}
        >
          {activeClass.youtubeVideoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${activeClass.youtubeVideoId}?rel=0&modestbranding=1`}
              title={`Class ${activeClass.classNumber}: ${activeClass.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
              }}
            >
              <Clock size={48} style={{ color: '#38bdf8', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#f8fafc' }}>
                Class {activeClass.classNumber}: Video Recording Coming Soon
              </h3>
              <p style={{ margin: 0, maxWidth: 500, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
                The high-definition video recording for <em>{activeClass.title}</em> is currently in preparation and will be published here shortly.
              </p>
            </div>
          )}
        </div>

        {/* Player Notice */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={16} style={{ color: '#38bdf8', flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
            <strong>Private Playback Note:</strong> If YouTube displays <em>"Video unavailable (This video is private)"</em>, ensure you are signed into YouTube with the Google/Gmail account registered with ASPIER. New students: enroll below (2,000 BDT) to receive access permission on your registered email.
          </p>
        </div>
      </section>

      {/* Full 15-Class Syllabus (Classes 0–14) */}
      <section style={{ marginTop: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border, #e5e7eb)',
            paddingBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.65rem' }}>Course Curriculum & Recorded Classes</h2>
            <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Complete 15-class scientific research curriculum (Classes 0 to 14) with practical hands-on topics
            </p>
          </div>
          <span className="badge badge-blue" style={{ fontSize: '0.85rem' }}>
            {courseClasses.length} Recorded Classes
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {courseClasses.map((cls, idx) => {
            const isActive = activeClassIndex === idx;
            const hasVideo = Boolean(cls.youtubeVideoId);

            return (
              <article
                key={cls.classNumber}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: 12,
                  border: isActive ? '2px solid #0f766e' : '1px solid var(--border, #e5e7eb)',
                  background: isActive ? '#f0fdf4' : 'var(--surface, #ffffff)',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(15, 118, 110, 0.1)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Left: Class Number Badge & Info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: '1 1 320px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        height: 44,
                        borderRadius: 10,
                        background: isActive ? '#0f766e' : '#f1f5f9',
                        color: isActive ? '#ffffff' : '#0f172a',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      #{cls.classNumber}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Class {cls.classNumber}
                        </span>
                        {cls.duration && (
                          <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                            {cls.duration}
                          </span>
                        )}
                        {isActive && (
                          <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Now Playing
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                        {cls.title}
                      </h3>

                      {/* Topics Covered */}
                      {(() => {
                        const rawTopics = cls.topics || [];
                        const titleClean = (cls.title || '').trim().toLowerCase();
                        const distinctTopics = rawTopics.filter(
                          (t) => t && t.trim().toLowerCase() !== titleClean
                        );
                        if (distinctTopics.length === 0) return null;
                        return (
                          <div style={{ marginTop: 6 }}>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem', color: '#475569' }}>
                              {distinctTopics.map((tp, tIdx) => (
                                <li key={tIdx}>{tp}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {hasVideo ? (
                      <button
                        type="button"
                        className={`button ${isActive ? 'button-secondary' : 'button-primary'}`}
                        onClick={() => handleSelectClass(idx)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.875rem',
                          padding: '8px 16px',
                          fontWeight: 600
                        }}
                      >
                        <PlayCircle size={16} />
                        {isActive ? 'Currently Playing' : 'Watch Class'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.875rem',
                          padding: '8px 16px',
                          opacity: 0.65,
                          cursor: 'not-allowed'
                        }}
                      >
                        <Clock size={16} />
                        Video link coming soon
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Course Instructors Section */}
      {(() => {
        const instructors: any[] = (data.instructors && data.instructors.length > 0)
          ? data.instructors
          : (typeof data.instructorId === 'object' && data.instructorId?.name)
          ? [{
              name: data.instructorId.name,
              designationOrDetails: data.instructorId.designation || data.instructorId.title || 'Course Instructor',
              photoUrl: data.instructorId.photo || data.instructorId.avatar || data.instructorId.photoUrl,
              bio: data.instructorId.bio
            }]
          : [];

        if (instructors.length === 0) return null;

        return (
          <section style={{ marginTop: '2.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border, #e5e7eb)',
                paddingBottom: '0.75rem'
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                  Course Instructor{instructors.length > 1 ? 's' : ''}
                </h2>
                <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                  Meet the research mentors and domain experts leading this course
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {instructors.map((ins, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: 12,
                    border: '1px solid var(--border, #e5e7eb)',
                    background: 'var(--surface, #ffffff)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}
                >
                  {ins.photoUrl ? (
                    <img
                      src={ins.photoUrl}
                      alt={ins.name}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #0f766e',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#0f766e',
                        color: '#ffffff',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {ins.name?.charAt(0) || 'I'}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                      {ins.name}
                    </h3>
                    {ins.designationOrDetails && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
                        {ins.designationOrDetails}
                      </p>
                    )}
                    {ins.bio && (
                      <div
                        style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{ __html: ins.bio }}
                      />
                    )}
                    {(() => {
                      const links = [
                        { key: 'researchGate', label: 'ResearchGate', href: normalizeProfileUrl(ins.researchGateUrl), icon: <ResearchGateIcon size={14} />, color: '#00ccbb', bg: '#f0fdfa', border: '#99f6e4' },
                        { key: 'googleScholar', label: 'Google Scholar', href: normalizeProfileUrl(ins.googleScholarUrl), icon: <GoogleScholarIcon size={14} />, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                        { key: 'linkedIn', label: 'LinkedIn', href: normalizeProfileUrl(ins.linkedInUrl), icon: <Linkedin size={14} />, color: '#0a66c2', bg: '#eff6ff', border: '#bfdbfe' },
                        { key: 'orcid', label: 'ORCID', href: normalizeProfileUrl(ins.orcidUrl, true), icon: <OrcidIcon size={14} />, color: '#4d7c0f', bg: '#f7fee7', border: '#d9f99d' },
                        { key: 'website', label: 'Website', href: normalizeProfileUrl(ins.websiteUrl), icon: <Globe size={14} />, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' }
                      ].filter((item) => Boolean(item.href));

                      if (links.length === 0) return null;

                      return (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginTop: 12
                          }}
                          role="group"
                          aria-label={`${ins.name} profile links`}
                        >
                          {links.map((item) => (
                            <a
                              key={item.key}
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5px 11px',
                                borderRadius: 999,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: item.color,
                                background: item.bg,
                                border: `1px solid ${item.border}`,
                                textDecoration: 'none',
                                transition: 'opacity 0.15s ease'
                              }}
                            >
                              {item.icon}
                              <span>{item.label}</span>
                            </a>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Bottom Sticky/Floating Enroll Bar */}
      <section
        className="mt-10 mb-8 rounded-2xl bg-[#0f766e] text-white p-4 sm:px-6 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md"
      >
        <div className="text-center sm:text-left">
          <h3 className="m-0 text-lg sm:text-xl font-bold text-white leading-snug">
            Ready to Master Scientific Research Paper Writing?
          </h3>
          <p className="mt-1 mb-0 text-xs sm:text-sm text-[#ccfbf1] leading-relaxed">
            Get instant access to all 15 classes, practical datasets, LaTeX templates, and direct mentorship.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto">
          <strong className="text-xl sm:text-2xl text-white whitespace-nowrap">{formattedPrice}</strong>
          <Link
            to={`/academy/courses/${id}/payment`}
            className="button w-full sm:w-auto text-center"
            style={{
              background: '#ffffff',
              color: '#0f766e',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '10px 24px',
              border: 0,
              borderRadius: 8
            }}
          >
            Enroll Now
          </Link>
        </div>
      </section>
    </main>
  );
}
