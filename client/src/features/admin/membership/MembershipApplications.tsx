import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Send, Copy, Check, ExternalLink, ShieldCheck, Clock, UserCheck, Trash2 } from 'lucide-react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';

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
  onboardingToken?: string;
  onboardingTokenExpires?: string;
  onboardingTokenUsed?: boolean;
};

type OnboardingModalData = {
  applicationId: string;
  name: string;
  email: string;
  roleLabel: string;
  onboardingUrl: string;
  expiresAt: string;
};

const categoryLabel = (role: Application['role'] | undefined, category?: string) => {
  if (role === 'supervisor' || category === 'supervisor' || category === 'teammate') {
    return 'Research Supervisor';
  }
  return 'Young Scholar';
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'onboarding_sent':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><Send className="w-3 h-3" /> Onboarding Link Dispatched</span>;
    case 'published':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200"><ShieldCheck className="w-3 h-3" /> Published to Team</span>;
    case 'signup_pending':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><Clock className="w-3 h-3" /> Sign-Up Pending</span>;
    case 'initial_pending':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3 h-3" /> Stage 1 Review</span>;
    case 'final_pending':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200"><Clock className="w-3 h-3" /> Profile Review</span>;
    case 'verification_pending':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"><Clock className="w-3 h-3" /> Profile Review</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
  }
};

