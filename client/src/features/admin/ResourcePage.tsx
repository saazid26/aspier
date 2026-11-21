import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { wingsResource } from './resources/wings';
import { researchResource } from './resources/research';
import { supervisorsResource } from './resources/supervisors';
import { scholarsResource } from './resources/scholars';
import { newsResource } from './resources/news';
import { coursesResource } from './resources/courses';
import { usersResource } from './resources/users';
import { instructorsResource } from './resources/instructors';
import { messagesResource } from './resources/messages';

const configs: Record<string, { name: string; title: string; endpoint: string; fields: any[] }> = {
  wings: wingsResource,
  research: researchResource,
  supervisors: supervisorsResource,
  scholars: scholarsResource,
  news: newsResource,
  courses: coursesResource,
  users: usersResource,
  instructors: instructorsResource,
  messages: messagesResource
};
const publicQueryKeys: Record<string, string[]> = {
  wings: ['wings'],
  research: ['research', 'research-featured'],
  supervisors: ['team-supervisors'],
  scholars: ['team-scholars'],
  news: ['announcements', 'news'],
  courses: ['courses', 'course']
};

export function ResourcePage() {
  const { resource = 'wings' } = useParams();
  const resourceExists = Boolean(configs[resource]);
  const config = configs[resource] || wingsResource;
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['resource', resource],
    enabled: resourceExists,
    queryFn: async () => (await api.get(config.endpoint)).data.data as Array<Record<string, any>>
  });

  const refresh = async () => {
    await refetch();
    await Promise.all((publicQueryKeys[resource] || []).map((queryKey) => client.invalidateQueries({ queryKey: [queryKey] })));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && config.name === 'users' && !payload.password) delete payload.password;
      if (editing) await api.put(`${config.endpoint}/${String(editing._id)}`, payload);
      else await api.post(config.endpoint, payload);
      toast.success('Saved and published.');
      setOpen(false);
      setEditing(null);
      setForm({});
      await refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: Record<string, any>) => {
    if (!window.confirm(`Delete this ${config.title.toLowerCase()} record?`)) return;
    try {
      await api.delete(`${config.endpoint}/${item._id}`);
      toast.success('Deleted.');
      await refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  if (!resourceExists) return <section><h1>Resource not found</h1><p className="muted">This Admin section does not exist.</p><Link className="button button-secondary" to="/admin">Return to dashboard</Link></section>;

  return <>
    <div className="section-head"><h1>{config.title}</h1><Button type="button" onClick={() => { setEditing(null); setForm({}); setOpen(true); }}>Create new</Button></div>
    {isLoading && <p role="status">Loading {config.title.toLowerCase()}…</p>}
    {isError && <div role="alert" className="applicant-error-message">Could not load {config.title.toLowerCase()}. <Button type="button" variant="secondary" onClick={() => void refetch()}>Try again</Button></div>}
    {!isLoading && !isError && <Table headers={config.fields.slice(0, 3).map((field) => field.label).concat('Actions')}>
      {(data || []).map((item) => <tr key={item._id}>
        {config.fields.slice(0, 3).map((field) => <td key={field.name}>{String(item[field.name] ?? '')}</td>)}
        <td>
          <button type="button" className="button button-secondary" onClick={() => { setEditing(item); setForm({ ...item, password: '' }); setOpen(true); }}>Edit</button>{' '}
          <button type="button" className="button button-danger" onClick={() => void deleteItem(item)}>Delete</button>
        </td>
      </tr>)}
    </Table>}
    <Modal open={open} title={`${editing ? 'Edit' : 'Create'} ${config.title}`} onClose={() => setOpen(false)}>
      <DynamicForm
        fields={config.fields}
        value={form}
        submitting={saving}
        onChange={(name, value) => setForm((current) => ({ ...current, [name]: value }))}
        onSubmit={submit}
      />
    </Modal>
  </>;
}
