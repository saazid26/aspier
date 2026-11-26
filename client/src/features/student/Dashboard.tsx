import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  GraduationCap,
  Lock,
  MapPin,
  Play,
  Printer,
  Sparkles,
  Video,
  X,
  Layers,
  Check,
  Building
} from 'lucide-react';
import { api } from '../../lib/api';
import { useMe } from '../auth/useMe';

export interface Lesson {
  _id: string;
  title: string;
  order?: number;
  duration?: string | number;
  youtubeVideoId?: string;
  isFreePreview?: boolean;
}

export interface Module {
  _id: string;
  title: string;
  order?: number;
  moduleNumber?: number;
  description?: string;
  lessons: Lesson[];
}

export interface EnrolledCourse {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  mode?: string;
  deliveryMode?: string;
  bannerUrl?: string;
  thumbnail?: string;
  googleClassroomUrl?: string;
  modules?: Module[];
  classes?: any[];
}

export interface Enrollment {
  _id: string;
  courseId: EnrolledCourse;
  status: 'active' | 'approved' | 'final_approved' | 'completed' | 'pending' | 'rejected' | 'expired';
  completedLessonIds: string[];
  progressPercent?: number;
  certificateStatus?: 'not_claimed' | 'claimed' | 'issued';
  certificateClaimedAt?: string;
  credentialId?: string;
  certificateImage?: string;
  certificateIssuedAt?: string;
  enrolledAt?: string;
}

export interface ScheduledClass {
  _id: string;
  courseId: string | { _id: string; title: string };
  title?: string;
  topic?: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetLink?: string;
  meetingUrl?: string;
  liveJoinUrl?: string;
  recordingYoutubeId?: string;
  recordingUrl?: string;
  venue?: string;
  mode?: 'Online and Live' | 'Online and Recorded' | 'Offline';
  status?: 'scheduled' | 'live' | 'completed';
}

function calculateProgress(enrollment: Enrollment) {
  const course = enrollment.courseId;
  if (!course || typeof course !== 'object') {
    return { total: 0, completed: 0, percent: enrollment.progressPercent || 0 };
  }
  const modules = course.modules || [];
  let total = 0;
  for (const m of modules) {
    total += (m.lessons || []).length;
  }
  const completed = (enrollment.completedLessonIds || []).length;
  // Dynamic formula: min(100, Math.round((C / N) * 100))
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : (enrollment.progressPercent || 0);
  return { total, completed, percent };
}

