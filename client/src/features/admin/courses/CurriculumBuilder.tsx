import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

type Lesson = { title: string; order: number; youtubeVideoId: string; duration: number; isFreePreview: boolean; resources: string[] };
type Module = { title: string; order: number; lessons: Lesson[] };
const emptyLesson = (order: number): Lesson => ({ title: '', order, youtubeVideoId: '', duration: 0, isFreePreview: false, resources: [] });
const reindex = (modules: Module[]): Module[] => modules.map((module, index) => ({
  ...module,
  order: index + 1,
  lessons: module.lessons.map((lesson, lessonIndex) => ({ ...lesson, order: lessonIndex + 1 }))
}));

export function CurriculumBuilder() {
  const [courseId, setCourseId] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ['admin-courses-curriculum'],
    queryFn: async () => (await api.get('/admin/courses')).data.data
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    const next = [...modules];
    [next[index], next[target]] = [next[target], next[index]];
    setModules(reindex(next));
  };

  const loadCourse = async (selectedId: string) => {
    if (!selectedId.trim()) return;
    setBusy(true);
    try {
      const response = await api.get(`/admin/courses/${encodeURIComponent(selectedId.trim())}`);
      setModules(reindex((response.data.data.modules || []) as Module[]));
      toast.success('Curriculum loaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not load course');
    } finally {
      setBusy(false);
    }
  };

  const load = () => {
    if (!courseId.trim()) {
      toast.error('Select a course first');
      return;
    }
    loadCourse(courseId);
  };

  const save = async () => {
    if (!courseId.trim()) {
      toast.error('Select a course first');
      return;
    }
    setBusy(true);
    try {
      await api.put(`/admin/courses/${encodeURIComponent(courseId.trim())}/curriculum`, { modules: reindex(modules) });
      toast.success('Curriculum saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not save curriculum');
    } finally {
      setBusy(false);
    }
  };

  const updateModule = (moduleIndex: number, patch: Partial<Module>) =>
    setModules((current) => current.map((module, index) => (index === moduleIndex ? { ...module, ...patch } : module)));

  const updateLesson = (moduleIndex: number, lessonIndex: number, patch: Partial<Lesson>) =>
    setModules((current) => current.map((module, index) =>
      index === moduleIndex
        ? { ...module, lessons: module.lessons.map((lesson, i) => (i === lessonIndex ? { ...lesson, ...patch } : lesson)) }
        : module
    ));

  const moveLesson = (moduleIndex: number, lessonIndex: number, direction: -1 | 1) => {
    const target = lessonIndex + direction;
    const lessons = [...modules[moduleIndex].lessons];
    if (target < 0 || target >= lessons.length) return;
    [lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]];
    updateModule(moduleIndex, { lessons: lessons.map((lesson, index) => ({ ...lesson, order: index + 1 })) });
  };

  return <>
    <h1>Curriculum builder</h1>
    <p className="muted">Select a course to inspect, edit, and reorganize curriculum modules and lessons.</p>
    <div className="curriculum-load">
      <label>
        Course
        <select
          className="select"
          value={courseId}
          onChange={(event) => {
            const id = event.target.value;
            setCourseId(id);
            if (id) loadCourse(id);
          }}
        >
          <option value="">Select a course…</option>
          {(courses || []).map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.title} ({c.slug})
            </option>
          ))}
        </select>
      </label>
      <Button disabled={busy || !courseId} onClick={load}>
        {busy ? 'Loading...' : 'Reload'}
      </Button>
    </div>
    {modules.map((module, moduleIndex) => <article className="card curriculum-module" key={`module-${moduleIndex}`}>
      <div className="curriculum-module-head">
        <label className="curriculum-title">Module {moduleIndex + 1}<Input value={module.title} onChange={(event) => updateModule(moduleIndex, { title: event.target.value })}/></label>
        <div className="curriculum-actions">
          <Button type="button" variant="secondary" disabled={moduleIndex === 0} onClick={() => move(moduleIndex, -1)} aria-label="Move module up">↑</Button>
          <Button type="button" variant="secondary" disabled={moduleIndex === modules.length - 1} onClick={() => move(moduleIndex, 1)} aria-label="Move module down">↓</Button>
          <Button type="button" variant="danger" onClick={() => setModules((current) => reindex(current.filter((_, index) => index !== moduleIndex)))}>Delete module</Button>
        </div>
      </div>
      {module.lessons.map((lesson, lessonIndex) => <div className="curriculum-lesson" key={`lesson-${lessonIndex}`}>
        <label>Lesson title<Input value={lesson.title} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { title: event.target.value })}/></label>
        <label>YouTube video ID<Input value={lesson.youtubeVideoId} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { youtubeVideoId: event.target.value })}/></label>
        <label>Duration (minutes)<Input type="number" min="0" value={lesson.duration} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { duration: Number(event.target.value) })}/></label>
        <label className="check-label"><input type="checkbox" checked={lesson.isFreePreview} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { isFreePreview: event.target.checked })}/>Free preview</label>
        <div className="curriculum-actions">
          <Button type="button" variant="secondary" disabled={lessonIndex === 0} onClick={() => moveLesson(moduleIndex, lessonIndex, -1)} aria-label="Move lesson up">↑</Button>
          <Button type="button" variant="secondary" disabled={lessonIndex === module.lessons.length - 1} onClick={() => moveLesson(moduleIndex, lessonIndex, 1)} aria-label="Move lesson down">↓</Button>
          <Button type="button" variant="danger" onClick={() => updateModule(moduleIndex, { lessons: module.lessons.filter((_, index) => index !== lessonIndex).map((item, index) => ({ ...item, order: index + 1 })) })}>Delete lesson</Button>
        </div>
      </div>)}
      <Button type="button" variant="secondary" onClick={() => updateModule(moduleIndex, { lessons: [...module.lessons, emptyLesson(module.lessons.length + 1)] })}>Add lesson</Button>
    </article>)}
    <div className="curriculum-footer">
      <Button type="button" variant="secondary" onClick={() => setModules((current) => reindex([...current, { title: `Module ${current.length + 1}`, order: current.length + 1, lessons: [] }]))}>Add module</Button>
      <Button type="button" disabled={busy || !modules.length} onClick={save}>{busy ? 'Saving...' : 'Save curriculum'}</Button>
    </div>
  </>;
}
