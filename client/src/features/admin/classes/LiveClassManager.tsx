import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';

type ClassForm = { courseId: string; title: string; description: string; scheduledAt: string; durationMinutes: string; meetLink: string };
const emptyForm: ClassForm = { courseId: '', title: '', description: '', scheduledAt: '', durationMinutes: '60', meetLink: '' };

export function LiveClassManager() {
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => (await api.get('/admin/classes')).data.data
  });

  const { data: courses } = useQuery({
    queryKey: ['admin-courses-classes'],
    queryFn: async () => (await api.get('/admin/courses')).data.data
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId) {
      toast.error('Please select a course');
      return;
    }
    try {
      const body = {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        scheduledAt: new Date(form.scheduledAt).toISOString()
      };
      if (editingId) await api.put(`/admin/classes/${editingId}`, body);
      else await api.post('/admin/classes', body);
      toast.success(editingId ? 'Class updated' : 'Class scheduled');
      setEditingId(null);
      setForm(emptyForm);
      await refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not save class');
    }
  };

  const edit = (item: any) => {
    setEditingId(item._id);
    setForm({
      courseId: String(item.courseId?._id || item.courseId || ''),
      title: item.title || '',
      description: item.description || '',
      scheduledAt: item.scheduledAt
        ? new Date(new Date(item.scheduledAt).getTime() - new Date(item.scheduledAt).getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : '',
      durationMinutes: String(item.durationMinutes || 60),
      meetLink: ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <>
    <h1>Live class manager</h1>
    <form className="form" style={{ maxWidth: 680, marginBottom: 30 }} onSubmit={save}>
      <label>
        Course
        <select
          required
          className="select"
          value={form.courseId}
          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
        >
          <option value="">Select a course…</option>
          {(courses || []).map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.title} ({c.slug})
            </option>
          ))}
        </select>
      </label>
      <label>Title<Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
      <label>Description<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>
      <label>Scheduled at<Input required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}/></label>
      <label>Duration in minutes<Input required type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}/></label>
      <label>Meet link{editingId && <span className="muted"> Leave blank to keep the current protected link.</span>}<Input type="url" value={form.meetLink} onChange={(e) => setForm({ ...form, meetLink: e.target.value })}/></label>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button>{editingId ? 'Save class changes' : 'Schedule class'}</Button>
        {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</Button>}
      </div>
    </form>
    <h2>Scheduled classes</h2>
    <Table headers={['Class', 'Course', 'Scheduled', 'Status', 'Actions']}>
      {(data || []).map((item: any) => <tr key={item._id}>
        <td>{item.title}</td>
        <td>{item.courseId?.title || '—'}</td>
        <td>{new Date(item.scheduledAt).toLocaleString()}</td>
        <td>{item.status}</td>
        <td>
          <Button variant="secondary" onClick={() => edit(item)}>Edit</Button>{' '}
          <Button variant="danger" onClick={async () => {
            if (!window.confirm('Delete this class?')) return;
            try {
              await api.delete(`/admin/classes/${item._id}`);
              toast.success('Class deleted');
              await refetch();
            } catch (error: any) {
              toast.error(error.response?.data?.message || 'Could not delete class');
            }
          }}>Delete</Button>
        </td>
      </tr>)}
    </Table>
  </>;
}
