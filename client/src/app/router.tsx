import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PublicLayout } from './layouts/PublicLayout';
import { AcademyLayout } from './layouts/AcademyLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { Hero } from '../features/home/Hero';
import { MissionSection } from '../features/home/MissionSection';
import { FeaturedResearch } from '../features/home/FeaturedResearch';
import { Announcements } from '../features/home/Announcements';
import { WingsGrid } from '../features/wings/WingsGrid';
import { WingPage } from '../features/wings/WingPage';
import { ResearchDetail } from '../features/research/ResearchDetail';
import { ResearchList } from '../features/research/ResearchList';
import { WebAuthnSettings } from '../features/admin/security/WebAuthnSettings';
import { SupervisorList } from '../features/panels/SupervisorList';
import { SupervisorProfile } from '../features/panels/SupervisorProfile';
import { ScholarList } from '../features/panels/ScholarList';
import { ScholarProfile } from '../features/panels/ScholarProfile';
import { NewsList } from '../features/news/NewsList';
import { NewsDetail } from '../features/news/NewsDetail';
import { ContactForm } from '../features/contact/ContactForm';
import { JoinForm } from '../features/contact/JoinForm';
import { MembershipPortal } from '../features/contact/MembershipPortal';
import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { Forgot } from '../features/auth/Forgot';
import { Reset } from '../features/auth/Reset';
import { Catalog } from '../features/academy/Catalog';
import { CourseDetail } from '../features/academy/CourseDetail';
import { EnrollPayment } from '../features/academy/EnrollPayment';
import { PaymentStatus } from '../features/academy/PaymentStatus';
import { Player } from '../features/academy/Player';
import { ClassSchedule } from '../features/academy/ClassSchedule';
import { InstructorProfile } from '../features/academy/InstructorProfile';
import { Dashboard as StudentDashboard } from '../features/student/Dashboard';
import { MyCourses } from '../features/student/MyCourses';
import { PaymentHistory } from '../features/student/PaymentHistory';
import { Profile } from '../features/student/Profile';
import { TeamPreview } from '../features/panels/TeamPreview';
const Team = lazy(() => import('../features/panels/Team').then(module => ({ default: module.Team })));
const AdminDashboard = lazy(() => import('../features/admin/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const ResourcePage = lazy(() => import('../features/admin/ResourcePage').then(module => ({ default: module.ResourcePage })));
const PaymentQueue = lazy(() => import('../features/admin/payments/PaymentQueue').then(module => ({ default: module.PaymentQueue })));
const LiveClassManager = lazy(() => import('../features/admin/classes/LiveClassManager').then(module => ({ default: module.LiveClassManager })));
const RecordingManager = lazy(() => import('../features/admin/classes/RecordingManager').then(module => ({ default: module.RecordingManager })));
const CurriculumBuilder = lazy(() => import('../features/admin/courses/CurriculumBuilder').then(module => ({ default: module.CurriculumBuilder })));
const StudentList = lazy(() => import('../features/admin/students/StudentList').then(module => ({ default: module.StudentList })));
const MessageInbox = lazy(() => import('../features/admin/messages/MessageInbox').then(module => ({ default: module.MessageInbox })));
const MediaLibrary = lazy(() => import('../features/admin/media/MediaLibrary').then(module => ({ default: module.MediaLibrary })));
const SiteSettings = lazy(() => import('../features/admin/settings/SiteSettings').then(module => ({ default: module.SiteSettings })));
const PaymentSettings = lazy(() => import('../features/admin/settings/PaymentSettings').then(module => ({ default: module.PaymentSettings })));
const Setup2FA = lazy(() => import('../features/admin/security/Setup2FA').then(module => ({ default: module.Setup2FA })));
const ActiveSessions = lazy(() => import('../features/admin/security/ActiveSessions').then(module => ({ default: module.ActiveSessions })));
const AuditLog = lazy(() => import('../features/admin/auditlog/AuditLog').then(module => ({ default: module.AuditLog })));
const MembershipApplications = lazy(() => import('../features/admin/membership/MembershipApplications').then(module => ({ default: module.MembershipApplications })));
const ResearchApplications = lazy(() => import('../features/admin/research/ResearchApplications').then(module => ({ default: module.ResearchApplications })));

function Guard({children,roles}:{children:ReactNode;roles: string[]}){const [state,setState]=useState<{loading:boolean;role?:string}>({loading:true});useEffect(()=>{api.get('/auth/me').then(r=>setState({loading:false,role:r.data.data.role})).catch(()=>setState({loading:false}))},[]);if(state.loading)return <main className="container section">Loading...</main>;if(!state.role)return <Navigate to="/login" replace/>;if(!roles.includes(state.role))return <Navigate to="/" replace/>;return <>{children}</>}
function Home(){return <><Hero/><MissionSection/><WingsGrid/><FeaturedResearch/><TeamPreview/><Announcements/><section className="section"><div className="container"><div className="stats-grid"><div className="card stat-card"><strong>10</strong><p className="muted">Academic wings</p></div><div className="card stat-card"><strong>25+</strong><p className="muted">Research domains</p></div><div className="card stat-card"><strong>3</strong><p className="muted">Academy tracks</p></div><div className="card stat-card"><strong>24/7</strong><p className="muted">Digital access</p></div></div></div></section><section className="section"><div className="container"><div className="cta-band"><div><span className="eyebrow">Explore ASPIER</span><h2>Discover research that moves forward</h2></div><Link className="button button-primary" to="/research">Explore research</Link></div></div></section></>}
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

export function AppRouter(){return <BrowserRouter><ScrollToTop/><Suspense fallback={<main className="container section"><div className="skeleton" style={{height:80}}/></main>}><Routes>
<Route element={<PublicLayout/>}><Route index element={<Home/>}/><Route path="wings" element={<WingsGrid/>}/><Route path="wings/:slug" element={<WingPage/>}/><Route path="research" element={<ResearchList/>}/><Route path="research/:slug" element={<ResearchDetail/>}/><Route path="team" element={<Team/>}/><Route path="supervisors" element={<SupervisorList/>}/><Route path="supervisors/:slug" element={<SupervisorProfile/>}/><Route path="scholars" element={<ScholarList/>}/><Route path="scholars/:slug" element={<ScholarProfile/>}/><Route path="news" element={<NewsList/>}/><Route path="news/:slug" element={<NewsDetail/>}/><Route path="announcements" element={<NewsList/>}/><Route path="announcements/:slug" element={<NewsDetail/>}/><Route path="contact" element={<ContactForm/>}/><Route path="join" element={<JoinForm/>}/><Route path="join/portal" element={<MembershipPortal/>}/><Route path="login" element={<Login/>}/><Route path="register" element={<Register/>}/><Route path="forgot" element={<Forgot/>}/><Route path="reset" element={<Reset/>}/></Route>
<Route element={<AcademyLayout/>}><Route path="academy" element={<Catalog/>}/><Route path="academy/courses/:id" element={<CourseDetail/>}/><Route path="academy/courses/:id/payment" element={<EnrollPayment/>}/><Route path="academy/courses/:id/payment-status" element={<PaymentStatus/>}/><Route path="academy/courses/:courseId/learn/:lessonId" element={<Guard roles={['student','instructor','admin','superadmin']}><Player/></Guard>}/><Route path="academy/classes" element={<ClassSchedule/>}/><Route path="academy/instructors/:id" element={<InstructorProfile/>}/></Route>
<Route element={<Guard roles={['student','instructor','supervisor','youngScholar','admin','superadmin']}><StudentLayout/></Guard>}><Route path="student/dashboard" element={<StudentDashboard/>}/><Route path="student/courses" element={<MyCourses/>}/><Route path="student/payments" element={<PaymentHistory/>}/><Route path="student/profile" element={<Profile/>}/><Route path="student/security" element={<WebAuthnSettings/>}/></Route>
<Route element={<Guard roles={['admin','superadmin']}><AdminLayout/></Guard>}><Route path="admin" element={<AdminDashboard/>}/><Route path="admin/resources/:resource" element={<ResourcePage/>}/><Route path="admin/membership-applications" element={<MembershipApplications/>}/><Route path="admin/research-applications" element={<ResearchApplications/>}/><Route path="admin/payments" element={<PaymentQueue/>}/><Route path="admin/classes" element={<><LiveClassManager/><RecordingManager/></>}/><Route path="admin/courses/curriculum" element={<CurriculumBuilder/>}/><Route path="admin/students" element={<StudentList/>}/><Route path="admin/messages" element={<MessageInbox/>}/><Route path="admin/media" element={<MediaLibrary/>}/><Route path="admin/settings" element={<><SiteSettings/><PaymentSettings/></>}/><Route path="admin/security" element={<><Setup2FA/><WebAuthnSettings/><ActiveSessions/></>}/><Route path="admin/audit" element={<AuditLog/>}/></Route>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></Suspense></BrowserRouter>}
