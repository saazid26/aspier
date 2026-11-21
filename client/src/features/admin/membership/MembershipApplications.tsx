import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

type Application = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  academicStatus?: string;
  role: 'supervisor' | 'youngScholar';
  category?: 'supervisor' | 'youngScholar' | 'teammate';
  wing?: string;
  wingInterest: string;
  statement?: string;
  status: string;
  createdAt: string;
  presentAddress?: string;
  permanentAddress?: string;
  designation?: string;
  institution?: string;
  educationalBackground?: string;
  googleScholar?: string;
  researchGate?: string;
  orcid?: string;
  linkedin?: string;
  bio?: string;
  researchDomains?: string[];
  photo?: string;
  paymentMethod?: string;
  trxId?: string;
};

const categoryLabel = (role: Application['role'] | undefined) => role === 'youngScholar' ? 'Young Scholar' : 'Supervisor';

export function MembershipApplications() {
  const [stage, setStage] = useState<'signup_pending' | 'initial_pending' | 'final_pending' | 'verification_pending'>('signup_pending');
  const [credentials, setCredentials] = useState<Record<string, { applicationId: string; accessCode: string; confirmation?: string }>>({});
  const [dispatchConfirmation, setDispatchConfirmation] = useState<{ email: string; message: string } | null>(null);
  const [approvingId, setApprovingId] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const client = useQueryClient();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['membership-applications', stage],
    queryFn: async () => (await api.get('/admin/membership-applications', { params: { status: stage } })).data.data as Application[]
  });

  const runAction = async (id: string, action: 'approve' | 'publish' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Permanently delete this application? It will not be published.')) return;
        await api.delete(`/admin/membership-applications/${id}`);
      } else {
        await api.post(`/admin/membership-applications/${id}/${action}`);
      }
      toast.success(action === 'approve' ? 'Primary application approved; applicant notified.' : action === 'publish' ? 'Profile approved and published.' : 'Application deleted.');
      await Promise.all([
        refetch(),
        client.invalidateQueries({ queryKey: ['team-founder'] }),
        client.invalidateQueries({ queryKey: ['team-supervisors'] }),
        client.invalidateQueries({ queryKey: ['team-scholars'] })
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Could not ${action} application`);
    }
  };

  const updateCredential = (id: string, key: 'applicationId' | 'accessCode', value: string) => {
    setCredentials((current) => ({ ...current, [id]: { ...(current[id] || { applicationId: '', accessCode: '' }), [key]: value } }));
  };

  const approveSignup = async (application: Application) => {
    setApprovingId(application._id);
    setApprovalError('');
    const assigned = credentials[application._id];
    if (!assigned?.applicationId || !assigned.accessCode) {
      toast.error('Generate or enter both credentials before approving.');
      setApprovingId('');
      return;
    }
    try {
      const response = await api.post(`/admin/membership-applications/${application._id}/approve-signup`, assigned);
      setCredentials((current) => ({ ...current, [application._id]: { ...assigned, confirmation: response.data.data.confirmation } }));
      setDispatchConfirmation({ email: application.email, message: response.data.data.confirmation });
      toast.success('Applicant approved. Copy the credentials below for secure delivery.');
      await refetch();
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Could not approve applicant sign-up');
      setApprovalError(message);
      toast.error(message);
    } finally {
      setApprovingId('');
    }
  };

  const copyConfirmation = async (confirmation: string) => {
    try {
      await navigator.clipboard.writeText(confirmation);
      toast.success('Credential dispatch confirmation copied.');
    } catch {
      toast.error('Clipboard access is unavailable. Select and copy the confirmation text.');
    }
  };

  return <section>
    <h1>Membership applications</h1>
    <p className="muted">Review Stage 1 applications, then approve fee-free Supervisor profiles or verify Young Scholar profiles and their BDT 1,000 TrxIDs.</p>
    <div className="tabs" role="tablist">
      <button className={`tab ${stage === 'signup_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('signup_pending')}>Applicant sign-ups</button>
      <button className={`tab ${stage === 'initial_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('initial_pending')}>Stage 1: Primary applications</button>
      <button className={`tab ${stage === 'final_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('final_pending')}>Stage 2: Supervisor profiles</button>
      <button className={`tab ${stage === 'verification_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('verification_pending')}>Stage 2: Young Scholar payment</button>
    </div>
    {dispatchConfirmation && <div className="credential-dispatch-confirmation" role="status">
      <strong>Credential dispatch confirmation — {dispatchConfirmation.email}</strong>
      <p>{dispatchConfirmation.message}</p>
      <Button type="button" variant="secondary" onClick={() => void copyConfirmation(dispatchConfirmation.message)}>Copy dispatch confirmation</Button>
    </div>}
    {approvalError && <p className="applicant-error-message" role="alert">{approvalError}</p>}
    {isLoading && <p role="status">Loading applications…</p>}
    {!isLoading && data.length === 0 && <p className="card muted">No applications awaiting review.</p>}
    <div className="membership-applications">
      {data.map((application) => <article className="card membership-application-card" key={application._id}>
        <div className="section-head">
          <div><span className="badge badge-yellow">{categoryLabel(application.role || application.category)}</span><h2>{application.name}</h2></div>
          <span className="muted">{new Date(application.createdAt).toLocaleString()}</span>
        </div>
        <p><strong>Email:</strong> {application.email} · <strong>Phone:</strong> {application.phone}</p>
        <p><strong>Selected role:</strong> {categoryLabel(application.role || application.category)} · <strong>Selected wing:</strong> {application.wing || application.wingInterest}</p>
        {stage === 'signup_pending' && <>
          <div className="applicant-signup-details">
            <p><strong>Institution / University:</strong> {application.institution || 'Not provided'}</p>
            <p><strong>Academic status:</strong> {application.academicStatus || 'Not provided'}</p>
          </div>
          <div className="applicant-credential-fields">
            <label>Application ID
              <Input required value={credentials[application._id]?.applicationId || ''} onChange={(event) => updateCredential(application._id, 'applicationId', event.target.value)}/>
            </label>
            <Button type="button" variant="secondary" onClick={() => updateCredential(application._id, 'applicationId', `ASPIER-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`)}>Generate ID</Button>
            <label>Private Access Code
              <Input required minLength={16} value={credentials[application._id]?.accessCode || ''} onChange={(event) => updateCredential(application._id, 'accessCode', event.target.value)}/>
            </label>
            <Button type="button" variant="secondary" onClick={() => updateCredential(application._id, 'accessCode', crypto.randomUUID().replaceAll('-', '').slice(0, 24))}>Generate Code</Button>
          </div>
          <div className="membership-actions">
            <Button disabled={approvingId === application._id} onClick={() => void approveSignup(application)}>{approvingId === application._id ? 'Approving…' : 'Approve & Show Credentials'}</Button>
            <Button variant="danger" onClick={() => runAction(application._id, 'delete')}>Delete / Reject</Button>
          </div>
          {credentials[application._id]?.confirmation && <div className="credential-dispatch-confirmation">
            <p>{credentials[application._id].confirmation}</p>
            <Button type="button" variant="secondary" onClick={() => void copyConfirmation(credentials[application._id].confirmation || '')}>Copy dispatch confirmation</Button>
          </div>}
        </>}
        {stage === 'initial_pending' && <>
          {application.statement && <p className="muted">{application.statement}</p>}
          <div className="membership-actions">
            <Button onClick={() => runAction(application._id, 'approve')}>Approve (OK)</Button>
            <Button variant="danger" onClick={() => runAction(application._id, 'delete')}>Delete / Reject</Button>
          </div>
        </>}
        {(stage === 'final_pending' || stage === 'verification_pending') && <>
          {application.photo && <img className="membership-review-photo" src={application.photo} alt={`${application.name} profile`}/>}
          <dl className="membership-credentials">
            <div><dt>Designation</dt><dd>{application.designation}</dd></div>
            <div><dt>Institution</dt><dd>{application.institution}</dd></div>
            <div><dt>Present address</dt><dd>{application.presentAddress}</dd></div>
            <div><dt>Permanent address</dt><dd>{application.permanentAddress}</dd></div>
            <div><dt>Education</dt><dd>{application.educationalBackground}</dd></div>
            <div><dt>Research domains</dt><dd>{application.researchDomains?.join(', ')}</dd></div>
            <div><dt>Google Scholar</dt><dd>{application.googleScholar || 'Not provided'}</dd></div>
            <div><dt>ResearchGate</dt><dd>{application.researchGate || 'Not provided'}</dd></div>
            <div><dt>ORCID</dt><dd>{application.orcid || 'Not provided'}</dd></div>
            <div><dt>LinkedIn</dt><dd>{application.linkedin || 'Not provided'}</dd></div>
            {stage === 'verification_pending' && <><div><dt>Payment amount</dt><dd>BDT 1,000</dd></div><div><dt>Payment method</dt><dd>{application.paymentMethod}</dd></div><div><dt>TrxID</dt><dd><strong>{application.trxId}</strong></dd></div></>}
          </dl>
          <h3>Research bio</h3><p className="muted">{application.bio}</p>
          <div className="membership-actions">
            {stage === 'final_pending'
              ? <Button onClick={() => runAction(application._id, 'publish')}>Approve Profile & Publish (Free)</Button>
              : <Button onClick={() => runAction(application._id, 'publish')}>Verify TrxID & Publish</Button>}
            <Button variant="danger" onClick={() => runAction(application._id, 'delete')}>Delete / Reject</Button>
          </div>
        </>}
      </article>)}
    </div>
  </section>;
}