export function Dashboard() {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const [selectedCertificateCourse, setSelectedCertificateCourse] = useState<EnrolledCourse | null>(null);
  const [activeRecordingUrl, setActiveRecordingUrl] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  const isAdminSession = !me || ['admin', 'superadmin'].includes(me.role) || me.email === 'admin@gmail.com' || me.name === 'ASPIER Administrator';
  const studentDisplayName = isAdminSession ? 'Student' : (me?.name || 'Student');

  const handleClaimCertificate = async (enrollmentId: string) => {
    setClaimingId(enrollmentId);
    setClaimMessage(null);
    try {
      const res = await api.post(`/enrollments/${enrollmentId}/claim-certificate`);
      setClaimMessage({
        id: enrollmentId,
        text: res.data?.message || 'Certificate claim submitted! Your official PNG certificate and Credential ID will be issued within 6 to 12 hours.',
        success: true
      });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
    } catch (err: any) {
      setClaimMessage({
        id: enrollmentId,
        text: err?.response?.data?.message || 'Failed to submit certificate claim. Please try again.',
        success: false
      });
    } finally {
      setClaimingId(null);
    }
  };

  const { data: enrollmentsData, isLoading: isLoadingEnrollments } = useQuery<Enrollment[]>({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      const response = await api.get('/academy/my-enrollments');
      const raw = response.data;
      return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    }
  });

  const enrollments: Enrollment[] = Array.isArray(enrollmentsData)
    ? enrollmentsData
    : Array.isArray((enrollmentsData as any)?.data)
    ? (enrollmentsData as any).data
    : [];

  // Active courses count
  const activeCount = enrollments.filter((x) => ['active', 'approved', 'final_approved', 'completed'].includes(x.status)).length;

  // Completed lessons count
  const completedLessonsTotal = enrollments.reduce((acc, curr) => acc + (curr.completedLessonIds?.length || 0), 0);

  // Completed courses ready for certificates
  const completedEnrollments = enrollments.filter((x) => {
    const { percent } = calculateProgress(x);
    return percent >= 100;
  });

  // Handlers
  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* 1. Header & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Welcome back, <strong className="text-teal-900 font-semibold">{studentDisplayName}</strong>! Track your enrolled courses and claim completion certificates.
          </p>
        </div>
        <Link
          to="/academy/courses/catalog"
          onClick={() => {}}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-teal-800 text-white hover:bg-teal-700 transition shadow-xs shrink-0"
        >
          <BookOpen size={16} />
          Explore Courses
        </Link>
      </div>

      {/* 2. Top Live Metrics / KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Enrollments</span>
            <BookOpen size={18} className="text-teal-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {enrollments.length}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">All enrolled courses</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Courses</span>
            <Sparkles size={18} className="text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
            {activeCount}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Currently in progress</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lessons Finished</span>
            <CheckCircle2 size={18} className="text-blue-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-900">
            {completedLessonsTotal}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Curriculum progress</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificates</span>
            <Award size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
            {completedEnrollments.length}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Unlocked credentials</p>
        </div>
      </div>

      {/* 3. Enrolled Courses & Progress + Claim Certificate */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Enrolled Courses & Progress
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Track your syllabus completion. Complete 100% of the lessons to unlock your verified Certificate of Completion.
            </p>
          </div>
        </div>

        {isLoadingEnrollments ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500">Loading your courses...</p>
          </div>
        ) : !enrollments.length ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-sm">
            <GraduationCap size={44} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800">No active course enrollments</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
              You are not currently enrolled in any ASPIER Academy courses. Browse our curriculum to start learning.
            </p>
            <Link
              to="/academy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-teal-800 text-white hover:bg-teal-700 transition"
            >
              Browse Academy Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {enrollments.map((enr) => {
              const course = enr.courseId;
              if (!course) return null;
              const { total, completed, percent } = calculateProgress(enr);
              const isFinished = percent >= 100;
              const rawMode = course.mode || course.deliveryMode || 'Online and Live';
              const mode =
                rawMode === 'Online and Live' || rawMode === 'Online / Live'
                  ? 'Online and Live'
                  : rawMode === 'In-Person Workshop' || rawMode === 'Offline' || rawMode === 'Offline (Physical)'
                    ? 'In-Person Workshop'
                    : 'Online and Recorded';

              return (
                <div
                  key={enr._id}
                  className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-teal-600/40 transition"
                >
                  <div>
                    {/* Header: Mode badge + Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-600/20">
                        {mode === 'Online and Live' && <Video size={12} />}
                        {mode === 'In-Person Workshop' && <Building size={12} />}
                        {mode === 'Online and Recorded' && <Play size={12} />}
                        {mode}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          enr.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-600/20'
                            : 'bg-amber-50 text-amber-800 border border-amber-600/20'
                        }`}
                      >
                        {enr.status}
                      </span>
                    </div>

                    {/* Course Title */}
                    <Link
                      to={`/academy/courses/${course.slug || course._id}`}
                      className="text-base sm:text-lg font-bold text-slate-900 hover:text-teal-800 transition line-clamp-1"
                    >
                      {course.title || 'Course'}
                    </Link>
                    {course.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 mb-4">
                        {course.description}
                      </p>
                    )}

                    {/* Dynamic Progress Bar */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">Course Progress</span>
                        <span className={isFinished ? 'text-emerald-700 font-bold' : 'text-teal-800 font-bold'}>
                          {percent}% Complete
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFinished ? 'bg-emerald-600' : 'bg-teal-700'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span>
                          {total > 0 ? `${completed} of ${total} lessons finished` : `${percent}% completed`}
                        </span>
                        {isFinished ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 size={12} /> Complete
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {total > completed ? `${total - completed} lessons remaining` : 'In progress'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Course Access Status & Google Classroom */}
                  {['active', 'approved', 'final_approved', 'completed'].includes(enr.status) ? (
                    <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                      <p className="text-xs font-medium text-emerald-900 leading-relaxed m-0">
                        <strong className="font-bold">Enrollment Confirmed!</strong> Private YouTube class access will be delivered to your registered email within 6 to 12 hours.
                      </p>
                      {course.googleClassroomUrl && (
                        <a
                          href={course.googleClassroomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition shadow-xs"
                        >
                          <ExternalLink size={13} />
                          Join Google Classroom
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
                      <Lock size={13} className="text-amber-700 shrink-0" />
                      <span>Google Classroom access unlocks after final payment verification.</span>
                    </div>
                  )}

                  {/* Actions: View Course & Claim Certificate */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/academy/courses/${course.slug || course._id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-teal-800 transition"
                    >
                      View Course
                    </Link>

                    {isFinished ? (
                      enr.certificateStatus === 'issued' ? (
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          <Link
                            to={`/academy/verify-certificate?id=${encodeURIComponent(enr.credentialId || '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-700 text-white shadow-sm transition"
                          >
                            <Award size={14} className="text-amber-300" />
                            Verify Credential ({enr.credentialId})
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSelectedCertificateCourse(course)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-teal-300 text-teal-800 hover:bg-teal-50 transition"
                          >
                            View Certificate
                          </button>
                        </div>
                      ) : enr.certificateStatus === 'claimed' ? (
                        <div className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900">
                          <Clock size={14} className="text-amber-600 animate-pulse" />
                          <span>Processing Certificate (6–12 Hours)</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={claimingId === enr._id}
                          onClick={() => handleClaimCertificate(enr._id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm hover:from-amber-700 hover:to-amber-800 transition ml-auto disabled:opacity-50 cursor-pointer"
                        >
                          <Award size={15} />
                          {claimingId === enr._id ? 'Submitting Claim...' : 'Claim Certificate (6–12h Review)'}
                        </button>
                      )
                    ) : (
                      <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <Lock size={12} />
                        <span>Finish 100% to Unlock Certificate</span>
                      </div>
                    )}
                  </div>

                  {claimMessage && claimMessage.id === enr._id && (
                    <div
                      className={`mt-3 p-3 rounded-xl text-xs ${
                        claimMessage.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {claimMessage.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. OFFICIAL PRINTABLE / DOWNLOADABLE CERTIFICATE OF COMPLETION MODAL */}
      {selectedCertificateCourse && (() => {
        const matchedEnrollment = enrollments.find(
          (e) => (typeof e.courseId === 'object' ? e.courseId?._id : e.courseId) === selectedCertificateCourse._id
        );
        const modalCertId =
          matchedEnrollment?.credentialId ||
          `ASP-ACAD-${selectedCertificateCourse._id?.slice(-6).toUpperCase() || 'ACAD'}-${me?._id?.slice(-4).toUpperCase() || 'STU'}`;

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setSelectedCertificateCourse(null)}
          >
            <div
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-4 border-amber-600/40 p-6 sm:p-10 my-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedCertificateCourse(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition print:hidden"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              {/* If official high-resolution PNG is issued, display it prominently */}
              {matchedEnrollment?.certificateImage ? (
                <div className="mb-6 rounded-2xl overflow-hidden border-2 border-teal-200 bg-slate-900/5 p-2 sm:p-4 shadow-sm flex flex-col items-center justify-center">
                  <div className="flex items-center justify-between w-full mb-3 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                      <Award size={15} className="text-teal-600" />
                      Official PNG Certificate
                    </span>
                    <a
                      href={matchedEnrollment.certificateImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 font-semibold"
                    >
                      View Certificate <ExternalLink size={13} />
                    </a>
                  </div>
                  <img
                    src={matchedEnrollment.certificateImage}
                    alt="Official ASPIER Academy Certificate"
                    className="w-full max-h-[500px] object-contain rounded-lg bg-white border border-slate-200 shadow"
                  />
                </div>
              ) : null}

              {/* Certificate Canvas / Inner Frame */}
              <div className="border-2 border-double border-amber-500/40 rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 relative">
                {/* ASPIER Crest & Branding */}
                <div className="flex flex-col items-center justify-center gap-1 mb-4">
                  <div className="w-14 h-14 rounded-full bg-teal-900 text-amber-300 flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-amber-400/60">
                    <Award size={30} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-teal-950 mt-1">
                    ASPIER ACADEMY
                  </span>
                  <span className="text-[10px] tracking-wider text-slate-500 font-semibold uppercase">
                    Aeronautical, Spatial, Planetary Institute for Environmental Research
                  </span>
                </div>

                {/* Title */}
                <div className="my-5">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-amber-900 tracking-wide uppercase">
                    Certificate of Completion
                  </h3>
                  <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
                </div>

                {/* Recipient Statement */}
                <p className="text-xs sm:text-sm text-slate-600 italic">
                  This official credential certifies that
                </p>

                {/* Student Name */}
                <div className="my-3 py-1">
                  <h4 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
                    {me?.name || 'Student Name'}
                  </h4>
                  <div className="w-48 h-px bg-slate-300 mx-auto mt-1" />
                </div>

                {/* Course Title Statement */}
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                  has successfully fulfilled all academic curriculum requirements, interactive sessions, practical modules, and evaluations for
                </p>
                <h5 className="text-lg sm:text-xl font-bold text-teal-950 mt-2 mb-4 font-serif">
                  "{selectedCertificateCourse.title}"
                </h5>

                {/* Metadata & Verification */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-amber-500/20 text-left text-xs max-w-lg mx-auto">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Issue Date</span>
                    <span className="font-semibold text-slate-800">
                      {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Certificate ID</span>
                    <span className="font-mono font-bold text-teal-900 text-[11px]">
                      {modalCertId}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-200/80 px-4">
                  <div className="text-center">
                    <div className="font-serif italic font-bold text-teal-900 text-sm">
                      Prof. Dr. M. Rahman
                    </div>
                    <div className="w-32 h-px bg-slate-400 mx-auto my-1" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                      Academic Dean, ASPIER
                    </span>
                  </div>

                  {/* Golden Seal */}
                  <div className="hidden sm:flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-500 bg-amber-100 flex items-center justify-center text-amber-800 shadow-inner">
                      <Sparkles size={22} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-800 mt-1">
                      Official Seal
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="font-serif italic font-bold text-teal-900 text-sm">
                      Dr. Sarah Jenkins
                    </div>
                    <div className="w-32 h-px bg-slate-400 mx-auto my-1" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                      Director of Curriculum
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6 print:hidden">
                {matchedEnrollment?.certificateImage && (
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = matchedEnrollment.certificateImage!;
                      const cleanId = (matchedEnrollment.credentialId || 'Certificate').replace(/[/\\?%*:|"<>]/g, '-');
                      link.download = `ASPIER-Certificate-${cleanId}.png`;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 text-white hover:bg-emerald-600 transition shadow-sm cursor-pointer"
                  >
                    <Download size={16} />
                    Download Official PNG
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-teal-800 text-white hover:bg-teal-700 transition shadow-sm"
                >
                  <Printer size={16} />
                  Print Certificate / Save PDF
                </button>
                {matchedEnrollment?.credentialId && (
                  <Link
                    to={`/academy/verify-certificate?id=${encodeURIComponent(matchedEnrollment.credentialId)}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-600 text-white hover:bg-amber-700 transition shadow-sm"
                  >
                    <ExternalLink size={16} />
                    Public Verification Page
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCertificateCourse(null)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. VIDEO RECORDING MODAL */}
      {activeRecordingUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
          onClick={() => setActiveRecordingUrl(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-slate-900 rounded-3xl shadow-2xl p-4 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-emerald-400 fill-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">Class Recording</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecordingUrl(null)}
                className="text-slate-400 hover:text-white transition p-1"
                aria-label="Close recording"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-video w-full mt-4 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {activeRecordingUrl.includes('youtube.com') || activeRecordingUrl.includes('youtu.be') ? (
                <iframe
                  className="w-full h-full"
                  src={
                    activeRecordingUrl.includes('embed')
                      ? activeRecordingUrl
                      : `https://www.youtube.com/embed/${
                          activeRecordingUrl.split('v=')[1]?.split('&')[0] || activeRecordingUrl.split('/').pop()
                        }`
                  }
                  title="Session Recording"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="p-6 text-center text-white space-y-3">
                  <p className="text-sm">External Recording Link:</p>
                  <a
                    href={activeRecordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-500"
                  >
                    Watch on External Player <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
