import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export function RecordingManager() {
  const [form, setForm] = useState({ classId: '', recordingYoutubeId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: classes, refetch } = useQuery({
    queryKey: ['admin-classes-recording'],
    queryFn: async () => (await api.get('/admin/classes')).data.data
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.classId) {
      toast.error('Please select a class');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.put(`/admin/classes/${form.classId}`, {
        recordingYoutubeId: form.recordingYoutubeId,
        status: 'completed'
      });
      toast.success('Recording updated successfully');
      await refetch();
    } catch (requestError: any) {
      const message = requestError.response?.data?.message || 'Recording update failed';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onClassSelected = (id: string) => {
    const selected = (classes || []).find((c: any) => c._id === id);
    setForm({
      classId: id,
      recordingYoutubeId: selected?.recordingYoutubeId || ''
    });
  };

  return <>
    <h1>Recording manager</h1>
    <p className="muted">Attach YouTube recording IDs to completed or live classes so students can replay them.</p>
    <form className="form" style={{ maxWidth: 680 }} onSubmit={submit}>
      {error && <p className="applicant-error-message" role="alert">{error}</p>}
      <label>
        Class
        <select
          required
          className="select"
          value={form.classId}
          onChange={(event) => onClassSelected(event.target.value)}
        >
          <option value="">Select a class…</option>
          {(classes || []).map((item: any) => (
            <option key={item._id} value={item._id}>
              {item.title} — {item.courseId?.title || 'Course'} ({new Date(item.scheduledAt).toLocaleDateString()})
            </option>
          ))}
        </select>
      </label>
      <label>
        YouTube video ID
        <Input
          required
          value={form.recordingYoutubeId}
          placeholder="e.g. dQw4w9WgXcQ"
          onChange={(event) => setForm({ ...form, recordingYoutubeId: event.target.value })}
        />
      </label>
      <Button disabled={busy || !form.classId}>{busy ? 'Saving…' : 'Update recording'}</Button>
    </form>
  </>;
}