export function MembershipApplications() {
  const [stage, setStage] = useState<'all' | 'signup_pending' | 'initial_pending' | 'final_pending' | 'verification_pending' | 'onboarding_sent' | 'published'>('all');
  const [credentials, setCredentials] = useState<Record<string, { applicationId: string; accessCode: string; confirmation?: string }>>({});
  const [dispatchConfirmation, setDispatchConfirmation] = useState<{ email: string; message: string } | null>(null);
  const [approvingId, setApprovingId] = useState('');
  const [onboardingModal, setOnboardingModal] = useState<OnboardingModalData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  
  const client = useQueryClient();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['membership-applications', stage],
    queryFn: async () => (await api.get('/admin/membership-applications', { params: { status: stage } })).data.data as Application[]
  });

  const handleApproveAndSendOnboarding = async (application: Application) => {
    setApprovingId(application._id);
    setApprovalError('');
    try {
      const response = await api.post(`/admin/membership-applications/${application._id}/approve-onboarding`);
      const linkData = response.data.data;
      setOnboardingModal({
        applicationId: application._id,
        name: linkData.name || application.name,
        email: linkData.email || application.email,
        roleLabel: linkData.roleLabel,
        onboardingUrl: linkData.onboardingUrl,
        expiresAt: new Date(linkData.expiresAt).toLocaleDateString()
      });
      toast.success(`Approved! Secure onboarding link dispatched to ${application.email}`);
      await refetch();
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Could not approve and dispatch onboarding link');
      setApprovalError(message);
      toast.error(message);
    } finally {
      setApprovingId('');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      toast.success('Onboarding link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Could not access clipboard. Please copy manually.');
    }
  };

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

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Applications / Inquiries</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review Young Scholar &amp; Research Supervisor applications, trigger automated onboarding sign-up links, or verify credentials.
          </p>
        </div>
      </div>

      <div className="tabs mb-6" role="tablist">
        <button className={`tab ${stage === 'all' ? 'active' : ''}`} type="button" onClick={() => setStage('all')}>
          All Applications
        </button>
        <button className={`tab ${stage === 'signup_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('signup_pending')}>
          Applicant sign-ups
        </button>
        <button className={`tab ${stage === 'initial_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('initial_pending')}>
          Stage 1: Primary
        </button>
        <button className={`tab ${stage === 'final_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('final_pending')}>
          Stage 2: Profile Review
        </button>
        <button className={`tab ${stage === 'verification_pending' ? 'active' : ''}`} type="button" onClick={() => setStage('verification_pending')}>
          Stage 2: Legacy Verification
        </button>
        <button className={`tab ${stage === 'onboarding_sent' ? 'active' : ''}`} type="button" onClick={() => setStage('onboarding_sent')}>
          Onboarding Dispatched
        </button>
        <button className={`tab ${stage === 'published' ? 'active' : ''}`} type="button" onClick={() => setStage('published')}>
          Published to Team
        </button>
      </div>

      {dispatchConfirmation && (
        <div className="credential-dispatch-confirmation mb-6" role="status">
          <strong>Credential dispatch confirmation — {dispatchConfirmation.email}</strong>
          <p>{dispatchConfirmation.message}</p>
          <Button type="button" variant="secondary" onClick={() => void copyConfirmation(dispatchConfirmation.message)}>
            Copy dispatch confirmation
          </Button>
        </div>
      )}

      {approvalError && <p className="applicant-error-message mb-6" role="alert">{approvalError}</p>}

      {isLoading && <p role="status" className="p-8 text-center text-slate-500">Loading applications…</p>}
      
      {!isLoading && data.length === 0 && (
        <div className="card p-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-300">
          No applications found in this category.
        </div>
      )}

      <div className="membership-applications space-y-6">
        {data.map((application) => {
          const roleLabel = categoryLabel(application.role, application.category);
          const isSupervisor = roleLabel === 'Research Supervisor';

          return (
            <article className="card membership-application-card p-6 rounded-xl border border-slate-200 shadow-sm bg-white" key={application._id}>
              <div className="section-head flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isSupervisor ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                      {roleLabel}
                    </span>
                    {statusBadge(application.status)}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{application.name}</h2>
                </div>
                <span className="text-xs text-slate-500">{new Date(application.createdAt).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p><strong>Email:</strong> <span className="font-mono text-slate-800">{application.email}</span></p>
                <p><strong>Phone:</strong> {application.phone || 'Not provided'}</p>
                <p><strong>Academic Wing:</strong> {application.wing || application.wingInterest || 'General'}</p>
                <p><strong>Institution / University:</strong> {application.institution || 'Not provided'}</p>
                {application.academicStatus && <p><strong>Academic Status:</strong> {application.academicStatus}</p>}
                {application.designation && <p><strong>Designation:</strong> {application.designation}</p>}
              </div>

              {application.statement && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Applicant Statement</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed italic">
                    "{application.statement}"
                  </p>
                </div>
              )}

              {/* Onboarding Token Dispatched Info */}
              {application.status === 'onboarding_sent' && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-sm flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Personalized Onboarding Sign-Up link dispatched to candidate. Candidate profile auto-publishes upon submission.</span>
                  </div>
                  {application.onboardingToken && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs py-1 px-3 border-emerald-300 hover:bg-emerald-100 text-emerald-800"
                      onClick={() => {
                        const baseUrl = window.location.origin;
                        const role = isSupervisor ? 'supervisor' : 'scholar';
                        const url = `${baseUrl}/onboarding?token=${application.onboardingToken}&role=${role}`;
                        copyToClipboard(url);
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1 inline" /> Copy Onboarding Link
                    </Button>
                  )}
                </div>
              )}

              {/* Specific Stage View Elements */}
              {stage === 'signup_pending' && (
                <div className="applicant-credential-fields p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Manual / Legacy Access Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Application ID</label>
                      <div className="flex gap-2">
                        <Input
                          required
                          value={credentials[application._id]?.applicationId || ''}
                          onChange={(e) => updateCredential(application._id, 'applicationId', e.target.value)}
                          placeholder="e.g. ASPIER-2026-ABCD"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0 text-xs px-2.5"
                          onClick={() => updateCredential(application._id, 'applicationId', `ASPIER-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`)}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Private Access Code</label>
                      <div className="flex gap-2">
                        <Input
                          required
                          minLength={16}
                          value={credentials[application._id]?.accessCode || ''}
                          onChange={(e) => updateCredential(application._id, 'accessCode', e.target.value)}
                          placeholder="Private 24-character code"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0 text-xs px-2.5"
                          onClick={() => updateCredential(application._id, 'accessCode', crypto.randomUUID().replaceAll('-', '').slice(0, 24))}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(stage === 'final_pending' || stage === 'verification_pending') && (
                <div className="mb-4">
                  {application.photo && (
                    <img className="w-20 h-20 rounded-full object-cover border border-slate-200 mb-3" src={application.photo} alt={`${application.name} profile`} />
                  )}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div><dt className="text-xs text-slate-500 font-semibold">Designation</dt><dd>{application.designation || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500 font-semibold">Institution</dt><dd>{application.institution || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500 font-semibold">Education</dt><dd>{application.educationalBackground || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500 font-semibold">Research Domains</dt><dd>{application.researchDomains?.join(', ') || '—'}</dd></div>
                  </dl>
                  {application.bio && (
                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                      <strong>Bio:</strong> {application.bio}
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="membership-actions flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                {/* Primary Automated Onboarding Action */}
                {application.status !== 'published' && (
                  <Button
                    type="button"
                    disabled={approvingId === application._id}
                    onClick={() => void handleApproveAndSendOnboarding(application)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    {approvingId === application._id ? 'Sending Onboarding Invite…' : 'Approve & Send Onboarding Sign-Up'}
                  </Button>
                )}

                {/* Legacy / Direct Publish Actions if at Stage 2 */}
                {(stage === 'final_pending' || stage === 'verification_pending') && (
                  <Button
                    type="button"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => runAction(application._id, 'publish')}
                  >
                    <UserCheck className="w-4 h-4 mr-1.5 inline" />
                    Publish Profile Directly (Free)
                  </Button>
                )}

                {/* Legacy Signup flow manual action */}
                {stage === 'signup_pending' && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={approvingId === application._id}
                    onClick={() => void approveSignup(application)}
                  >
                    Approve &amp; Show Credentials
                  </Button>
                )}

                {/* Delete / Reject Action */}
                <Button
                  type="button"
                  variant="danger"
                  className="ml-auto flex items-center gap-1.5"
                  onClick={() => runAction(application._id, 'delete')}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete / Reject
                </Button>
              </div>

              {credentials[application._id]?.confirmation && (
                <div className="credential-dispatch-confirmation mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="text-amber-900 mb-2">{credentials[application._id].confirmation}</p>
                  <Button type="button" variant="secondary" onClick={() => void copyConfirmation(credentials[application._id].confirmation || '')}>
                    Copy dispatch confirmation
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Onboarding Confirmation Modal */}
      {onboardingModal && (
        <Modal
          open={!!onboardingModal}
          title="Onboarding Sign-Up Link Dispatched"
          onClose={() => setOnboardingModal(null)}
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-emerald-900">Candidate Successfully Approved</h3>
              </div>
              <p className="text-sm text-emerald-800 leading-relaxed">
                An automated email and notification have been sent to <strong>{onboardingModal.email}</strong> containing their personalized, single-use Onboarding Sign-Up link for <strong>{onboardingModal.roleLabel}</strong>.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
                Personalized Onboarding Link (Valid until {onboardingModal.expiresAt})
              </label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={onboardingModal.onboardingUrl}
                  className="font-mono text-xs bg-slate-50 select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  onClick={() => copyToClipboard(onboardingModal.onboardingUrl)}
                  className={`shrink-0 flex items-center gap-1.5 ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                You can also copy and send this link directly to the candidate via WhatsApp, SMS, or LinkedIn.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>✓ <strong>Role Assigned:</strong> {onboardingModal.roleLabel}</p>
              <p>✓ <strong>Auto-Publish:</strong> As soon as the candidate fills in their profile details and sets their password, their researcher card will automatically publish to the public <strong>/team</strong> page.</p>
              <p>✓ <strong>Single-Use Security:</strong> The link expires in 7 days and can only be submitted once.</p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <a
                href={onboardingModal.onboardingUrl}
                target="_blank"
                rel="noreferrer"
                className="button button-secondary inline-flex items-center gap-1.5 text-xs text-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Form in New Tab
              </a>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setOnboardingModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
