import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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

  // Students Query
  const { data: students = [], refetch: refetchStudents } = useQuery({
    queryKey: ['admin-academy-students'],
    queryFn: async () => (await api.get('/admin/students')).data.data as any[]
  });

  // Payments / Enrollments Queue
  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['admin-academy-payments'],
    queryFn: async () => (await api.get('/payments/queue')).data.data as any[]
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
    const newModule = {
      title: `Module ${currentModules.length + 1}: New Topic`,
      lessons: [{ title: 'Lesson 1: Introduction', videoId: '', duration: '45 mins', isFreePreview: false }]
    };
    setSelectedCurriculumCourse({
      ...selectedCurriculumCourse,
      modules: [...currentModules, newModule]
    });
  };

  // Save Class
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClass(true);
    try {
      if (editingClass._id) {
        await api.put(`/admin/classes/${editingClass._id}`, editingClass);
        toast.success('Class updated');
      } else {
        await api.post('/admin/classes', editingClass);
        toast.success('Class scheduled');
      }
      setClassModalOpen(false);
      setEditingClass(null);
      await refetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save class');
    } finally {
      setSavingClass(false);
    }
  };

  // Export Roster to CSV
  const exportStudentsCsv = () => {
    const rows = [
      ['Student Name', 'Email', 'Role', 'Registered Date'],
      ...students.map((s) => [s.name, s.email, s.role, new Date(s.createdAt).toLocaleDateString()])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aspier_students_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Students roster exported to CSV.');
  };

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>ASPIER Academy & Class Management System (/academy)</h1>
          <p className="muted">Complete control over courses, syllabi, class schedules, instructors, student rosters, and enrollment approvals.</p>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Total Academy Courses: <strong>{courses.length}</strong></p>
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
            >
              + Create Academy Course
            </Button>
          </div>

          <Table headers={['Banner', 'Course Title', 'Start Date', 'Mode', 'Fee (BDT)', 'Status', 'Actions']}>
            {courses.map((course) => (
              <tr key={course._id}>
                <td style={{ width: 80 }}>
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <span className="muted" style={{ fontSize: '0.8rem' }}>Default</span>
                  )}
                </td>
                <td>
                  <strong>{course.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{course.slug}</div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{course.startDate || 'TBA'}</td>
                <td><Badge variant="blue">{course.mode || 'Online'}</Badge></td>
                <td><strong>৳{course.price || 0} BDT</strong></td>
                <td>
                  <Badge variant={course.status === 'published' ? 'green' : 'amber'}>
                    {course.status || 'draft'}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingCourse({ ...course });
                        setCourseModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteCourse(course._id, course.title)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {/* Tab 2: Curriculum & Syllabus */}
      {activeTab === 'Curriculum & Modules' && (
        <div style={{ marginTop: 20 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Select Course to Edit Curriculum</label>
            <select
              className="select"
              value={selectedCurriculumCourse?._id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c._id === e.target.value);
                setSelectedCurriculumCourse(found ? JSON.parse(JSON.stringify(found)) : null);
              }}
            >
              <option value="">-- Choose a course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          {selectedCurriculumCourse && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Syllabus: {selectedCurriculumCourse.title}</h3>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>Modules: {(selectedCurriculumCourse.modules || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button type="button" variant="secondary" onClick={addModule}>+ Add Module</Button>
                  <Button disabled={savingCurriculum} onClick={handleSaveCurriculum}>
                    {savingCurriculum ? 'Saving…' : 'Save Curriculum'}
                  </Button>
                </div>
              </div>

              {(selectedCurriculumCourse.modules || []).map((mod: any, mIdx: number) => (
                <div key={mIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <strong>Module {mIdx + 1}</strong>
                    <Input
                      value={mod.title || ''}
                      onChange={(e) => {
                        const copy = [...selectedCurriculumCourse.modules];
                        copy[mIdx].title = e.target.value;
                        setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                      }}
                      placeholder="Module title"
                    />
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        const copy = selectedCurriculumCourse.modules.filter((_: any, idx: number) => idx !== mIdx);
                        setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                      }}
                    >
                      Remove
                    </Button>
                  </div>

                  <div style={{ paddingLeft: 16, borderLeft: '3px solid #148f83' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Lessons</span>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                        onClick={() => {
                          const copy = [...selectedCurriculumCourse.modules];
                          copy[mIdx].lessons = [
                            ...(copy[mIdx].lessons || []),
                            { title: `Lesson ${(copy[mIdx].lessons || []).length + 1}`, duration: '30 mins', videoId: '', isFreePreview: false }
                          ];
                          setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                        }}
                      >
                        + Add Lesson
                      </button>
                    </div>

                    {(mod.lessons || []).map((les: any, lIdx: number) => (
                      <div key={lIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
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
                          placeholder="Duration (e.g. 45m)"
                          value={les.duration || ''}
                          onChange={(e) => {
                            const copy = [...selectedCurriculumCourse.modules];
                            copy[mIdx].lessons[lIdx].duration = e.target.value;
                            setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                          }}
                        />
                        <Input
                          placeholder="Video URL / ID"
                          value={les.videoId || ''}
                          onChange={(e) => {
                            const copy = [...selectedCurriculumCourse.modules];
                            copy[mIdx].lessons[lIdx].videoId = e.target.value;
                            setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                          }}
                        />
                        <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(les.isFreePreview)}
                            onChange={(e) => {
                              const copy = [...selectedCurriculumCourse.modules];
                              copy[mIdx].lessons[lIdx].isFreePreview = e.target.checked;
                              setSelectedCurriculumCourse({ ...selectedCurriculumCourse, modules: copy });
                            }}
                          />
                          Free
                        </label>
                        <button
                          type="button"
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Scheduled Classes: <strong>{classes.length}</strong></p>
            <Button
              onClick={() => {
                setEditingClass({
                  topic: '',
                  courseId: courses[0]?._id || '',
                  scheduledAt: new Date().toISOString(),
                  meetingUrl: '',
                  recordingUrl: ''
                });
                setClassModalOpen(true);
              }}
            >
              + Schedule Live Class
            </Button>
          </div>

          <Table headers={['Topic / Title', 'Course', 'Scheduled Date/Time', 'Meeting Link', 'Recording']}>
            {classes.map((cls) => (
              <tr key={cls._id}>
                <td><strong>{cls.topic}</strong></td>
                <td>{typeof cls.courseId === 'object' ? cls.courseId?.title : 'ASPIER Course'}</td>
                <td style={{ fontSize: '0.85rem' }}>{cls.scheduledAt ? new Date(cls.scheduledAt).toLocaleString() : 'TBA'}</td>
                <td>
                  {cls.meetingUrl ? (
                    <a href={cls.meetingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#148f83', fontWeight: 500 }}>
                      Join Session
                    </a>
                  ) : (
                    <span className="muted">None</span>
                  )}
                </td>
                <td>
                  {cls.recordingUrl ? (
                    <a href={cls.recordingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                      View Recording
                    </a>
                  ) : (
                    <span className="muted">Not uploaded</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {/* Tab 4: Instructors */}
      {activeTab === 'Instructors' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Academy Instructors: <strong>{instructors.length}</strong></p>
            <Button
              onClick={() => {
                setEditingInstructor({
                  name: '',
                  bio: '',
                  designation: 'Academy Instructor',
                  affiliation: 'ASPIER Academy',
                  avatar: ''
                });
                setInstructorModalOpen(true);
              }}
            >
              + Add Instructor
            </Button>
          </div>

          <Table headers={['Avatar', 'Name', 'Designation', 'Affiliation', 'Bio']}>
            {instructors.map((ins) => (
              <tr key={ins._id}>
                <td style={{ width: 60 }}>
                  {ins.avatar ? (
                    <img src={ins.avatar} alt={ins.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ins.name?.charAt(0) || 'I'}
                    </div>
                  )}
                </td>
                <td><strong>{ins.name}</strong></td>
                <td>{ins.designation || 'Instructor'}</td>
                <td>{ins.affiliation || 'ASPIER Academy'}</td>
                <td style={{ fontSize: '0.85rem', maxWidth: 260 }}>{ins.bio || '—'}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {/* Tab 5: Students & Enrollments */}
      {activeTab === 'Students & Enrollments' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p className="muted" style={{ margin: 0 }}>Registered Students: <strong>{students.length}</strong> | Pending Payment Verifications: <strong>{payments.length}</strong></p>
            </div>
            <Button variant="secondary" onClick={exportStudentsCsv}>
              Export Students Roster (CSV)
            </Button>
          </div>

          <Table headers={['Student Name', 'Email', 'Role', 'Status', 'Registered Date']}>
            {students.map((st) => (
              <tr key={st._id}>
                <td><strong>{st.name}</strong></td>
                <td><a href={`mailto:${st.email}`}>{st.email}</a></td>
                <td><Badge variant="blue">{st.role}</Badge></td>
                <td><Badge variant={st.isActive !== false ? 'green' : 'amber'}>{st.isActive !== false ? 'Active' : 'Suspended'}</Badge></td>
                <td style={{ fontSize: '0.85rem' }}>{new Date(st.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </Table>
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
                value={editingCourse.thumbnail || ''}
                onUploaded={(url) => setEditingCourse({ ...editingCourse, thumbnail: url })}
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
        <Modal open={classModalOpen} title="Schedule Live Class Session" onClose={() => setClassModalOpen(false)}>
          <form className="form" onSubmit={handleSaveClass} style={{ marginTop: 12 }}>
            <label>
              Class Topic / Title
              <Input
                required
                value={editingClass.topic || ''}
                onChange={(e) => setEditingClass({ ...editingClass, topic: e.target.value })}
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

            <label>
              Scheduled Date & Time
              <Input
                type="datetime-local"
                value={editingClass.scheduledAt ? new Date(editingClass.scheduledAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditingClass({ ...editingClass, scheduledAt: e.target.value })}
              />
            </label>

            <label>
              Meeting Link (Google Meet / Zoom URL)
              <Input
                type="url"
                value={editingClass.meetingUrl || ''}
                onChange={(e) => setEditingClass({ ...editingClass, meetingUrl: e.target.value })}
              />
            </label>

            <label>
              Recording URL (after session completion)
              <Input
                type="url"
                value={editingClass.recordingUrl || ''}
                onChange={(e) => setEditingClass({ ...editingClass, recordingUrl: e.target.value })}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingClass}>{savingClass ? 'Saving…' : 'Schedule Class'}</Button>
              <Button type="button" variant="secondary" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
