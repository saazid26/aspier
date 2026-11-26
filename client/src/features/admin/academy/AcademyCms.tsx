import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Sparkles, Download, Plus, CheckCircle, Trash2, Edit2, Users, Award, ShieldCheck, Clock, ExternalLink, RefreshCw, Upload, Eye, Copy } from 'lucide-react';
import { api } from '../../../lib/api';
import { Tabs } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { SmoothImageUploader } from '../../../components/SmoothImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';
import { RESEARCH_PAPER_WRITING_CLASSES } from '../../academy/researchCourseCurriculum';

function extractYoutubeId(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : (url.length === 11 ? url : '');
}

export function AcademyCms() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Courses & Classes');
  const [seeding, setSeeding] = useState(false);

  // Courses Query
  const { data: courses = [], refetch: refetchCourses } = useQuery({
    queryKey: ['admin-academy-courses'],
    queryFn: async () => (await api.get('/admin/courses')).data.data as any[]
  });

  // Students & Enrollments Query
  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery({
    queryKey: ['admin-academy-enrollments'],
    queryFn: async () => (await api.get('/admin/enrollments')).data.data as any[]
  });

  // Raw Students Query
  const { data: students = [], refetch: refetchStudents } = useQuery({
    queryKey: ['admin-academy-students'],
    queryFn: async () => (await api.get('/admin/students')).data.data as any[]
  });

  // Certificates & Claims Query
  const { data: certsData = { certificates: [], pendingClaims: [] }, refetch: refetchCertificates } = useQuery({
    queryKey: ['admin-academy-certificates'],
    queryFn: async () => {
      const res = await api.get('/admin/certificates');
      return res.data as { certificates: any[]; pendingClaims: any[] };
    }
  });

  // Certificate Management State
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [certForm, setCertForm] = useState({
    credentialId: '',
    studentName: '',
    studentEmail: '',
    recipientRole: 'Student' as 'Student' | 'Instructor',
    studentId: '',
    enrollmentId: '',
    courseTitle: '',
    issueDate: new Date().toISOString().split('T')[0],
    certificateImage: ''
  });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  const generateCredentialId = () => {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ASP-ACAD-${year}-${rand}`;
  };

  const handleOpenIssueForClaim = (claim: any) => {
    const newId = generateCredentialId();
    setCertForm({
      credentialId: newId,
      studentName: claim.userId?.name || claim.studentName || '',
      studentEmail: claim.userId?.email || claim.studentEmail || '',
      recipientRole: 'Student',
      studentId: claim.userId?._id || claim.studentId || '',
      enrollmentId: claim._id || '',
      courseTitle: claim.courseId?.title || claim.courseTitle || '',
      issueDate: new Date().toISOString().split('T')[0],
      certificateImage: ''
    });
    setCertFile(null);
    setPreviewImage('');
    setCertificateModalOpen(true);
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.studentName || !certForm.courseTitle) {
      toast.error('Student name and course title are required');
      return;
    }
    if (!certFile && !certForm.certificateImage) {
      toast.error('Please upload a PNG certificate file or provide a certificate image');
      return;
    }

    setIssuingCertificate(true);
    try {
      const formData = new FormData();
      formData.append('credentialId', certForm.credentialId || generateCredentialId());
      formData.append('studentName', certForm.studentName);
      formData.append('recipientRole', certForm.recipientRole || 'Student');
      if (certForm.studentEmail) formData.append('studentEmail', certForm.studentEmail);
      if (certForm.studentId) formData.append('studentId', certForm.studentId);
      if (certForm.enrollmentId) formData.append('enrollmentId', certForm.enrollmentId);
      formData.append('courseTitle', certForm.courseTitle);
      formData.append('issueDate', certForm.issueDate);
      if (certFile) {
        formData.append('certificateImage', certFile);
      } else if (certForm.certificateImage) {
        formData.append('certificateImage', certForm.certificateImage);
      }

      const res = await api.post('/admin/certificates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Certificate issued successfully!');
        setCertificateModalOpen(false);
        refetchCertificates();
        refetchEnrollments();
        queryClient.invalidateQueries({ queryKey: ['admin-academy-certificates'] });
        queryClient.invalidateQueries({ queryKey: ['admin-academy-enrollments'] });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to issue certificate');
    } finally {
      setIssuingCertificate(false);
    }
  };

  const handleDeleteCertificate = async (certId: string, credentialId: string) => {
    if (!window.confirm(`Are you sure you want to revoke and delete certificate ${credentialId}?`)) {
      return;
    }
    setDeletingCertId(certId);
    try {
      const res = await api.delete(`/admin/certificates/${certId}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Certificate deleted');
        refetchCertificates();
        refetchEnrollments();
        queryClient.invalidateQueries({ queryKey: ['admin-academy-certificates'] });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete certificate');
    } finally {
      setDeletingCertId(null);
    }
  };

  // Edit Certificate State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any | null>(null);
  const [savingEditCert, setSavingEditCert] = useState(false);

  const handleOpenEditCertificate = (cert: any) => {
    setEditingCert({
      _id: cert._id,
      credentialId: cert.credentialId || '',
      studentName: cert.studentName || '',
      studentEmail: cert.studentEmail || '',
      recipientRole: cert.recipientRole || 'Student',
      studentId: cert.studentId || '',
      enrollmentId: cert.enrollmentId || '',
      courseTitle: cert.courseTitle || '',
      issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: cert.status || 'issued',
      certificateImage: cert.certificateImage || ''
    });
    setEditModalOpen(true);
  };

  const handleUpdateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert) return;
    if (!editingCert.studentName || !editingCert.courseTitle) {
      toast.error('Student name and course title are required');
      return;
    }
    if (!editingCert.credentialId) {
      toast.error('Credential ID is required');
      return;
    }
    if (!editingCert.certificateImage) {
      toast.error('Certificate image is required');
      return;
    }

    setSavingEditCert(true);
    try {
      const res = await api.put(`/admin/certificates/${editingCert._id}`, {
        credentialId: editingCert.credentialId.trim().toUpperCase(),
        studentName: editingCert.studentName.trim(),
        studentEmail: editingCert.studentEmail ? editingCert.studentEmail.trim() : undefined,
        recipientRole: editingCert.recipientRole || 'Student',
        courseTitle: editingCert.courseTitle.trim(),
        issueDate: editingCert.issueDate,
        status: editingCert.status,
        certificateImage: editingCert.certificateImage
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Certificate updated successfully!');
        setEditModalOpen(false);
        setEditingCert(null);
        refetchCertificates();
        refetchEnrollments();
        queryClient.invalidateQueries({ queryKey: ['admin-academy-certificates'] });
        queryClient.invalidateQueries({ queryKey: ['admin-academy-enrollments'] });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update certificate');
    } finally {
      setSavingEditCert(false);
    }
  };

  // Course Modal State
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);

  // Curriculum Builder State
  const [selectedCurriculumCourse, setSelectedCurriculumCourse] = useState<any | null>(null);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  // Student & Enrollment Modal State
  const [rosterFilter, setRosterFilter] = useState<'all' | 'enrollments' | 'students'>('all');
  const [editingStudentEnrollment, setEditingStudentEnrollment] = useState<{
    recordType: 'enrollment' | 'student';
    _id: string;
    userId?: string;
    studentName: string;
    studentEmail: string;
    studentPhone?: string;
    university?: string;
    courseId: string;
    courseTitle: string;
    paymentMethod: string;
    paymentStatus: string;
    trxId: string;
    feePaid: number;
    progressPercent: number;
    status: string;
  } | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  // Seed Sample Dummy Data
  const handleSeedSampleData = async () => {
    if (!window.confirm('Populate/refresh sample Academy course data and enrollments?')) {
      return;
    }
    setSeeding(true);
    try {
      const res = await api.post('/admin/academy/seed-sample');
      toast.success(res.data?.message || 'Sample Academy course data loaded successfully.');
      await Promise.all([
        refetchCourses(),
        refetchEnrollments(),
        refetchStudents(),
        queryClient.invalidateQueries({ queryKey: ['academy-courses'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-academy-courses'] })
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not load sample Academy data');
    } finally {
      setSeeding(false);
    }
  };

  // Save Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCourse(true);
    try {
      if (editingCourse._id) {
        await api.put(`/admin/courses/${editingCourse._id}`, editingCourse);
        toast.success('Course updated successfully.');
      } else {
        await api.post('/admin/courses', editingCourse);
        toast.success('Course created successfully.');
      }
      setCourseModalOpen(false);
      setEditingCourse(null);
      await refetchCourses();
      await queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save course');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!window.confirm(`Delete course "${title}"?`)) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      toast.success('Course deleted');
      await refetchCourses();
      await queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete course');
    }
  };

  // Save Curriculum & Classes
  const handleSaveCurriculum = async () => {
    if (!selectedCurriculumCourse) return;
    setSavingCurriculum(true);
    try {
      const classesToSave = (selectedCurriculumCourse.classes || []).map((cls: any, idx: number) => {
        const rawTopics = Array.isArray(cls.topics)
          ? cls.topics
          : typeof cls.topics === 'string'
          ? cls.topics.split('\n').map((t: string) => t.trim()).filter(Boolean)
          : [];

        const vUrl = cls.videoUrl || '';
        const yId = extractYoutubeId(vUrl) || cls.youtubeVideoId || cls.videoId || '';

        return {
          classNumber: typeof cls.classNumber === 'number' ? cls.classNumber : idx,
          title: cls.title || `Class ${idx}`,
          duration: cls.duration || '60 mins',
          topics: rawTopics,
          videoUrl: vUrl,
          youtubeVideoId: yId,
          videoId: yId,
          isFreePreview: Boolean(cls.isFreePreview || cls.classNumber === 0)
        };
      });

      await api.put(`/admin/courses/${selectedCurriculumCourse._id}/curriculum`, {
        classes: classesToSave,
        curriculum: classesToSave
      });
      toast.success(`Successfully saved ${classesToSave.length} classes to course curriculum!`);
      await refetchCourses();
      await queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-academy-courses'] });
      await queryClient.invalidateQueries({ queryKey: ['course', selectedCurriculumCourse._id] });
      await queryClient.invalidateQueries({ queryKey: ['course', selectedCurriculumCourse.slug] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save curriculum');
    } finally {
      setSavingCurriculum(false);
    }
  };

  // Pre-populate Standard 15 Classes
  const prepopulateStandardClasses = () => {
    if (!selectedCurriculumCourse) return;
    setSelectedCurriculumCourse({
      ...selectedCurriculumCourse,
      classes: JSON.parse(JSON.stringify(RESEARCH_PAPER_WRITING_CLASSES)),
      curriculum: JSON.parse(JSON.stringify(RESEARCH_PAPER_WRITING_CLASSES))
    });
    toast.success('Loaded standard 15 classes (Classes 0–14) with active Class 13 video link!');
  };

  // Add Class
  const addClass = () => {
    if (!selectedCurriculumCourse) return;
    const current = selectedCurriculumCourse.classes || [];
    const nextNum = current.length > 0 ? Math.max(...current.map((c: any) => c.classNumber ?? 0)) + 1 : 0;
    const newClass = {
      classNumber: nextNum,
      title: `Class ${nextNum}: New Class Topic`,
      duration: '60 mins',
      topics: [],
      videoUrl: '',
      youtubeVideoId: '',
      isFreePreview: false
    };
    setSelectedCurriculumCourse({
      ...selectedCurriculumCourse,
      classes: [...current, newClass]
    });
  };

  const handleOpenEditEnrollment = (enr: any) => {
    setEditingStudentEnrollment({
      recordType: 'enrollment',
      _id: enr._id,
      userId: enr.userId?._id || enr.userId,
      studentName: enr.studentName || 'Student',
      studentEmail: enr.studentEmail || '',
      studentPhone: enr.studentPhone || '',
      university: enr.university || '',
      courseId: enr.courseId?._id || enr.courseId || '',
      courseTitle: enr.courseTitle || 'Course',
      paymentMethod: enr.paymentMethod || 'bKash',
      paymentStatus: enr.status === 'Approved' ? 'Paid' : enr.status === 'Pending' ? 'Pending' : 'Free / Scholarship',
      trxId: enr.trxId === 'N/A' ? '' : enr.trxId || '',
      feePaid: Number(enr.feePaid || 0),
      progressPercent: Number(enr.progressPercent || 0),
      status: enr.status === 'stage1_verified' ? 'stage1_verified' : enr.status === 'final_approved' ? 'final_approved' : ['Approved', 'active', 'Active'].includes(enr.status) ? 'Active' : ['Pending', 'pending'].includes(enr.status) ? 'pending' : enr.status === 'Rejected' ? 'Inactive' : enr.status || 'Active'
    });
    setEnrollmentModalOpen(true);
  };

  const handleOpenEditStudent = (st: any) => {
    setEditingStudentEnrollment({
      recordType: 'student',
      _id: st._id,
      userId: st._id,
      studentName: st.studentName || st.name || '',
      studentEmail: st.studentEmail || st.email || '',
      studentPhone: st.studentPhone || st.phone || '',
      university: st.university || '',
      courseId: st.courseId || '',
      courseTitle: st.courseTitle || 'Direct User Account (No Course Yet)',
      paymentMethod: st.paymentMethod || 'Free / None',
      paymentStatus: st.paymentStatus || 'Free / Scholarship',
      trxId: st.trxId || '',
      feePaid: Number(st.feePaid || 0),
      progressPercent: Number(st.progressPercent || 0),
      status: st.status || (st.isActive !== false ? 'Active' : 'Inactive')
    });
    setEnrollmentModalOpen(true);
  };

  // Save Student or Enrollment
  const handleSaveStudentEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentEnrollment) return;
    if (!editingStudentEnrollment.studentName.trim() || !editingStudentEnrollment.studentEmail.trim()) {
      toast.error('Student name and email are required');
      return;
    }
    setSavingEnrollment(true);
    try {
      if (editingStudentEnrollment.recordType === 'enrollment') {
        await api.put(`/admin/enrollments/${editingStudentEnrollment._id}`, {
          studentName: editingStudentEnrollment.studentName,
          studentEmail: editingStudentEnrollment.studentEmail,
          studentPhone: editingStudentEnrollment.studentPhone,
          university: editingStudentEnrollment.university,
          courseId: editingStudentEnrollment.courseId || undefined,
          status: editingStudentEnrollment.status,
          progressPercent: Number(editingStudentEnrollment.progressPercent || 0),
          paymentMethod: editingStudentEnrollment.paymentMethod,
          paymentStatus: editingStudentEnrollment.paymentStatus,
          trxId: editingStudentEnrollment.trxId,
          feePaid: Number(editingStudentEnrollment.feePaid || 0)
        });
        toast.success('Enrollment and student details saved successfully.');
      } else {
        await api.put(`/admin/students/${editingStudentEnrollment._id}`, {
          name: editingStudentEnrollment.studentName,
          email: editingStudentEnrollment.studentEmail,
          phone: editingStudentEnrollment.studentPhone,
          university: editingStudentEnrollment.university,
          status: editingStudentEnrollment.status,
          courseId: editingStudentEnrollment.courseId || undefined,
          progressPercent: Number(editingStudentEnrollment.progressPercent || 0),
          paymentMethod: editingStudentEnrollment.paymentMethod,
          paymentStatus: editingStudentEnrollment.paymentStatus,
          trxId: editingStudentEnrollment.trxId,
          feePaid: Number(editingStudentEnrollment.feePaid || 0)
        });
        toast.success('Student user account saved successfully.');
      }
      setEnrollmentModalOpen(false);
      setEditingStudentEnrollment(null);

      // Instant Roster Sync across React Query keys
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-enrollments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-academy-students'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        refetchEnrollments(),
        refetchStudents()
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save student changes');
    } finally {
      setSavingEnrollment(false);
    }
  };

  const handleQuickApproveEnrollment = async (id: string) => {
    try {
      await api.patch(`/admin/enrollments/${id}`, { status: 'Approved' });
      toast.success('Enrollment approved & activated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-enrollments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        refetchEnrollments()
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not approve enrollment');
    }
  };

  const handleDeleteEnrollment = async (id: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the enrollment for "${studentName}"?`)) return;
    try {
      await api.delete(`/admin/enrollments/${id}`);
      toast.success('Enrollment deleted successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-enrollments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        refetchEnrollments()
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete enrollment');
    }
  };

  const handleDeleteStudent = async (id: string, studentName: string, email: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete student account "${studentName}" (${email}) and all linked records? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/students/${id}`);
      toast.success(`Student user "${studentName}" deleted permanently.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-academy-students'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-academy-enrollments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        refetchStudents(),
        refetchEnrollments()
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete student account');
    }
  };

  // Export Roster to CSV
  const exportStudentsCsv = () => {
    const rows = [
      ['Student Name', 'Email', 'Phone', 'Course Title', 'Payment Method', 'TrxID', 'Fee Paid (BDT)', 'Status', 'Progress %', 'Enrolled Date'],
      ...enrollments.map((enr: any) => [
        enr.studentName || 'Student',
        enr.studentEmail || '',
        enr.studentPhone || '',
        enr.courseTitle || '',
        enr.paymentMethod || 'bKash',
        enr.trxId || '',
        enr.feePaid || 0,
        enr.status || 'Approved',
        `${enr.progressPercent || 0}%`,
        enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : ''
      ]),
      ...students
        .filter((st: any) => !enrollments.some((enr: any) => String(enr.userId?._id || enr.userId) === String(st._id)))
        .map((st: any) => [
          st.name || 'Student',
          st.email || '',
          st.phone || '',
          'Direct User Account',
          '—',
          '—',
          0,
          st.isActive !== false ? 'Active' : 'Suspended',
          '0%',
          st.createdAt ? new Date(st.createdAt).toLocaleDateString() : ''
        ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aspier_academy_students_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Students roster exported to CSV.');
  };

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="eyebrow">CMS Administration</span>
            <h1 style={{ margin: '4px 0 8px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              ASPIER Academy & Class Management System
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: '0.925rem', color: '#64748b' }}>
              Complete control over courses, syllabi, class schedules, instructors, student rosters, and enrollment approvals.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={handleSeedSampleData}
              disabled={seeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#0d9488', color: '#0f766e', background: '#f0fdfa' }}
            >
              <Sparkles size={16} />
              {seeding ? 'Seeding Data…' : 'Load Sample Dummy Data'}
            </Button>
            <Button
              onClick={() => {
                setEditingCourse({
                  title: '',
                  slug: '',
                  description: '',
                  duration: '8 weeks',
                  mode: 'Online and Live',
                  startDate: new Date().toISOString().split('T')[0],
                  price: 2500,
                  level: 'beginner',
                  status: 'published',
                  thumbnail: ''
                });
                setCourseModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              Create Academy Course
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        tabs={['Courses & Classes', 'Curriculum & Classes', 'Students & Enrollments', 'Certificates & Verification']}
        active={activeTab === 'Curriculum & Modules' ? 'Curriculum & Classes' : activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Courses & Classes */}
      {activeTab === 'Courses & Classes' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <p className="muted" style={{ margin: 0 }}>Total Academy Courses: <strong>{courses.length}</strong></p>
            <Button
              onClick={() => {
                setEditingCourse({
                  title: '',
                  slug: '',
                  description: '',
                  duration: '8 weeks',
                  mode: 'Online and Live',
                  startDate: new Date().toISOString().split('T')[0],
                  price: 2500,
                  level: 'beginner',
                  status: 'published',
                  thumbnail: ''
                });
                setCourseModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              + Create Academy Course
            </Button>
          </div>

          <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
            <Table headers={['Banner', 'Course Title', 'Start Date', 'Mode', 'Fee (BDT)', 'Status', 'Actions']}>
              {courses.map((course) => (
                <tr key={course._id}>
                  <td style={{ width: 84 }}>
                    {course.thumbnail || course.bannerUrl ? (
                      <img
                        src={course.thumbnail || course.bannerUrl}
                        alt={course.title}
                        style={{ width: 72, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                      />
                    ) : (
                      <div style={{ width: 72, height: 44, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                        Default
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a', fontSize: '0.925rem' }}>{course.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{course.slug}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{course.startDate || 'TBA'}</td>
                  <td>
                    <Badge variant="blue">{course.mode || course.deliveryMode || 'Online'}</Badge>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <strong style={{ color: '#0f766e' }}>৳{course.price || 0} BDT</strong>
                  </td>
                  <td>
                    <Badge variant={course.status === 'published' ? 'green' : 'amber'}>
                      {course.status || 'draft'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => {
                          setEditingCourse({ ...course });
                          setCourseModalOpen(true);
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDeleteCourse(course._id, course.title)}
                      >
                        <Trash2 size={13} />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      )}

      {/* Tab 2: Curriculum & Classes */}
      {(activeTab === 'Curriculum & Classes' || activeTab === 'Curriculum & Modules') && (
        <div style={{ marginTop: 20 }}>
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: '#0f172a' }}>
              Select Course to Manage Curriculum & Recorded Classes
            </label>
            <select
              className="select"
              value={selectedCurriculumCourse?._id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c._id === e.target.value);
                if (found) {
                  const copy = JSON.parse(JSON.stringify(found));
                  if (!copy.classes || copy.classes.length === 0) {
                    copy.classes = (copy.curriculum && copy.curriculum.length > 0)
                      ? copy.curriculum
                      : JSON.parse(JSON.stringify(RESEARCH_PAPER_WRITING_CLASSES));
                  }
                  setSelectedCurriculumCourse(copy);
                } else {
                  setSelectedCurriculumCourse(null);
                }
              }}
              style={{ width: '100%', maxWidth: 540 }}
            >
              <option value="">-- Choose an academy course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          {selectedCurriculumCourse && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    Curriculum & Classes: {selectedCurriculumCourse.title}
                  </h3>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    Total Classes: {(selectedCurriculumCourse.classes || []).length} Recorded Classes
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button type="button" variant="secondary" onClick={prepopulateStandardClasses} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} />
                    Pre-populate Standard 15 Classes
                  </Button>
                  <Button type="button" variant="secondary" onClick={addClass} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} />
                    Add Class
                  </Button>
                  <Button disabled={savingCurriculum} onClick={handleSaveCurriculum}>
                    {savingCurriculum ? 'Saving…' : 'Save Classes & Curriculum'}
                  </Button>
                </div>
              </div>

              {(!selectedCurriculumCourse.classes || selectedCurriculumCourse.classes.length === 0) ? (
                <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                  <p style={{ margin: 0, color: '#64748b' }}>No classes configured yet for this course.</p>
                  <Button type="button" variant="secondary" onClick={prepopulateStandardClasses} style={{ marginTop: 12 }}>
                    Load Standard 15 Classes (Classes 0–14)
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedCurriculumCourse.classes.map((cls: any, cIdx: number) => {
                    const rawTopics = Array.isArray(cls.topics)
                      ? cls.topics
                      : typeof cls.topics === 'string'
                      ? cls.topics.split('\n').map((t: string) => t.trim()).filter(Boolean)
                      : [];

                    const cleanTitle = (cls.title || '').trim().toLowerCase();
                    const distinctTopics = rawTopics.filter(
                      (t: string) => t && t.trim().toLowerCase() !== cleanTitle
                    );
                    const isSingleTopic = distinctTopics.length === 0;

                    return (
                      <div
                        key={cIdx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: 18,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* Class Header Row */}
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              background: '#0f766e',
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          >
                            Class {cls.classNumber ?? cIdx}
                          </span>

                          <div style={{ width: 90 }}>
                            <Input
                              type="number"
                              title="Class Number"
                              placeholder="No."
                              value={cls.classNumber ?? cIdx}
                              onChange={(e) => {
                                const copy = [...selectedCurriculumCourse.classes];
                                copy[cIdx].classNumber = Number(e.target.value);
                                setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                              }}
                            />
                          </div>

                          <div style={{ flex: '2 1 240px' }}>
                            <Input
                              placeholder="Class Title (e.g. Orientation Class)"
                              value={cls.title || ''}
                              onChange={(e) => {
                                const copy = [...selectedCurriculumCourse.classes];
                                copy[cIdx].title = e.target.value;
                                setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                              }}
                            />
                          </div>

                          <div style={{ width: 130 }}>
                            <Input
                              placeholder="Duration"
                              value={cls.duration || '60 mins'}
                              onChange={(e) => {
                                const copy = [...selectedCurriculumCourse.classes];
                                copy[cIdx].duration = e.target.value;
                                setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={cIdx === 0}
                              onClick={() => {
                                const copy = [...selectedCurriculumCourse.classes];
                                const [item] = copy.splice(cIdx, 1);
                                copy.splice(cIdx - 1, 0, item);
                                setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                              }}
                              style={{ padding: '6px 10px' }}
                              title="Move Up"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={cIdx === selectedCurriculumCourse.classes.length - 1}
                              onClick={() => {
                                const copy = [...selectedCurriculumCourse.classes];
                                const [item] = copy.splice(cIdx, 1);
                                copy.splice(cIdx + 1, 0, item);
                                setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                              }}
                              style={{ padding: '6px 10px' }}
                              title="Move Down"
                            >
                              ↓
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                              if (!window.confirm(`Delete Class ${cls.classNumber ?? cIdx}: "${cls.title}"?`)) return;
                              const copy = selectedCurriculumCourse.classes.filter((_: any, idx: number) => idx !== cIdx);
                              setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                            }}
                            style={{ padding: '6px 12px' }}
                          >
                            Delete
                          </Button>
                        </div>

                        {/* Video URL & Playback Info */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                            YouTube Video Link / Video ID
                          </label>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <Input
                              placeholder="e.g. https://youtu.be/hPiHnjo7rIs or YouTube ID"
                              value={cls.videoUrl || cls.youtubeVideoId || ''}
                              onChange={(e) => {
                                const copy = [...selectedCurriculumCourse.classes];
                                const url = e.target.value;
                                copy[cIdx].videoUrl = url;
                                copy[cIdx].youtubeVideoId = extractYoutubeId(url);
                                copy[cIdx].videoId = copy[cIdx].youtubeVideoId;
                                setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                              }}
                            />
                            {cls.videoUrl && (
                              <a
                                href={cls.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                              >
                                Test Link <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Topics (with Clean/Deduplicated Status) */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                              Class Topics / Sub-Bullets (one per line, leave empty if single-topic)
                            </label>
                            {isSingleTopic ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: 4 }}>
                                ✓ Single-Topic Class (heading title will NOT repeat as sub-bullet)
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: 4 }}>
                                ★ Multi-Topic Class ({distinctTopics.length} distinct bullet points)
                              </span>
                            )}
                          </div>
                          <textarea
                            className="input"
                            rows={Math.max(2, rawTopics.length + 1)}
                            placeholder="e.g.&#10;Topic 1: How to start Research&#10;Topic 2: Process of Literature Review&#10;(Or leave empty for single-topic classes)"
                            value={Array.isArray(cls.topics) ? cls.topics.join('\n') : cls.topics || ''}
                            onChange={(e) => {
                              const copy = [...selectedCurriculumCourse.classes];
                              copy[cIdx].topics = e.target.value.split('\n');
                              setSelectedCurriculumCourse({ ...selectedCurriculumCourse, classes: copy });
                            }}
                            style={{ resize: 'vertical', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Students & Enrollments */}
      {activeTab === 'Students & Enrollments' && (() => {
        // Build unified roster ensuring every student and enrollment is included without duplication
        const directStudentIdsFromEnrollments = new Set(
          enrollments.filter((e: any) => e.recordType === 'student' || e.isDirectUser).map((e: any) => String(e._id || e.userId))
        );
        const enrolledUserIds = new Set(
          enrollments.filter((e: any) => e.recordType === 'enrollment' || (e.courseId && e.courseTitle !== 'Direct User Account')).map((e: any) => String(e.userId?._id || e.userId || ''))
        );

        const directStudentsFromUsers = students
          .filter((s: any) => !enrolledUserIds.has(String(s._id)) && !directStudentIdsFromEnrollments.has(String(s._id)))
          .map((s: any) => ({
            _id: s._id,
            recordType: 'student',
            studentName: s.name,
            studentEmail: s.email,
            studentPhone: s.phone || '',
            university: s.university || '',
            courseTitle: 'Direct User Account',
            courseId: '',
            paymentMethod: '—',
            trxId: '—',
            feePaid: 0,
            progressPercent: 0,
            status: s.isActive !== false ? 'Active' : 'Inactive',
            rawStatus: s.isActive !== false ? 'active' : 'inactive',
            isActive: s.isActive !== false
          }));

        const unifiedRoster = [
          ...enrollments.map((e: any) => ({
            ...e,
            recordType: e.recordType || (e.courseTitle === 'Direct User Account' || !e.courseId ? 'student' : 'enrollment')
          })),
          ...directStudentsFromUsers
        ];

        const activeEnrollmentsCount = unifiedRoster.filter((r: any) => r.recordType === 'enrollment').length;
        const totalRegisteredStudentsCount = Math.max(students.length, unifiedRoster.length);

        const displayList = rosterFilter === 'enrollments'
          ? unifiedRoster.filter((r: any) => r.recordType === 'enrollment')
          : rosterFilter === 'students'
          ? unifiedRoster.filter((r: any) => r.recordType === 'student')
          : unifiedRoster;

        return (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                  Active Enrollments: <strong>{activeEnrollmentsCount}</strong> | Total Registered Student Users: <strong>{totalRegisteredStudentsCount}</strong>
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('all')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: rosterFilter === 'all' ? '#0f766e' : '#cbd5e1',
                      background: rosterFilter === 'all' ? '#0f766e' : '#f8fafc',
                      color: rosterFilter === 'all' ? '#fff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    All ({unifiedRoster.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('enrollments')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: rosterFilter === 'enrollments' ? '#0f766e' : '#cbd5e1',
                      background: rosterFilter === 'enrollments' ? '#0f766e' : '#f8fafc',
                      color: rosterFilter === 'enrollments' ? '#fff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Course Enrollments ({activeEnrollmentsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('students')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: rosterFilter === 'students' ? '#0f766e' : '#cbd5e1',
                      background: rosterFilter === 'students' ? '#0f766e' : '#f8fafc',
                      color: rosterFilter === 'students' ? '#fff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Direct Student Accounts ({unifiedRoster.filter((r: any) => r.recordType === 'student').length})
                  </button>
                </div>
              </div>

              <Button variant="secondary" onClick={exportStudentsCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Download size={15} />
                Export Students Roster (CSV)
              </Button>
            </div>

            <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
              <Table headers={['Student Name', 'Email', 'Course Enrolled', 'Payment Info', 'Progress', 'Status', 'Actions']}>
                {displayList.length > 0 ? (
                  displayList.map((row: any) => (
                    <tr key={`${row.recordType}-${row._id}`}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{row.studentName || 'Student'}</strong>
                        {row.recordType === 'student' && (
                          <span style={{ fontSize: '0.7rem', color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 600 }}>
                            Direct Account
                          </span>
                        )}
                        {row.university && (
                          <div style={{ fontSize: '0.775rem', color: '#64748b' }}>{row.university}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <a href={`mailto:${row.studentEmail}`} style={{ color: '#0d9488', fontSize: '0.85rem' }}>
                            {row.studentEmail}
                          </a>
                          {row.studentEmail && (
                            <Button
                              variant="secondary"
                              style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              title="Copy student Gmail"
                              onClick={() => {
                                navigator.clipboard.writeText(row.studentEmail);
                                toast.success(`Copied: ${row.studentEmail}`);
                              }}
                            >
                              <Copy size={11} /> Copy Gmail
                            </Button>
                          )}
                        </div>
                        {row.studentPhone && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.studentPhone}</div>
                        )}
                      </td>
                      <td>
                        {row.recordType === 'enrollment' ? (
                          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{row.courseTitle}</strong>
                        ) : (
                          <Badge variant="gray">Direct User Account</Badge>
                        )}
                      </td>
                      <td>
                        {row.recordType === 'enrollment' ? (
                          <div>
                            <div style={{ fontSize: '0.825rem' }}>
                              <span style={{ fontWeight: 600, color: '#0f766e' }}>{row.paymentMethod}</span> • ৳{row.feePaid} BDT
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              TrxID: {row.trxId}
                            </div>
                          </div>
                        ) : (
                          <span className="muted" style={{ fontSize: '0.825rem' }}>No Course Enrolled</span>
                        )}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        {row.recordType === 'enrollment' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.progressPercent || 0))}%`,
                                  height: '100%',
                                  background: (row.progressPercent || 0) === 100 ? '#10b981' : '#0d9488',
                                  borderRadius: 4
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                              {row.progressPercent || 0}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>0%</span>
                        )}
                      </td>
                      <td>
                        {row.status === 'stage1_verified' || row.status === 'Stage 1 Verified' ? (
                          <Badge variant="blue">Stage 1 Verified</Badge>
                        ) : row.status === 'final_approved' || row.status === 'Final Approved' ? (
                          <Badge variant="green">Final Approved (YouTube Access)</Badge>
                        ) : (
                          <Badge variant={['Approved', 'Active', 'active'].includes(row.status) ? 'green' : ['Pending', 'pending'].includes(row.status) ? 'amber' : 'gray'}>
                            {row.status}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {['Pending', 'pending'].includes(row.status) && row.recordType === 'enrollment' && (
                            <Button
                              variant="secondary"
                              style={{ padding: '5px 10px', fontSize: '0.775rem', color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => handleQuickApproveEnrollment(row._id)}
                            >
                              <CheckCircle size={13} />
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            style={{ padding: '5px 10px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => row.recordType === 'enrollment' ? handleOpenEditEnrollment(row) : handleOpenEditStudent(row)}
                          >
                            <Edit2 size={13} />
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            style={{ padding: '5px 10px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => row.recordType === 'enrollment' ? handleDeleteEnrollment(row._id, row.studentName || 'Student') : handleDeleteStudent(row._id, row.studentName || 'Student', row.studentEmail)}
                          >
                            <Trash2 size={13} />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Users size={32} style={{ color: '#94a3b8' }} />
                        <div style={{ fontWeight: 600, color: '#334155' }}>No Student Records Found</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Enrollment applications and student user records will appear here once registered.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Table>
            </div>
          </div>
        );
      })()}

      {/* Tab 6: Certificates & Verification */}
      {activeTab === 'Certificates & Verification' && (
        <div style={{ marginTop: 20 }} className="space-y-8">
          {/* Top Summary & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Academy Certificates & Verification Manager
              </h3>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                Review student completion claims (6–12h review queue), issue official PNG certificates, and manage public verification records.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                onClick={() => { refetchCertificates(); refetchEnrollments(); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={15} />
                Refresh Registry
              </Button>
              <Button
                onClick={() => {
                  setCertForm({
                    credentialId: generateCredentialId(),
                    studentName: '',
                    studentEmail: '',
                    recipientRole: 'Student',
                    studentId: '',
                    enrollmentId: '',
                    courseTitle: courses[0]?.title || '',
                    issueDate: new Date().toISOString().split('T')[0],
                    certificateImage: ''
                  });
                  setCertFile(null);
                  setPreviewImage('');
                  setCertificateModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} />
                Issue New Certificate
              </Button>
            </div>
          </div>

          {/* Section A: Pending Claims (6-12h Queue) */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} style={{ color: '#d97706' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Pending Student Claims (6–12h Queue)
                </h4>
                <span className="badge badge-yellow" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {certsData.pendingClaims?.length || 0} Waiting
                </span>
              </div>
            </div>

            {(!certsData.pendingClaims || certsData.pendingClaims.length === 0) ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem', background: '#f8fafc', borderRadius: 8 }}>
                <CheckCircle size={24} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
                Zero pending claims. All student certificate requests have been fulfilled!
              </div>
            ) : (
              <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <Table headers={['Student', 'Course Title', 'Claim Submitted', 'Progress', 'Action']}>
                  {certsData.pendingClaims.map((claim: any) => (
                    <tr key={claim._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{claim.userId?.name || 'Student'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{claim.userId?.email || 'No email'}</div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{claim.courseId?.title || 'Course'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {claim.certificateClaimedAt ? new Date(claim.certificateClaimedAt).toLocaleString() : 'Recently'}
                      </td>
                      <td>
                        <span className="badge badge-green">100% Complete</span>
                      </td>
                      <td>
                        <Button
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={() => handleOpenIssueForClaim(claim)}
                        >
                          <Award size={14} />
                          Issue Certificate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </div>

          {/* Section B: Issued Certificates Registry */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} style={{ color: '#0f766e' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Issued Certificates Registry
                </h4>
                <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {certsData.certificates?.length || 0} Issued
                </span>
              </div>
            </div>

            {(!certsData.certificates || certsData.certificates.length === 0) ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem', background: '#f8fafc', borderRadius: 8 }}>
                No certificates issued yet. Issue your first certificate using the button above.
              </div>
            ) : (
              <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <Table headers={['PNG Preview', 'Credential ID', 'Recipient', 'Role', 'Course Title', 'Issue Date', 'Status', 'Actions']}>
                  {certsData.certificates.map((cert: any) => (
                    <tr key={cert._id}>
                      <td style={{ width: 80 }}>
                        <a
                          href={cert.certificateImage || `/api/certificates/image/${encodeURIComponent(cert.credentialId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Click to view full resolution PNG"
                        >
                          <img
                            src={cert.certificateImage || `/api/certificates/image/${encodeURIComponent(cert.credentialId)}`}
                            alt={cert.credentialId}
                            style={{ width: 70, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="70" height="48" fill="%23e2e8f0"><rect width="70" height="48"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="9" fill="%2364748b">PNG</text></svg>';
                            }}
                          />
                        </a>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e', fontSize: '0.85rem' }}>
                          {cert.credentialId}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{cert.studentName}</div>
                        {cert.studentEmail && <div style={{ fontSize: '0.785rem', color: '#64748b' }}>{cert.studentEmail}</div>}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={
                            cert.recipientRole === 'Instructor'
                              ? { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px' }
                              : { background: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4', fontWeight: 700, fontSize: '0.75rem', padding: '3px 8px' }
                          }
                        >
                          {cert.recipientRole === 'Instructor' ? 'Instructor' : 'Student'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cert.courseTitle}</td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                        {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <span className={`badge ${cert.status === 'issued' ? 'badge-green' : 'badge-yellow'}`}>
                          {cert.status || 'issued'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Button
                            variant="secondary"
                            style={{ padding: '5px 9px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleOpenEditCertificate(cert)}
                            title="Edit Certificate"
                          >
                            <Edit2 size={13} />
                            Edit
                          </Button>
                          <a
                            href={`/academy/verify-certificate?id=${encodeURIComponent(cert.credentialId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button button-secondary"
                            style={{ padding: '5px 9px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Open Public Verification Link"
                          >
                            <ExternalLink size={13} />
                            Verify Link
                          </a>
                          <a
                            href={cert.certificateImage || `/api/certificates/image/${encodeURIComponent(cert.credentialId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button button-secondary"
                            style={{ padding: '5px 9px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="View Raw PNG Buffer"
                          >
                            <Eye size={13} />
                            PNG
                          </a>
                          <Button
                            variant="danger"
                            disabled={deletingCertId === cert._id}
                            style={{ padding: '5px 9px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleDeleteCertificate(cert._id, cert.credentialId)}
                            title="Revoke / Delete Certificate"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Edit/Create Modal */}
      {courseModalOpen && editingCourse && (
        <Modal open={courseModalOpen} title={editingCourse._id ? `Edit: ${editingCourse.title}` : 'New Academy Course'} onClose={() => setCourseModalOpen(false)}>
          <form className="form" onSubmit={handleSaveCourse} style={{ marginTop: 12 }}>
            <label>
              Course Title
              <Input
                required
                value={editingCourse.title || ''}
                onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                placeholder="e.g. Higher Study Oriented Basic to Advance Research Paper Writing Course"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                URL Slug
                <Input
                  required
                  value={editingCourse.slug || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, slug: e.target.value })}
                />
              </label>

              <label>
                Class Mode
                <select
                  className="select"
                  value={editingCourse.mode || 'Online Recorded'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, mode: e.target.value, deliveryMode: e.target.value })}
                >
                  <option value="Online Recorded">Online Recorded</option>
                  <option value="Online and Recorded">Online and Recorded</option>
                  <option value="Online and Live">Online and Live</option>
                  <option value="In-Person Workshop">In-Person Workshop</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <label>
                Start Date
                <Input
                  type="date"
                  value={editingCourse.startDate ? new Date(editingCourse.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, startDate: e.target.value })}
                />
              </label>

              <label>
                Course Duration
                <Input
                  value={editingCourse.duration || '8 weeks'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                />
              </label>

              <label>
                Course Fee (BDT)
                <Input
                  type="number"
                  value={Number(editingCourse.price || 0)}
                  onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Publication Status
                <select
                  className="select"
                  value={editingCourse.status || 'published'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, status: e.target.value })}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label>
                Difficulty Level
                <select
                  className="select"
                  value={editingCourse.level || 'beginner'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, level: e.target.value })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>

            <label>
              Full Course Description & Outcomes
              <RichTextEditor
                value={editingCourse.description || ''}
                onChange={(val) => setEditingCourse({ ...editingCourse, description: val })}
              />
            </label>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Course Banner Graphic (16:9)</label>
              <ImageUploader
                value={editingCourse.thumbnail || editingCourse.bannerUrl || ''}
                onUploaded={(url) => setEditingCourse({ ...editingCourse, thumbnail: url, bannerUrl: url })}
                shape="banner"
                variant="cover"
                helperText="Recommended Size: 1280 × 720 px (16:9 Aspect Ratio, WebP/PNG/JPG) — Fits both Course Cards and Detail Pages with zero cropping."
                maxSizeMB={3}
              />
            </div>

            {/* Course Instructors Manager */}
            <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    Course Instructors
                  </label>
                  <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>
                    Instructors assigned directly to this course (displayed on course syllabus page)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ fontSize: '0.8rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => {
                    const current = editingCourse.instructors || [];
                    setEditingCourse({
                      ...editingCourse,
                      instructors: [
                        ...current,
                        { name: '', designationOrDetails: 'Course Instructor & Research Mentor', photoUrl: '', bio: '' }
                      ]
                    });
                  }}
                >
                  <Plus size={14} /> Add Instructor
                </Button>
              </div>

              {(!editingCourse.instructors || editingCourse.instructors.length === 0) ? (
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No instructors assigned yet. Click "Add Instructor" to attach instructors with photo, credentials, and bio.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {editingCourse.instructors.map((ins: any, iIdx: number) => (
                    <div key={iIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0f766e' }}>Instructor #{iIdx + 1}</strong>
                        <button
                          type="button"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          onClick={() => {
                            const current = [...(editingCourse.instructors || [])];
                            current.splice(iIdx, 1);
                            setEditingCourse({ ...editingCourse, instructors: current });
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Instructor Name *</label>
                          <Input
                            placeholder="e.g. Dr. Jane Doe"
                            value={ins.name || ''}
                            onChange={(e) => {
                              const current = [...(editingCourse.instructors || [])];
                              current[iIdx] = { ...current[iIdx], name: e.target.value };
                              setEditingCourse({ ...editingCourse, instructors: current });
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Designation / Credentials</label>
                          <Input
                            placeholder="e.g. Lead Instructor · Senior Research Fellow"
                            value={ins.designationOrDetails || ''}
                            onChange={(e) => {
                              const current = [...(editingCourse.instructors || [])];
                              current[iIdx] = { ...current[iIdx], designationOrDetails: e.target.value };
                              setEditingCourse({ ...editingCourse, instructors: current });
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Instructor Bio / Summary</label>
                        <Input
                          placeholder="Brief academic credentials and research background"
                          value={ins.bio || ''}
                          onChange={(e) => {
                            const current = [...(editingCourse.instructors || [])];
                            current[iIdx] = { ...current[iIdx], bio: e.target.value };
                            setEditingCourse({ ...editingCourse, instructors: current });
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Instructor Photo (Cloudinary)</label>
                        <ImageUploader
                          value={ins.photoUrl || ''}
                          onUploaded={(url) => {
                            const current = [...(editingCourse.instructors || [])];
                            current[iIdx] = { ...current[iIdx], photoUrl: url };
                            setEditingCourse({ ...editingCourse, instructors: current });
                          }}
                          shape="circle"
                          variant="circle"
                          folder="aspier/academy/instructors"
                          helperText="Upload instructor photo (saved to Cloudinary aspier/academy/instructors)"
                          maxSizeMB={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingCourse}>{savingCourse ? 'Saving…' : 'Save Course'}</Button>
              <Button type="button" variant="secondary" onClick={() => setCourseModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Student / Enrollment Modal */}
      {enrollmentModalOpen && editingStudentEnrollment && (
        <Modal
          open={enrollmentModalOpen}
          title="Edit Student & Enrollment Record"
          onClose={() => setEnrollmentModalOpen(false)}
        >
          <form className="form" onSubmit={handleSaveStudentEnrollment} style={{ marginTop: 12 }}>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{editingStudentEnrollment.studentName || 'Student'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{editingStudentEnrollment.studentEmail}</div>
              </div>
              <Badge variant={editingStudentEnrollment.recordType === 'enrollment' ? 'blue' : 'gray'}>
                {editingStudentEnrollment.recordType === 'enrollment' ? 'Course Enrollment' : 'Direct User Account'}
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <label>
                Student Full Name *
                <Input
                  required
                  value={editingStudentEnrollment.studentName}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, studentName: e.target.value })}
                  placeholder="Full Name"
                />
              </label>

              <label>
                Email Address *
                <Input
                  required
                  type="email"
                  value={editingStudentEnrollment.studentEmail}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, studentEmail: e.target.value })}
                  placeholder="student@example.com"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
              <label>
                Phone Number
                <Input
                  value={editingStudentEnrollment.studentPhone || ''}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, studentPhone: e.target.value })}
                  placeholder="+880 1XXXXXXXXX"
                />
              </label>

              <label>
                University / Institution
                <Input
                  value={editingStudentEnrollment.university || ''}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, university: e.target.value })}
                  placeholder="e.g. Dhaka University"
                />
              </label>
            </div>

            <label style={{ marginTop: 10 }}>
              Enrolled Course
              <select
                className="select"
                value={editingStudentEnrollment.courseId}
                onChange={(e) => {
                  const selectedCourse = courses.find((c: any) => c._id === e.target.value);
                  setEditingStudentEnrollment({
                    ...editingStudentEnrollment,
                    courseId: e.target.value,
                    courseTitle: selectedCourse ? selectedCourse.title : 'Direct User Account / None'
                  });
                }}
              >
                <option value="">Direct User Account (No Course Yet)</option>
                {courses.map((c: any) => (
                  <option key={c._id} value={c._id}>
                    {c.title} {c.price ? `(৳${c.price} BDT)` : '(Free)'}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
              <label>
                Payment Status
                <select
                  className="select"
                  value={editingStudentEnrollment.paymentStatus}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, paymentStatus: e.target.value })}
                >
                  <option value="Paid">Paid / Approved</option>
                  <option value="Pending">Pending Verification</option>
                  <option value="Free / Scholarship">Free / Scholarship</option>
                  <option value="Waived">Waived / Special Approval</option>
                  <option value="Rejected">Rejected / Refunded</option>
                </select>
              </label>

              <label>
                Payment Method & Provider
                <Input
                  value={editingStudentEnrollment.paymentMethod}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, paymentMethod: e.target.value })}
                  placeholder="e.g. bKash, Nagad, Bank, Scholarship"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
              <label>
                Transaction ID / Reference
                <Input
                  value={editingStudentEnrollment.trxId}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, trxId: e.target.value })}
                  placeholder="e.g. TRX-XXXXXX or N/A"
                />
              </label>

              <label>
                Fee Paid (BDT)
                <Input
                  type="number"
                  min={0}
                  value={editingStudentEnrollment.feePaid}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, feePaid: Number(e.target.value) })}
                  placeholder="0"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
              <label>
                Course Progress (% completed)
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingStudentEnrollment.progressPercent}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, progressPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                />
              </label>

              <label>
                Account / Enrollment Status
                <select
                  className="select"
                  value={editingStudentEnrollment.status}
                  onChange={(e) => setEditingStudentEnrollment({ ...editingStudentEnrollment, status: e.target.value })}
                >
                  <option value="pending">Pending Payment Verification</option>
                  <option value="stage1_verified">Stage 1 Verified (Payment Verified)</option>
                  <option value="final_approved">Final Approved — YouTube Access Granted</option>
                  <option value="Active">Active (Full Access)</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={() => setEnrollmentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEnrollment} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {savingEnrollment ? <><RefreshCw className="animate-spin" size={15} /> Saving Changes…</> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Issue Certificate Modal */}
      {certificateModalOpen && (
        <Modal
          open={certificateModalOpen}
          title="Issue Official Academy Certificate"
          onClose={() => setCertificateModalOpen(false)}
        >
          <form className="form" onSubmit={handleIssueCertificate} style={{ marginTop: 12 }}>
            <label>
              Credential ID
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Input
                  required
                  value={certForm.credentialId}
                  onChange={(e) => setCertForm({ ...certForm, credentialId: e.target.value.toUpperCase() })}
                  placeholder="e.g. ASP-ACAD-2026-XXXXX"
                  style={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCertForm({ ...certForm, credentialId: generateCredentialId() })}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Generate ID
                </Button>
              </div>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Recipient Name
                <Input
                  required
                  value={certForm.studentName}
                  onChange={(e) => setCertForm({ ...certForm, studentName: e.target.value })}
                  placeholder="e.g. Ayesha Siddiqua"
                />
              </label>

              <label>
                Recipient Role / Category
                <select
                  className="select"
                  value={certForm.recipientRole || 'Student'}
                  onChange={(e) => setCertForm({ ...certForm, recipientRole: e.target.value as 'Student' | 'Instructor' })}
                  style={{ marginTop: 4, width: '100%' }}
                >
                  <option value="Student">Student</option>
                  <option value="Instructor">Instructor</option>
                </select>
              </label>
            </div>

            <label>
              Recipient Email (Optional)
              <Input
                type="email"
                value={certForm.studentEmail}
                onChange={(e) => setCertForm({ ...certForm, studentEmail: e.target.value })}
                placeholder="e.g. user@example.com"
              />
            </label>

            <label>
              Course Title
              <Input
                required
                value={certForm.courseTitle}
                onChange={(e) => setCertForm({ ...certForm, courseTitle: e.target.value })}
                placeholder="e.g. Higher Study Oriented Basic to Advance Research Paper Writing Course"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Issue Date
                <Input
                  type="date"
                  value={certForm.issueDate}
                  onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                />
              </label>

              <label>
                Initial Status
                <select
                  className="select"
                  value="issued"
                  disabled
                >
                  <option value="issued">Issued & Verified</option>
                </select>
              </label>
            </div>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Certificate Image (PNG / JPG / WebP)
              </label>
              <SmoothImageUploader
                value={previewImage || certForm.certificateImage || ''}
                onChange={(url) => {
                  setPreviewImage(url);
                  setCertForm((prev) => ({ ...prev, certificateImage: url }));
                }}
                onRemove={() => {
                  setPreviewImage('');
                  setCertFile(null);
                  setCertForm((prev) => ({ ...prev, certificateImage: '' }));
                }}
                shape="banner"
                aspectRatio="16/9"
                helperText="Click + to Upload Image or Drag & Drop certificate photo here (Max 10MB)"
                maxSizeMB={10}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <Button disabled={issuingCertificate}>
                {issuingCertificate ? 'Issuing Certificate…' : 'Issue & Verify Certificate'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCertificateModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Issued Certificate Modal */}
      {editModalOpen && editingCert && (
        <Modal
          open={editModalOpen}
          title={`Edit Issued Certificate: ${editingCert.credentialId}`}
          onClose={() => {
            setEditModalOpen(false);
            setEditingCert(null);
          }}
        >
          <form className="form" onSubmit={handleUpdateCertificate} style={{ marginTop: 12 }}>
            <label>
              Credential ID
              <Input
                required
                value={editingCert.credentialId}
                onChange={(e) => setEditingCert({ ...editingCert, credentialId: e.target.value.toUpperCase() })}
                placeholder="e.g. ASP-ACAD-2026-XXXXX"
                style={{ fontFamily: 'monospace', fontWeight: 600, marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Recipient Name
                <Input
                  required
                  value={editingCert.studentName}
                  onChange={(e) => setEditingCert({ ...editingCert, studentName: e.target.value })}
                  placeholder="e.g. Ayesha Siddiqua"
                />
              </label>

              <label>
                Recipient Role / Category
                <select
                  className="select"
                  value={editingCert.recipientRole || 'Student'}
                  onChange={(e) => setEditingCert({ ...editingCert, recipientRole: e.target.value as 'Student' | 'Instructor' })}
                  style={{ marginTop: 4, width: '100%' }}
                >
                  <option value="Student">Student</option>
                  <option value="Instructor">Instructor</option>
                </select>
              </label>
            </div>

            <label>
              Recipient Email (Optional)
              <Input
                type="email"
                value={editingCert.studentEmail}
                onChange={(e) => setEditingCert({ ...editingCert, studentEmail: e.target.value })}
                placeholder="e.g. user@example.com"
              />
            </label>

            <label>
              Course Title
              <Input
                required
                value={editingCert.courseTitle}
                onChange={(e) => setEditingCert({ ...editingCert, courseTitle: e.target.value })}
                placeholder="e.g. Higher Study Oriented Basic to Advance Research Paper Writing Course"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Issue Date
                <Input
                  type="date"
                  value={editingCert.issueDate}
                  onChange={(e) => setEditingCert({ ...editingCert, issueDate: e.target.value })}
                />
              </label>

              <label>
                Status
                <select
                  className="select"
                  value={editingCert.status || 'issued'}
                  onChange={(e) => setEditingCert({ ...editingCert, status: e.target.value })}
                >
                  <option value="issued">Issued & Verified</option>
                  <option value="revoked">Revoked</option>
                </select>
              </label>
            </div>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Certificate Image (PNG / JPG / WebP)
              </label>
              <SmoothImageUploader
                value={editingCert.certificateImage || ''}
                onChange={(url) => setEditingCert((prev: any) => ({ ...prev, certificateImage: url }))}
                onRemove={() => setEditingCert((prev: any) => ({ ...prev, certificateImage: '' }))}
                shape="banner"
                aspectRatio="16/9"
                helperText="Click + to Upload Image or Drag & Drop certificate photo here (Max 10MB)"
                maxSizeMB={10}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <Button disabled={savingEditCert}>
                {savingEditCert ? 'Saving Changes…' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingCert(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
