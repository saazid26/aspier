import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Sparkles, Download, Plus, CheckCircle, Trash2, Edit2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { Tabs } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';

export function AcademyCms() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Courses & Classes');
  const [seeding, setSeeding] = useState(false);

  // Courses Query
  const { data: courses = [], refetch: refetchCourses } = useQuery({
    queryKey: ['admin-academy-courses'],
    queryFn: async () => (await api.get('/admin/courses')).data.data as any[]
  });

  // Instructors Query
  const { data: instructors = [], refetch: refetchInstructors } = useQuery({
    queryKey: ['admin-academy-instructors'],
    queryFn: async () => (await api.get('/admin/instructors')).data.data as any[]
  });

  // Live Classes Query
  const { data: classes = [], refetch: refetchClasses } = useQuery({
    queryKey: ['admin-academy-classes'],
    queryFn: async () => (await api.get('/admin/classes')).data.data as any[]
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

  // Course Modal State
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);

  // Curriculum Builder State
  const [selectedCurriculumCourse, setSelectedCurriculumCourse] = useState<any | null>(null);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  // Live Class Modal State
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [savingClass, setSavingClass] = useState(false);

  // Instructor Modal State
  const [editingInstructor, setEditingInstructor] = useState<any | null>(null);
  const [instructorModalOpen, setInstructorModalOpen] = useState(false);
  const [savingInstructor, setSavingInstructor] = useState(false);

  // Enrollment Modal State
  const [editingEnrollment, setEditingEnrollment] = useState<any | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  // Seed Sample Dummy Data Across All 5 Tabs
  const handleSeedSampleData = async () => {
    if (!window.confirm('Populate/refresh sample dummy Academy data across all 5 tabs (Courses, Curriculum, Live Schedules, Instructors, and Enrollments)?')) {
      return;
    }
    setSeeding(true);
    try {
      const res = await api.post('/admin/academy/seed-sample');
      toast.success(res.data?.message || 'Sample Academy dummy data loaded successfully across all 5 tabs.');
      await Promise.all([
        refetchCourses(),
        refetchInstructors(),
        refetchClasses(),
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

  // Save Curriculum
  const handleSaveCurriculum = async () => {
    if (!selectedCurriculumCourse) return;
    setSavingCurriculum(true);
    try {
      await api.put(`/admin/courses/${selectedCurriculumCourse._id}/curriculum`, {
        modules: selectedCurriculumCourse.modules || []
      });
      toast.success('Course curriculum and syllabus updated.');
      await refetchCourses();
      await queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save curriculum');
    } finally {
      setSavingCurriculum(false);
    }
  };

  // Add Curriculum Module
  const addModule = () => {
    if (!selectedCurriculumCourse) return;
    const currentModules = selectedCurriculumCourse.modules || [];
    const newNum = currentModules.length + 1;
    const newModule = {
      moduleNumber: newNum,
      title: `Module ${newNum}: Research Methods & Applications`,
      description: 'Module objectives and academic topics covered in this segment.',
      week: `Weeks ${newNum * 2 - 1}–${newNum * 2}`,
      lessons: [{ title: `Session 1: Introduction to Module ${newNum}`, videoId: '', duration: '60 mins', isFreePreview: false }]
    };
    setSelectedCurriculumCourse({
      ...selectedCurriculumCourse,
      modules: [...currentModules, newModule]
    });
  };

  const prepopulateStandardModules = () => {
    if (!selectedCurriculumCourse) return;
    const standard = [
      {
        moduleNumber: 1,
        title: "Module 1: Foundations & Research Framing",
        description: "Formulating high-impact research questions, hypothesis framing, and academic standards.",
        week: "Weeks 1–2",
        lessons: [
          { title: "Session 1: Identifying Research Gaps & Problem Formulation", duration: "60 mins", videoId: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", isFreePreview: true },
          { title: "Session 2: Formulating Hypotheses and Research Objectives", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 3: Ethical Considerations in Scientific Inquiry", duration: "45 mins", videoId: "", isFreePreview: false }
        ]
      },
      {
        moduleNumber: 2,
        title: "Module 2: Literature Review & Methodology",
        description: "Systematic literature search, synthesis matrices, and robust experimental/analytical design.",
        week: "Weeks 3–4",
        lessons: [
          { title: "Session 4: Advanced Scopus & Web of Science Literature Search", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 5: Building a Critical Literature Synthesis Matrix", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 6: Quantitative & Qualitative Methodology Design", duration: "60 mins", videoId: "", isFreePreview: false }
        ]
      },
      {
        moduleNumber: 3,
        title: "Module 3: Data Analysis & Tools",
        description: "Statistical modeling, reproducible analysis workflows, and effective visualization.",
        week: "Weeks 5–6",
        lessons: [
          { title: "Session 7: Data Preparation, Cleaning & Exploratory Analysis", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 8: Statistical Hypothesis Testing & Interpretation", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 9: Creating Publication-Quality Plots and Tables", duration: "60 mins", videoId: "", isFreePreview: false }
        ]
      },
      {
        moduleNumber: 4,
        title: "Module 4: Academic Writing & Publication",
        description: "Manuscript drafting (IMRaD), target journal selection, peer review response, and publication ethics.",
        week: "Weeks 7–8",
        lessons: [
          { title: "Session 10: Drafting Title, Abstract, and High-Impact Introduction", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 11: Results, Discussion, and Conclusion Mastery", duration: "60 mins", videoId: "", isFreePreview: false },
          { title: "Session 12: Journal Selection, Cover Letters, and Peer Review Rebuttal", duration: "60 mins", videoId: "", isFreePreview: false }
        ]
      }
    ];
    setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: standard });
    toast.success('Loaded 4 standard course modules. Click Save to persist.');
  };

  // Save Class Session
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClass(true);
    try {
      const payload = {
        ...editingClass,
        scheduledAt: editingClass.scheduledAt ? new Date(editingClass.scheduledAt).toISOString() : new Date().toISOString()
      };
      if (editingClass._id) {
        await api.put(`/admin/classes/${editingClass._id}`, payload);
        toast.success('Class session updated successfully.');
      } else {
        await api.post('/admin/classes', payload);
        toast.success('Live class session scheduled successfully.');
      }
      setClassModalOpen(false);
      setEditingClass(null);
      await refetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save class session');
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (id: string, topic: string) => {
    if (!window.confirm(`Delete class session "${topic}"?`)) return;
    try {
      await api.delete(`/admin/classes/${id}`);
      toast.success('Class session deleted.');
      await refetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete class');
    }
  };

  // Save Instructor
  const handleSaveInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInstructor(true);
    try {
      const payload = {
        ...editingInstructor,
        slug: editingInstructor.slug || editingInstructor.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        expertise: typeof editingInstructor.expertise === 'string'
          ? editingInstructor.expertise.split(',').map((s: string) => s.trim()).filter(Boolean)
          : editingInstructor.expertise || []
      };

      if (editingInstructor._id) {
        await api.put(`/admin/instructors/${editingInstructor._id}`, payload);
        toast.success('Instructor updated successfully.');
      } else {
        await api.post('/admin/instructors', payload);
        toast.success('Instructor added successfully.');
      }
      setInstructorModalOpen(false);
      setEditingInstructor(null);
      await refetchInstructors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save instructor');
    } finally {
      setSavingInstructor(false);
    }
  };

  const handleDeleteInstructor = async (id: string, name: string) => {
    if (!window.confirm(`Delete instructor "${name}"?`)) return;
    try {
      await api.delete(`/admin/instructors/${id}`);
      toast.success('Instructor deleted.');
      await refetchInstructors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete instructor');
    }
  };

  // Save Enrollment
  const handleSaveEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEnrollment(true);
    try {
      await api.patch(`/admin/enrollments/${editingEnrollment._id}`, {
        status: editingEnrollment.status,
        progressPercent: Number(editingEnrollment.progressPercent || 0)
      });
      toast.success('Enrollment status updated.');
      setEnrollmentModalOpen(false);
      setEditingEnrollment(null);
      await refetchEnrollments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update enrollment');
    } finally {
      setSavingEnrollment(false);
    }
  };

  const handleQuickApproveEnrollment = async (id: string) => {
    try {
      await api.patch(`/admin/enrollments/${id}`, { status: 'Approved' });
      toast.success('Enrollment approved & activated.');
      await refetchEnrollments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not approve enrollment');
    }
  };

  const handleDeleteEnrollment = async (id: string, studentName: string) => {
    if (!window.confirm(`Delete enrollment for "${studentName}"?`)) return;
    try {
      await api.delete(`/admin/enrollments/${id}`);
      toast.success('Enrollment deleted.');
      await refetchEnrollments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete enrollment');
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
        tabs={['Courses & Classes', 'Curriculum & Modules', 'Live Class Schedule', 'Instructors', 'Students & Enrollments']}
        active={activeTab}
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

      {/* Tab 2: Curriculum & Course Modules */}
      {activeTab === 'Curriculum & Modules' && (
        <div style={{ marginTop: 20 }}>
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: '#0f172a' }}>
              Select Course to Edit Course Curriculum & Modules
            </label>
            <select
              className="select"
              value={selectedCurriculumCourse?._id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c._id === e.target.value);
                setSelectedCurriculumCourse(found ? JSON.parse(JSON.stringify(found)) : null);
              }}
              style={{ width: '100%', maxWidth: 540 }}
            >
              <option value="">-- Choose a course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          {selectedCurriculumCourse && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                    Curriculum Modules: {selectedCurriculumCourse.title}
                  </h3>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    Total Modules: {(selectedCurriculumCourse.modules || []).length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button type="button" variant="secondary" onClick={prepopulateStandardModules} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} />
                    Pre-populate Standard 4 Modules
                  </Button>
                  <Button type="button" variant="secondary" onClick={addModule} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} />
                    Add Module
                  </Button>
                  <Button disabled={savingCurriculum} onClick={handleSaveCurriculum}>
                    {savingCurriculum ? 'Saving…' : 'Save Course Modules'}
                  </Button>
                </div>
              </div>

              {(selectedCurriculumCourse.modules || []).map((mod: any, mIdx: number) => (
                <div key={mIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#0f766e', minWidth: 90 }}>Module {mIdx + 1}</strong>
                    <div style={{ flex: '2 1 240px' }}>
                      <Input
                        value={mod.title || ''}
                        onChange={(e) => {
                          const copy = [...selectedCurriculumCourse.modules];
                          copy[mIdx].title = e.target.value;
                          setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                        }}
                        placeholder="Module title (e.g. Module 1: Foundations & Research Framing)"
                      />
                    </div>
                    <div style={{ flex: '1 1 140px' }}>
                      <Input
                        value={mod.week || ''}
                        onChange={(e) => {
                          const copy = [...selectedCurriculumCourse.modules];
                          copy[mIdx].week = e.target.value;
                          setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                        }}
                        placeholder="Timeline (e.g. Weeks 1–2)"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={mIdx === 0}
                        onClick={() => {
                          const copy = [...selectedCurriculumCourse.modules];
                          const [item] = copy.splice(mIdx, 1);
                          copy.splice(mIdx - 1, 0, item);
                          setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                        }}
                        style={{ padding: '6px 10px' }}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={mIdx === selectedCurriculumCourse.modules.length - 1}
                        onClick={() => {
                          const copy = [...selectedCurriculumCourse.modules];
                          const [item] = copy.splice(mIdx, 1);
                          copy.splice(mIdx + 1, 0, item);
                          setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                        }}
                        style={{ padding: '6px 10px' }}
                      >
                        ↓
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        const copy = selectedCurriculumCourse.modules.filter((_: any, idx: number) => idx !== mIdx);
                        setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                      }}
                      style={{ padding: '6px 12px' }}
                    >
                      Remove
                    </Button>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Input
                      value={mod.description || ''}
                      onChange={(e) => {
                        const copy = [...selectedCurriculumCourse.modules];
                        copy[mIdx].description = e.target.value;
                        setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                      }}
                      placeholder="Module brief description / learning objectives"
                    />
                  </div>

                  <div style={{ paddingLeft: 16, borderLeft: '3px solid #0d9488' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Lessons & Sessions</span>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => {
                          const copy = [...selectedCurriculumCourse.modules];
                          copy[mIdx].lessons = [
                            ...(copy[mIdx].lessons || []),
                            { title: `Session ${(copy[mIdx].lessons || []).length + 1}: Topic Coverage`, duration: '60 mins', videoId: '', isFreePreview: false }
                          ];
                          setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                        }}
                      >
                        <Plus size={13} />
                        Add Lesson
                      </button>
                    </div>

                    {(mod.lessons || []).map((les: any, lIdx: number) => (
                      <div key={lIdx} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(100px, 1fr) minmax(180px, 1.5fr) auto auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <Input
                          placeholder="Lesson Title"
                          value={les.title || ''}
                          onChange={(e) => {
                            const copy = [...selectedCurriculumCourse.modules];
                            copy[mIdx].lessons[lIdx].title = e.target.value;
                            setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                          }}
                        />
                        <Input
                          placeholder="Duration (e.g. 60 mins)"
                          value={les.duration || ''}
                          onChange={(e) => {
                            const copy = [...selectedCurriculumCourse.modules];
                            copy[mIdx].lessons[lIdx].duration = e.target.value;
                            setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                          }}
                        />
                        <Input
                          placeholder="Video URL / YouTube Link"
                          value={les.videoId || les.youtubeVideoId || ''}
                          onChange={(e) => {
                            const copy = [...selectedCurriculumCourse.modules];
                            copy[mIdx].lessons[lIdx].videoId = e.target.value;
                            setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                          }}
                        />
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(les.isFreePreview)}
                            onChange={(e) => {
                              const copy = [...selectedCurriculumCourse.modules];
                              copy[mIdx].lessons[lIdx].isFreePreview = e.target.checked;
                              setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                            }}
                          />
                          Free Preview
                        </label>
                        <button
                          type="button"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                          title="Remove Lesson"
                          onClick={() => {
                            const copy = [...selectedCurriculumCourse.modules];
                            copy[mIdx].lessons = copy[mIdx].lessons.filter((_: any, idx: number) => idx !== lIdx);
                            setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Live Class Schedule */}
      {activeTab === 'Live Class Schedule' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <p className="muted" style={{ margin: 0 }}>Scheduled Classes: <strong>{classes.length}</strong></p>
            <Button
              onClick={() => {
                setEditingClass({
                  topic: '',
                  courseId: courses[0]?._id || '',
                  scheduledAt: new Date().toISOString(),
                  meetingUrl: '',
                  recordingUrl: '',
                  mode: 'Online and Live',
                  status: 'scheduled',
                  durationMinutes: 60
                });
                setClassModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              Schedule Live Class
            </Button>
          </div>

          <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
            <Table headers={['Topic / Title', 'Course', 'Scheduled Date/Time', 'Mode', 'Meeting Link', 'Recording', 'Status', 'Actions']}>
              {classes.map((cls) => (
                <tr key={cls._id}>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{cls.topic || cls.title || 'Live Class Session'}</strong>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {typeof cls.courseId === 'object' ? cls.courseId?.title : 'ASPIER Course'}
                  </td>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {cls.scheduledAt ? new Date(cls.scheduledAt).toLocaleString() : 'TBA'}
                  </td>
                  <td>
                    <Badge variant="blue">{cls.mode || 'Online and Live'}</Badge>
                  </td>
                  <td>
                    {cls.meetingUrl || cls.meetLink ? (
                      <a
                        href={cls.meetingUrl || cls.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0d9488', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        Join Session
                      </a>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                  <td>
                    {cls.recordingUrl || cls.recordingYoutubeId ? (
                      <a
                        href={cls.recordingUrl || cls.recordingYoutubeId}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        View Recording
                      </a>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Not uploaded</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={cls.status === 'live' ? 'green' : cls.status === 'completed' ? 'gray' : 'blue'}>
                      {cls.status || 'scheduled'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => {
                          setEditingClass({
                            _id: cls._id,
                            topic: cls.topic || cls.title || '',
                            courseId: typeof cls.courseId === 'object' ? cls.courseId?._id : cls.courseId,
                            scheduledAt: cls.scheduledAt,
                            meetingUrl: cls.meetingUrl || cls.meetLink || '',
                            recordingUrl: cls.recordingUrl || cls.recordingYoutubeId || '',
                            mode: cls.mode || 'Online and Live',
                            status: cls.status || 'scheduled',
                            durationMinutes: cls.durationMinutes || 60
                          });
                          setClassModalOpen(true);
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDeleteClass(cls._id, cls.topic || cls.title || 'Class Session')}
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

      {/* Tab 4: Instructors */}
      {activeTab === 'Instructors' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <p className="muted" style={{ margin: 0 }}>Academy Instructors: <strong>{instructors.length}</strong></p>
            <Button
              onClick={() => {
                setEditingInstructor({
                  name: '',
                  slug: '',
                  bio: '',
                  designation: 'Academy Instructor & Senior Researcher',
                  affiliation: 'ASPIER Academy',
                  avatar: '',
                  expertise: ''
                });
                setInstructorModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              Add Instructor
            </Button>
          </div>

          <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
            <Table headers={['Avatar', 'Name', 'Designation', 'Affiliation', 'Bio / Expertise', 'Actions']}>
              {instructors.map((ins) => (
                <tr key={ins._id}>
                  <td style={{ width: 64 }}>
                    {ins.avatar || ins.photo || ins.avatarUrl ? (
                      <img
                        src={ins.avatar || ins.photo || ins.avatarUrl}
                        alt={ins.name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0d9488', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ins.name?.charAt(0) || 'I'}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{ins.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ins.slug}</div>
                  </td>
                  <td>{ins.designation || ins.title || 'Instructor'}</td>
                  <td>{ins.affiliation || 'ASPIER Academy'}</td>
                  <td style={{ fontSize: '0.85rem', maxWidth: 280 }}>
                    <div style={{ lineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ins.bio || '—'}
                    </div>
                    {ins.expertise && ins.expertise.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(Array.isArray(ins.expertise) ? ins.expertise : [ins.expertise]).map((exp: string, idx: number) => (
                          <span key={idx} style={{ fontSize: '0.725rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569' }}>
                            {exp}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => {
                          setEditingInstructor({
                            ...ins,
                            expertise: Array.isArray(ins.expertise) ? ins.expertise.join(', ') : ins.expertise || ''
                          });
                          setInstructorModalOpen(true);
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDeleteInstructor(ins._id, ins.name)}
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

      {/* Tab 5: Students & Enrollments */}
      {activeTab === 'Students & Enrollments' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Active Enrollments: <strong>{enrollments.length}</strong> | Total Registered Student Users: <strong>{students.length}</strong>
              </p>
            </div>
            <Button variant="secondary" onClick={exportStudentsCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Download size={15} />
              Export Students Roster (CSV)
            </Button>
          </div>

          <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0, width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
            <Table headers={['Student Name', 'Email', 'Course Enrolled', 'Payment Info', 'Progress', 'Status', 'Actions']}>
              {enrollments.length > 0 ? (
                enrollments.map((enr: any) => (
                  <tr key={enr._id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{enr.studentName || 'Student'}</strong>
                      {enr.university && (
                        <div style={{ fontSize: '0.775rem', color: '#64748b' }}>{enr.university}</div>
                      )}
                    </td>
                    <td>
                      <a href={`mailto:${enr.studentEmail}`} style={{ color: '#0d9488', fontSize: '0.85rem' }}>
                        {enr.studentEmail}
                      </a>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.875rem' }}>{enr.courseTitle}</strong>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.825rem' }}>
                        <span style={{ fontWeight: 600, color: '#0f766e' }}>{enr.paymentMethod}</span> • ৳{enr.feePaid} BDT
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        TrxID: {enr.trxId}
                      </div>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, enr.progressPercent || 0))}%`,
                              height: '100%',
                              background: (enr.progressPercent || 0) === 100 ? '#10b981' : '#0d9488',
                              borderRadius: 4
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                          {enr.progressPercent || 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={enr.status === 'Approved' ? 'green' : enr.status === 'Pending' ? 'amber' : 'gray'}>
                        {enr.status}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {enr.status === 'Pending' && (
                          <Button
                            variant="secondary"
                            style={{ padding: '5px 10px', fontSize: '0.775rem', color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleQuickApproveEnrollment(enr._id)}
                          >
                            <CheckCircle size={13} />
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          style={{ padding: '5px 10px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => {
                            setEditingEnrollment({
                              _id: enr._id,
                              studentName: enr.studentName,
                              courseTitle: enr.courseTitle,
                              status: enr.status,
                              progressPercent: enr.progressPercent || 0
                            });
                            setEnrollmentModalOpen(true);
                          }}
                        >
                          <Edit2 size={13} />
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          style={{ padding: '5px 10px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleDeleteEnrollment(enr._id, enr.studentName || 'Student')}
                        >
                          <Trash2 size={13} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                students.map((st: any) => (
                  <tr key={st._id}>
                    <td><strong>{st.name}</strong></td>
                    <td><a href={`mailto:${st.email}`}>{st.email}</a></td>
                    <td><span className="muted">Direct User Account</span></td>
                    <td><span className="muted">—</span></td>
                    <td>0%</td>
                    <td><Badge variant={st.isActive !== false ? 'green' : 'amber'}>{st.isActive !== false ? 'Active' : 'Suspended'}</Badge></td>
                    <td><span className="muted">—</span></td>
                  </tr>
                ))
              )}
            </Table>
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
                  value={editingCourse.mode || 'Online and Live'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, mode: e.target.value })}
                >
                  <option value="Online and Live">Online and Live</option>
                  <option value="Online and Recorded">Online and Recorded</option>
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
                helperText="Recommended: 1200 × 675 px • 16:9 Aspect Ratio • Max 3MB"
                maxSizeMB={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingCourse}>{savingCourse ? 'Saving…' : 'Save Course'}</Button>
              <Button type="button" variant="secondary" onClick={() => setCourseModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Class Schedule Modal */}
      {classModalOpen && editingClass && (
        <Modal open={classModalOpen} title={editingClass._id ? 'Edit Class Session' : 'Schedule Live Class Session'} onClose={() => setClassModalOpen(false)}>
          <form className="form" onSubmit={handleSaveClass} style={{ marginTop: 12 }}>
            <label>
              Class Topic / Title
              <Input
                required
                value={editingClass.topic || ''}
                onChange={(e) => setEditingClass({ ...editingClass, topic: e.target.value })}
                placeholder="e.g. Session 1: Scopus Literature Search & Research Question Formulation"
              />
            </label>

            <label>
              Course
              <select
                className="select"
                value={editingClass.courseId || ''}
                onChange={(e) => setEditingClass({ ...editingClass, courseId: e.target.value })}
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Scheduled Date & Time
                <Input
                  type="datetime-local"
                  value={editingClass.scheduledAt ? new Date(editingClass.scheduledAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingClass({ ...editingClass, scheduledAt: e.target.value })}
                />
              </label>

              <label>
                Class Status
                <select
                  className="select"
                  value={editingClass.status || 'scheduled'}
                  onChange={(e) => setEditingClass({ ...editingClass, status: e.target.value })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live Now</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Class Mode
                <select
                  className="select"
                  value={editingClass.mode || 'Online and Live'}
                  onChange={(e) => setEditingClass({ ...editingClass, mode: e.target.value })}
                >
                  <option value="Online and Live">Online and Live</option>
                  <option value="Online and Recorded">Online and Recorded</option>
                  <option value="Offline">Offline</option>
                </select>
              </label>

              <label>
                Duration (Minutes)
                <Input
                  type="number"
                  value={Number(editingClass.durationMinutes || 60)}
                  onChange={(e) => setEditingClass({ ...editingClass, durationMinutes: Number(e.target.value) })}
                />
              </label>
            </div>

            <label>
              Meeting Link (Google Meet / Zoom URL)
              <Input
                type="url"
                value={editingClass.meetingUrl || ''}
                onChange={(e) => setEditingClass({ ...editingClass, meetingUrl: e.target.value })}
                placeholder="https://meet.google.com/xyz-abc-def"
              />
            </label>

            <label>
              Recording URL (YouTube / Drive Link)
              <Input
                type="url"
                value={editingClass.recordingUrl || ''}
                onChange={(e) => setEditingClass({ ...editingClass, recordingUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingClass}>{savingClass ? 'Saving…' : 'Save Class Session'}</Button>
              <Button type="button" variant="secondary" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Instructor Modal */}
      {instructorModalOpen && editingInstructor && (
        <Modal open={instructorModalOpen} title={editingInstructor._id ? `Edit: ${editingInstructor.name}` : 'Add Academy Instructor'} onClose={() => setInstructorModalOpen(false)}>
          <form className="form" onSubmit={handleSaveInstructor} style={{ marginTop: 12 }}>
            <label>
              Instructor Full Name
              <Input
                required
                value={editingInstructor.name || ''}
                onChange={(e) => setEditingInstructor({ ...editingInstructor, name: e.target.value })}
                placeholder="e.g. Dr. Farzana Rahman"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                URL Slug
                <Input
                  value={editingInstructor.slug || ''}
                  onChange={(e) => setEditingInstructor({ ...editingInstructor, slug: e.target.value })}
                  placeholder="e.g. dr-farzana-rahman"
                />
              </label>

              <label>
                Designation
                <Input
                  value={editingInstructor.designation || ''}
                  onChange={(e) => setEditingInstructor({ ...editingInstructor, designation: e.target.value })}
                  placeholder="e.g. Lead Instructor & Senior Research Scientist"
                />
              </label>
            </div>

            <label>
              Affiliation / University
              <Input
                value={editingInstructor.affiliation || ''}
                onChange={(e) => setEditingInstructor({ ...editingInstructor, affiliation: e.target.value })}
                placeholder="e.g. ASPIER Academy / Department of CSE"
              />
            </label>

            <label>
              Key Expertise (comma-separated)
              <Input
                value={editingInstructor.expertise || ''}
                onChange={(e) => setEditingInstructor({ ...editingInstructor, expertise: e.target.value })}
                placeholder="e.g. Academic Research, Manuscript Writing, Systematic Literature Reviews"
              />
            </label>

            <label>
              Biography & Academic Background
              <textarea
                className="input"
                rows={4}
                value={editingInstructor.bio || ''}
                onChange={(e) => setEditingInstructor({ ...editingInstructor, bio: e.target.value })}
                placeholder="Instructor background, research interests, and publications..."
                style={{ resize: 'vertical' }}
              />
            </label>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Instructor Photo / Avatar</label>
              <ImageUploader
                value={editingInstructor.avatar || editingInstructor.photo || ''}
                onUploaded={(url) => setEditingInstructor({ ...editingInstructor, avatar: url, photo: url })}
                shape="circle"
                variant="circle"
                helperText="Square 1:1 image • Max 3MB"
                maxSizeMB={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingInstructor}>{savingInstructor ? 'Saving…' : 'Save Instructor'}</Button>
              <Button type="button" variant="secondary" onClick={() => setInstructorModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enrollment Status Edit Modal */}
      {enrollmentModalOpen && editingEnrollment && (
        <Modal open={enrollmentModalOpen} title="Edit Student Enrollment" onClose={() => setEnrollmentModalOpen(false)}>
          <form className="form" onSubmit={handleSaveEnrollment} style={{ marginTop: 12 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{editingEnrollment.studentName}</div>
              <div style={{ fontSize: '0.825rem', color: '#64748b' }}>Course: {editingEnrollment.courseTitle}</div>
            </div>

            <label>
              Enrollment Status
              <select
                className="select"
                value={editingEnrollment.status || 'Approved'}
                onChange={(e) => setEditingEnrollment({ ...editingEnrollment, status: e.target.value })}
              >
                <option value="Approved">Approved (Active Access)</option>
                <option value="Pending">Pending Verification</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
            </label>

            <label>
              Course Progress (% completed)
              <Input
                type="number"
                min={0}
                max={100}
                value={Number(editingEnrollment.progressPercent || 0)}
                onChange={(e) => setEditingEnrollment({ ...editingEnrollment, progressPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingEnrollment}>{savingEnrollment ? 'Saving…' : 'Save Enrollment'}</Button>
              <Button type="button" variant="secondary" onClick={() => setEnrollmentModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
