import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../features/auth/AuthContext';
import { SEO } from '../components/common/SEO';
import { PublicLayout } from './layouts/PublicLayout';
import { AcademyLayout } from './layouts/AcademyLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Above-the-fold Homepage components (eagerly bundled for sub-0.2s FCP)
import { Hero } from '../features/home/Hero';
import { MissionSection } from '../features/home/MissionSection';
import { FeaturedResearch } from '../features/home/FeaturedResearch';
import { Announcements } from '../features/home/Announcements';
import { WingsGrid } from '../features/wings/WingsGrid';
import { TeamPreview } from '../features/panels/TeamPreview';

// Code-split secondary public pages
const WingPage = lazy(() => import('../features/wings/WingPage').then(m => ({ default: m.WingPage })));
const ResearchDetail = lazy(() => import('../features/research/ResearchDetail').then(m => ({ default: m.ResearchDetail })));
const ResearchMateApply = lazy(() => import('../features/research/ResearchMateApply').then(m => ({ default: m.ResearchMateApply })));
const Team = lazy(() => import('../features/panels/Team').then(m => ({ default: m.Team })));
const SupervisorList = lazy(() => import('../features/panels/SupervisorList').then(m => ({ default: m.SupervisorList })));
const SupervisorProfile = lazy(() => import('../features/panels/SupervisorProfile').then(m => ({ default: m.SupervisorProfile })));
const ScholarList = lazy(() => import('../features/panels/ScholarList').then(m => ({ default: m.ScholarList })));
const ScholarProfile = lazy(() => import('../features/panels/ScholarProfile').then(m => ({ default: m.ScholarProfile })));
const NewsList = lazy(() => import('../features/news/NewsList').then(m => ({ default: m.NewsList })));
const NewsDetail = lazy(() => import('../features/news/NewsDetail').then(m => ({ default: m.NewsDetail })));
const ContactForm = lazy(() => import('../features/contact/ContactForm').then(m => ({ default: m.ContactForm })));
const JoinForm = lazy(() => import('../features/contact/JoinForm').then(m => ({ default: m.JoinForm })));
const Login = lazy(() => import('../features/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('../features/auth/Register').then(m => ({ default: m.Register })));
const Forgot = lazy(() => import('../features/auth/Forgot').then(m => ({ default: m.Forgot })));
const Reset = lazy(() => import('../features/auth/Reset').then(m => ({ default: m.Reset })));
const Onboarding = lazy(() => import('../features/auth/Onboarding').then(m => ({ default: m.Onboarding })));

// Code-split Academy pages
const Catalog = lazy(() => import('../features/academy/Catalog').then(m => ({ default: m.Catalog })));
const CourseDetail = lazy(() => import('../features/academy/CourseDetail').then(m => ({ default: m.CourseDetail })));
const EnrollPayment = lazy(() => import('../features/academy/EnrollPayment').then(m => ({ default: m.EnrollPayment })));
const PaymentStatus = lazy(() => import('../features/academy/PaymentStatus').then(m => ({ default: m.PaymentStatus })));
const Player = lazy(() => import('../features/academy/Player').then(m => ({ default: m.Player })));
const ClassSchedule = lazy(() => import('../features/academy/ClassSchedule').then(m => ({ default: m.ClassSchedule })));
const InstructorProfile = lazy(() => import('../features/academy/InstructorProfile').then(m => ({ default: m.InstructorProfile })));

// Code-split Student Portal pages
const StudentDashboard = lazy(() => import('../features/student/Dashboard').then(m => ({ default: m.Dashboard })));
const MyCourses = lazy(() => import('../features/student/MyCourses').then(m => ({ default: m.MyCourses })));
const PaymentHistory = lazy(() => import('../features/student/PaymentHistory').then(m => ({ default: m.PaymentHistory })));
const Profile = lazy(() => import('../features/student/Profile').then(m => ({ default: m.Profile })));
const WebAuthnSettings = lazy(() => import('../features/admin/security/WebAuthnSettings').then(m => ({ default: m.WebAuthnSettings })));

// Code-split Admin pages
const AdminDashboard = lazy(() => import('../features/admin/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ResourcePage = lazy(() => import('../features/admin/ResourcePage').then(m => ({ default: m.ResourcePage })));
const PaymentQueue = lazy(() => import('../features/admin/payments/PaymentQueue').then(m => ({ default: m.PaymentQueue })));
const LiveClassManager = lazy(() => import('../features/admin/classes/LiveClassManager').then(m => ({ default: m.LiveClassManager })));
const RecordingManager = lazy(() => import('../features/admin/classes/RecordingManager').then(m => ({ default: m.RecordingManager })));
const CurriculumBuilder = lazy(() => import('../features/admin/courses/CurriculumBuilder').then(m => ({ default: m.CurriculumBuilder })));
const StudentList = lazy(() => import('../features/admin/students/StudentList').then(m => ({ default: m.StudentList })));
const MessageInbox = lazy(() => import('../features/admin/messages/MessageInbox').then(m => ({ default: m.MessageInbox })));
const MediaLibrary = lazy(() => import('../features/admin/media/MediaLibrary').then(m => ({ default: m.MediaLibrary })));
const SiteSettings = lazy(() => import('../features/admin/settings/SiteSettings').then(m => ({ default: m.SiteSettings })));
const PaymentSettings = lazy(() => import('../features/admin/settings/PaymentSettings').then(m => ({ default: m.PaymentSettings })));
const Setup2FA = lazy(() => import('../features/admin/security/Setup2FA').then(m => ({ default: m.Setup2FA })));
const ActiveSessions = lazy(() => import('../features/admin/security/ActiveSessions').then(m => ({ default: m.ActiveSessions })));
const AuditLog = lazy(() => import('../features/admin/auditlog/AuditLog').then(m => ({ default: m.AuditLog })));
const MembershipApplications = lazy(() => import('../features/admin/membership/MembershipApplications').then(m => ({ default: m.MembershipApplications })));
const ResearchApplications = lazy(() => import('../features/admin/research/ResearchApplications').then(m => ({ default: m.ResearchApplications })));
const BrandingSettings = lazy(() => import('../features/admin/branding/BrandingSettings').then(m => ({ default: m.BrandingSettings })));
const HomeCms = lazy(() => import('../features/admin/home/HomeCms').then(m => ({ default: m.HomeCms })));
const WingsResearchManager = lazy(() => import('../features/admin/wings-research/WingsResearchManager').then(m => ({ default: m.WingsResearchManager })));
const TeamManager = lazy(() => import('../features/admin/team/TeamManager').then(m => ({ default: m.TeamManager })));
const AnnouncementsCms = lazy(() => import('../features/admin/announcements/AnnouncementsCms').then(m => ({ default: m.AnnouncementsCms })));
const AcademyCms = lazy(() => import('../features/admin/academy/AcademyCms').then(m => ({ default: m.AcademyCms })));
const SecurityHub = lazy(() => import('../features/admin/security/SecurityHub').then(m => ({ default: m.SecurityHub })));

function Guard({ children, roles }: { children: ReactNode; roles: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="container section">Loading...</main>;

  if (!user || !user.role) {
    const isAcademyOrStudent = location.pathname.startsWith('/academy') || location.pathname.startsWith('/student');
    const loginPath = isAcademyOrStudent ? '/academy/login' : '/login';
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const role = user.role;
  const userMatches = roles.includes(role) || (roles.includes('admin') && role === 'superadmin') || (roles.includes('superadmin') && role === 'admin');
  if (!userMatches) return <Navigate to="/" replace />;
  return <>{children}</>;
}
function Home(){
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data
  });
  return (
    <>
      <SEO
        title={settings?.siteTitle || 'ASPIER | Aeronautical, Spatial, Planetary Institution for Environmental Research'}
        exact
        description={settings?.seoDescription || 'ASPIER (Aeronautical, Spatial, Planetary Institution for Environmental Research) advances multidisciplinary science across aerospace systems, satellite remote sensing, planetary exploration, and environmental modeling.'}
        keywords="ASPIER, ASPIER Global, ASPIER Academy, Aeronautical, Spatial, Planetary Institution for Environmental Research, Aeronautical Spatial Planetary Institution for Environmental Research, ASPIER Research Institute, aspierglobal, ASPIER Academy courses, ASPIER Academy student portal, Higher Study Oriented Basic to Advance Research Paper Writing Course, Responsible AI Foundations, Climate Data Modeling, Research Training Bangladesh, ASPIER Academic Wings, ASPIER Research Mate, ASPIER Young Scholars, ASPIER Research Supervisors, Aeronautical Engineering and UAV Systems, Spatial Data and Remote Sensing, Planetary Science, Environmental Research Institute"
        canonicalPath="/"
      />
      <Hero />
      <MissionSection />
      <WingsGrid />
      <FeaturedResearch />
      <TeamPreview />
      <Announcements />
      <section className="section">
        <div className="container">
          <div className="stats-grid">
            <div className="card stat-card">
              <strong>{settings?.statWings || '10'}</strong>
              <p className="muted">{settings?.statWingsLabel || 'Academic wings'}</p>
            </div>
            <div className="card stat-card">
              <strong>{settings?.statDomains || '25+'}</strong>
              <p className="muted">{settings?.statDomainsLabel || 'Research domains'}</p>
            </div>
            <div className="card stat-card">
              <strong>{settings?.statTracks || '3'}</strong>
              <p className="muted">{settings?.statTracksLabel || 'Academy tracks'}</p>
            </div>
            <div className="card stat-card">
              <strong>{settings?.statAccess || '24/7'}</strong>
              <p className="muted">{settings?.statAccessLabel || 'Digital access'}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="cta-band rounded-3xl p-6 sm:p-8 lg:px-10 lg:py-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 w-full box-border">
            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              <span className="eyebrow block m-0 text-xs font-bold uppercase tracking-wider text-teal-700">
                {settings?.bottomCtaEyebrow || 'Explore ASPIER'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-snug">
                {settings?.bottomCtaHeadline || 'Discover research that moves forward'}
              </h2>
            </div>
            <Link
              className="button button-primary inline-flex items-center justify-center whitespace-nowrap min-h-[46px] px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-sm transition sm:self-center shrink-0 w-full sm:w-auto text-sm sm:text-base cursor-pointer"
              to={settings?.bottomCtaLink || '/research'}
            >
              {settings?.bottomCtaText || 'Explore research'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const targetId = hash.replace(/^#/, '');
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(targetId) ||
          (targetId === 'scholars' ? document.getElementById('young-scholars') : null) ||
          (targetId === 'young-scholars' ? document.getElementById('scholars') : null);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(scrollTimer);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);
  return null;
}

function LegacyRegisterRedirect() {
  const location = useLocation();
  return <Navigate to={`/academy/register${location.search}`} replace />;
}

function LegacyCheckApplicationRedirect() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  searchParams.set('checkApplication', 'true');
  return <Navigate to={`/?${searchParams.toString()}`} replace />;
}

function LegacyStudentRedirect() {
  const location = useLocation();
  const subPath = location.pathname.replace(/^\/student(\/|$)/, '');
  const destination = subPath ? `/academy/student/${subPath}` : '/academy/student';
  return <Navigate to={`${destination}${location.search}${location.hash}`} replace />;
}

function LegacyStudentPortalRedirect() {
  const location = useLocation();
  const subPath = location.pathname.replace(/^\/academy\/student-portal(\/|$)/, '');
  const destination = subPath ? `/academy/student/${subPath}` : '/academy/student';
  return <Navigate to={`${destination}${location.search}${location.hash}`} replace />;
}

function LegacyAcademyPortalRedirect() {
  const location = useLocation();
  const subPath = location.pathname.replace(/^\/academy\/portal(\/|$)/, '');
  const destination = subPath ? `/academy/student/${subPath}` : '/academy/student';
  return <Navigate to={`${destination}${location.search}${location.hash}`} replace />;
}

export function AppRouter(){return <BrowserRouter><ScrollToTop/><Suspense fallback={<main className="container section"><div className="skeleton" style={{height:80}}/></main>}><Routes>
<Route element={<PublicLayout/>}><Route index element={<Home/>}/><Route path="wings" element={<WingsGrid/>}/><Route path="wings/:slug" element={<WingPage/>}/><Route path="wings/:wingSlug/research/:slug" element={<ResearchDetail/>}/><Route path="wings/apply-research" element={<ResearchMateApply/>}/><Route path="research-mate-apply" element={<ResearchMateApply/>}/><Route path="research" element={<Navigate to="/wings" replace/>}/><Route path="research/:slug" element={<ResearchDetail/>}/><Route path="team" element={<Team/>}/><Route path="supervisors" element={<SupervisorList/>}/><Route path="supervisors/:slug" element={<SupervisorProfile/>}/><Route path="scholars" element={<ScholarList/>}/><Route path="scholars/:slug" element={<ScholarProfile/>}/><Route path="news" element={<NewsList/>}/><Route path="news/:slug" element={<NewsDetail/>}/><Route path="announcements" element={<NewsList/>}/><Route path="announcements/:slug" element={<NewsDetail/>}/><Route path="contact" element={<ContactForm/>}/><Route path="apply" element={<Navigate to="/join" replace/>}/><Route path="join" element={<JoinForm/>}/><Route path="join/portal" element={<LegacyCheckApplicationRedirect/>}/><Route path="check-application" element={<LegacyCheckApplicationRedirect/>}/><Route path="login" element={<Login/>}/><Route path="register" element={<LegacyRegisterRedirect/>}/><Route path="forgot" element={<Forgot/>}/><Route path="reset" element={<Reset/>}/><Route path="onboarding" element={<Onboarding/>}/></Route>
<Route element={<AcademyLayout/>}>
  <Route path="academy" element={<Catalog/>}/>
  <Route path="academy/register" element={<Register/>}/>
  <Route path="academy/login" element={<Login/>}/>
  <Route path="academy/forgot" element={<Forgot/>}/>
  <Route path="academy/reset" element={<Reset/>}/>
  <Route path="academy/student" element={<Guard roles={['student','instructor','supervisor','youngScholar','admin','superadmin']}><StudentLayout/></Guard>}>
    <Route index element={<StudentDashboard/>}/>
    <Route path="dashboard" element={<StudentDashboard/>}/>
    <Route path="courses" element={<MyCourses/>}/>
    <Route path="payments" element={<PaymentHistory/>}/>
    <Route path="profile" element={<Profile/>}/>
    <Route path="security" element={<WebAuthnSettings/>}/>
  </Route>
  <Route path="academy/student-portal" element={<LegacyStudentPortalRedirect/>}/>
  <Route path="academy/student-portal/*" element={<LegacyStudentPortalRedirect/>}/>
  <Route path="academy/portal" element={<LegacyAcademyPortalRedirect/>}/>
  <Route path="academy/portal/*" element={<LegacyAcademyPortalRedirect/>}/>
  <Route path="academy/courses/:id" element={<CourseDetail/>}/>
  <Route path="academy/courses/:id/payment" element={<EnrollPayment/>}/>
  <Route path="academy/courses/:id/payment-status" element={<PaymentStatus/>}/>
  <Route path="academy/courses/:courseId/learn/:lessonId" element={<Guard roles={['student','instructor','admin','superadmin']}><Player/></Guard>}/>
  <Route path="academy/classes" element={<ClassSchedule/>}/>
  <Route path="academy/instructors/:id" element={<InstructorProfile/>}/>
</Route>
<Route path="student" element={<LegacyStudentRedirect/>}/>
<Route path="student/*" element={<LegacyStudentRedirect/>}/>
<Route element={<Guard roles={['admin','superadmin']}><AdminLayout/></Guard>}>
  <Route path="admin" element={<AdminDashboard/>}/>
  <Route path="admin/branding" element={<BrandingSettings/>}/>
  <Route path="admin/home-cms" element={<HomeCms/>}/>
  <Route path="admin/wings-research" element={<WingsResearchManager/>}/>
  <Route path="admin/team-manager" element={<TeamManager/>}/>
  <Route path="admin/announcements-cms" element={<AnnouncementsCms/>}/>
  <Route path="admin/academy-cms" element={<AcademyCms/>}/>
  <Route path="admin/inbox" element={<MessageInbox/>}/>
  <Route path="admin/security" element={<SecurityHub/>}/>
  <Route path="admin/resources/:resource" element={<ResourcePage/>}/>
  <Route path="admin/membership-applications" element={<MembershipApplications/>}/>
  <Route path="admin/research-applications" element={<ResearchApplications/>}/>
  <Route path="admin/payments" element={<PaymentQueue/>}/>
  <Route path="admin/classes" element={<><LiveClassManager/><RecordingManager/></>}/>
  <Route path="admin/courses/curriculum" element={<CurriculumBuilder/>}/>
  <Route path="admin/students" element={<StudentList/>}/>
  <Route path="admin/messages" element={<MessageInbox/>}/>
  <Route path="admin/media" element={<MediaLibrary/>}/>
  <Route path="admin/settings" element={<BrandingSettings/>}/>
  <Route path="admin/audit" element={<AuditLog/>}/>
</Route>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></Suspense></BrowserRouter>}
