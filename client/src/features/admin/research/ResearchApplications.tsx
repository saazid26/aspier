import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

type ResearchApplication = {
  _id: string;
  researchTitle: string;
  name: string;
  email: string;
  phone: string;
  institution: string;
  academicStatus: string;
  city: string;
  country: string;
  skills: string;
  statement?: string;
  googleScholar?: string;
  researchGate?: string;
  cvFilename?: string;
  status: string;
  createdAt: string;
};

function externalLink(url?: string) {
  if (!url) return null;
  const href = url.startsWith('http') ? url : `https://${url}`;
  return <a href={href} target="_blank" rel="noreferrer">{url}</a>;
}

export function ResearchApplications() {
  const [status, setStatus] = useState('pending');
  const client = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['research-applications', status],
    queryFn: async () => (await api.get('/admin/research-applications', { params: { status } })).data.data as ResearchApplication[]
  });
  const updateStatus = async (item: ResearchApplication, nextStatus: 'shortlisted' | 'approved') => {
    try {
      await api.patch(`/admin/research-applications/${item._id}/status`, { status: nextStatus });
      toast.success(`Application ${nextStatus}.`);
      await Promise.all([refetch(), client.invalidateQueries({ queryKey: ['notifications', 'admin'] })]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not update application');
    }
  };
  const remove = async (item: ResearchApplication) => {
    if (!window.confirm(`Permanently delete ${item.name}'s research application?`)) return;
    try {
      await api.delete(`/admin/research-applications/${item._id}`);
      toast.success('Application deleted.');
      await refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not delete application');
    }
  };
  return <section>
    <div className="section-head"><div><h1>Research Applications</h1><p className="muted">Review collaboration applicants, demographics, research skills, and optional CVs.</p></div>
      <select className="select research-application-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending">Pending</option><option value="shortlisted">Shortlisted</option><option value="approved">Approved</option></select>
    </div>
    {isLoading && <p role="status">Loading research applications…</p>}
    {isError && <p role="alert" className="applicant-error-message">Could not load research applications. <Button type="button" variant="secondary" onClick={() => void refetch()}>Try again</Button></p>}
    {!isLoading && !isError && data.length === 0 && <p className="card muted">No applications in this review stage.</p>}
    <div className="research-applications-list">{data.map((item) => <article className="card" key={item._id}>
      <div className="section-head"><div><span className="badge badge-green">{item.status}</span><h2>{item.name}</h2><p>{item.researchTitle}</p></div><small>{new Date(item.createdAt).toLocaleString()}</small></div>
      <dl className="membership-credentials">
        <div><dt>Email / phone</dt><dd><a href={`mailto:${item.email}`}>{item.email}</a><br/>{item.phone}</dd></div>
        <div><dt>Institution / status</dt><dd>{item.institution}<br/>{item.academicStatus}</dd></div>
        <div><dt>Location</dt><dd>{item.city}, {item.country}</dd></div>
        <div><dt>Google Scholar</dt><dd>{externalLink(item.googleScholar) || 'Not provided'}</dd></div>
        <div><dt>ResearchGate</dt><dd>{externalLink(item.researchGate) || 'Not provided'}</dd></div>
      </dl>
      <h3>Skills</h3><p className="preserve-lines">{item.skills}</p>
      {item.statement && <><h3>Statement of interest</h3><p className="preserve-lines">{item.statement}</p></>}
      {item.cvFilename && <a className="button button-secondary" href={`/api/v1/admin/research-applications/${item._id}/cv`}>Download CV: {item.cvFilename}</a>}
      <div className="membership-actions"><Button onClick={() => updateStatus(item, 'shortlisted')}>Shortlist</Button><Button variant="secondary" onClick={() => updateStatus(item, 'approved')}>Approve</Button><Button variant="danger" onClick={() => void remove(item)}>Delete</Button></div>
    </article>)}</div>
  </section>;
}
