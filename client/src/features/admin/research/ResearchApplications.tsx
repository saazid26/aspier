import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, ExternalLink, Check, Copy, MessageSquare, ShieldCheck, Clock, CheckCircle2, Trash2, Send, CreditCard, Sparkles } from 'lucide-react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';

type ResearchApplication = {
  _id: string;
  applicationId: string;
  accessCode?: string;
  role: string;
  name: string;
  email: string;
  phone?: string;
  university: string;
  department: string;
  occupation: string;
  wingName: string;
  wingSlug?: string;
  researchTitle: string;
  researchSlug?: string;
  skills: string;
  statement?: string;
  cvFilename?: string;
  status: 'pending' | 'stage1_approved' | 'payment_submitted' | 'approved' | 'rejected' | string;
  paymentMethod?: string;
  paymentSenderPhone?: string;
  trxId?: string;
  paymentAmount?: number;
  whatsAppGroupLink?: string;
  createdAt: string;
};

export function ResearchApplications() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});
  const [whatsAppLinks, setWhatsAppLinks] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState('');
  const [approvalModal, setApprovalModal] = useState<{
    name: string;
    email: string;
    applicationId: string;
    accessCode: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const client = useQueryClient();

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['research-applications', statusFilter],
    queryFn: async () => {
      const response = await api.get('/admin/research-applications', {
        params: { status: statusFilter }
      });
      return response.data.data as ResearchApplication[];
    }
  });

  const getCode = (item: ResearchApplication) => {
    if (accessCodes[item._id] !== undefined) return accessCodes[item._id];
    return item.accessCode || `RM-SEC-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  };

  const setCode = (id: string, code: string) => {
    setAccessCodes((prev) => ({ ...prev, [id]: code }));
  };

  const getWhatsApp = (item: ResearchApplication) => {
    if (whatsAppLinks[item._id] !== undefined) return whatsAppLinks[item._id];
    return item.whatsAppGroupLink || 'https://chat.whatsapp.com/invite/AspierResearchMate2026';
  };

  const setWhatsApp = (id: string, link: string) => {
    setWhatsAppLinks((prev) => ({ ...prev, [id]: link }));
  };

  // Stage 1 Approval
  const approveStage1 = async (item: ResearchApplication) => {
    setProcessingId(item._id);
    const code = getCode(item);
    try {
      const response = await api.post(`/admin/research-applications/${item._id}/approve-stage1`, {
        accessCode: code
      });
      const res = response.data.data;
      setApprovalModal({
        name: item.name,
        email: item.email,
        applicationId: res.applicationId || item.applicationId,
        accessCode: res.accessCode || code
      });
      toast.success(`Stage 1 approved! Access Code issued for ${item.name}.`);
      await refetch();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not approve Stage 1.'));
    } finally {
      setProcessingId('');
    }
  };

  // Reject Application
  const rejectApplication = async (item: ResearchApplication) => {
    if (!window.confirm(`Are you sure you want to reject ${item.name}'s application?`)) return;
    setProcessingId(item._id);
    try {
      await api.post(`/admin/research-applications/${item._id}/reject`);
      toast.success(`Application for ${item.name} marked as rejected.`);
      await refetch();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not reject application.'));
    } finally {
      setProcessingId('');
    }
  };

  // Stage 2 Confirm Payment & Set WhatsApp Link
  const confirmPayment = async (item: ResearchApplication) => {
    setProcessingId(item._id);
    const link = getWhatsApp(item);
    try {
      await api.post(`/admin/research-applications/${item._id}/confirm-payment`, {
        whatsAppGroupLink: link
      });
      toast.success(`Payment confirmed & WhatsApp group activated for ${item.name}!`);
      await refetch();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not confirm payment.'));
    } finally {
      setProcessingId('');
    }
  };

  // Update WhatsApp link directly
  const saveWhatsAppLink = async (item: ResearchApplication) => {
    const link = getWhatsApp(item);
    try {
      await api.put(`/admin/research-applications/${item._id}/whatsapp-link`, {
        whatsAppGroupLink: link
      });
      toast.success('WhatsApp group joining link updated.');
      await refetch();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not update WhatsApp link.'));
    }
  };

  // Delete
  const remove = async (item: ResearchApplication) => {
    if (!window.confirm(`Permanently delete ${item.name}'s Research Mate application?`)) return;
    try {
      await api.delete(`/admin/research-applications/${item._id}`);
      toast.success('Application deleted.');
      await refetch();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not delete application.'));
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Could not access clipboard.');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><Clock className="w-3 h-3" /> Stage 1: Pending</span>;
      case 'stage1_approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><Sparkles className="w-3 h-3" /> Stage 1 Approved (Awaiting Payment)</span>;
      case 'payment_submitted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200"><CreditCard className="w-3 h-3" /> Payment Submitted (Verify TrxID)</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved &amp; Enrolled</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Research Mate Applications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review Stage 1 Research Mate applications, issue Private Access Codes, verify BDT 1,000 project payments, and manage WhatsApp Group joining links.
          </p>
        </div>
      </div>

      <div className="tabs mb-6" role="tablist">
        <button className={`tab ${statusFilter === 'all' ? 'active' : ''}`} type="button" onClick={() => setStatusFilter('all')}>
          All Applications
        </button>
        <button className={`tab ${statusFilter === 'pending' ? 'active' : ''}`} type="button" onClick={() => setStatusFilter('pending')}>
          Stage 1: Pending
        </button>
        <button className={`tab ${statusFilter === 'stage1_approved' ? 'active' : ''}`} type="button" onClick={() => setStatusFilter('stage1_approved')}>
          Stage 1 Approved
        </button>
        <button className={`tab ${statusFilter === 'payment_submitted' ? 'active' : ''}`} type="button" onClick={() => setStatusFilter('payment_submitted')}>
          Verify Payment (TrxID)
        </button>
        <button className={`tab ${statusFilter === 'approved' ? 'active' : ''}`} type="button" onClick={() => setStatusFilter('approved')}>
          Approved (WhatsApp Active)
        </button>
      </div>

      {isLoading && <p role="status" className="p-8 text-center text-slate-500">Loading research applications…</p>}
      {isError && (
        <p role="alert" className="applicant-error-message p-4 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
          Could not load research applications. <Button type="button" variant="secondary" onClick={() => void refetch()}>Try again</Button>
        </p>
      )}

      {!isLoading && !isError && data.length === 0 && (
        <div className="card p-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-300">
          No research applications found in this stage.
        </div>
      )}

      <div className="research-applications-list space-y-6">
        {data.map((item) => (
          <article className="card p-6 rounded-xl border border-slate-200 shadow-sm bg-white space-y-4" key={item._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> Research Mate
                  </span>
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                    {item.applicationId || 'NO-ID'}
                  </span>
                  {statusBadge(item.status)}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  <strong>Target Project:</strong> <span className="text-teal-900 font-semibold">{item.researchTitle}</span> · <strong>Wing:</strong> {item.wingName}
                </p>
              </div>
              <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
            </div>

            {/* Applicant Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p><strong>Email:</strong> <a href={`mailto:${item.email}`} className="text-teal-700 font-mono underline">{item.email}</a></p>
              <p><strong>Phone:</strong> {item.phone || 'Not provided'}</p>
              <p><strong>University:</strong> {item.university || 'Not provided'}</p>
              <p><strong>Department:</strong> {item.department || 'Not provided'}</p>
              <div className="md:col-span-2">
                <p><strong>Occupation / Workplace:</strong> {item.occupation || 'Not provided'}</p>
              </div>
            </div>

            {/* Skills & Statement */}
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Relevant Skills</p>
                <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-xs text-slate-800">{item.skills}</p>
              </div>
              {item.statement && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Statement of Interest</p>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs italic text-slate-700 leading-relaxed">"{item.statement}"</p>
                </div>
              )}
            </div>

            {/* CV View / Download Button */}
            <div className="pt-1">
              <a
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
                href={`/api/v1/admin/research-applications/${item._id}/cv`}
                target="_blank"
                rel="noreferrer"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                View / Download PDF CV ({item.cvFilename || 'applicant_cv.pdf'})
                <ExternalLink className="w-3 h-3 text-slate-500 ml-0.5" />
              </a>
            </div>

            {/* STAGE 1: ISSUE / GENERATE ACCESS CODE (If pending) */}
            {item.status === 'pending' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Stage 1 Approval &amp; Private Access Code</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-600 block mb-1">Private Access Code for Candidate:</label>
                    <Input
                      value={getCode(item)}
                      onChange={(e) => setCode(item._id, e.target.value)}
                      className="font-mono text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="self-end text-xs shrink-0 py-2"
                    onClick={() => setCode(item._id, `RM-SEC-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`)}
                  >
                    Generate New Code
                  </Button>
                </div>
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs text-blue-800">
                    Approving Stage 1 will issue this access code and notify the applicant to open the Check Application portal.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      disabled={processingId === item._id}
                      onClick={() => void rejectApplication(item)}
                      className="text-xs py-2 px-3"
                    >
                      Reject Application
                    </Button>
                    <Button
                      type="button"
                      disabled={processingId === item._id}
                      onClick={() => void approveStage1(item)}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {processingId === item._id ? 'Approving…' : 'Approve Stage 1 & Issue Code'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 1 APPROVED INFO */}
            {item.status === 'stage1_approved' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
                <span>Stage 1 Approved. Private Access Code: <strong className="font-mono">{item.accessCode}</strong>. Candidate awaiting BDT 1,000 payment submission.</span>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs py-1 px-2.5"
                  onClick={() => copyText(item.accessCode || '')}
                >
                  <Copy className="w-3 h-3 mr-1 inline" /> Copy Code
                </Button>
              </div>
            )}

            {/* STAGE 2: VERIFY PAYMENT & SET WHATSAPP GROUP LINK (If payment_submitted) */}
            {item.status === 'payment_submitted' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-purple-700" />
                    Verify BDT 1,000 Payment Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 p-3 bg-white rounded-lg border border-purple-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Method:</span>
                      <strong className="text-slate-900 font-semibold">{item.paymentMethod || 'bKash'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sender Phone:</span>
                      <strong className="text-slate-900 font-semibold">{item.paymentSenderPhone || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Transaction ID (TrxID):</span>
                      <strong className="font-mono text-purple-800 font-bold text-sm">{item.trxId}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Custom Project WhatsApp Group Joining Link <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="https://chat.whatsapp.com/invite/..."
                    value={getWhatsApp(item)}
                    onChange={(e) => setWhatsApp(item._id, e.target.value)}
                    className="text-xs bg-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the WhatsApp group link for this specific batch or project. The candidate will see a "Join WhatsApp Group" button upon approval.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    disabled={processingId === item._id}
                    onClick={() => void confirmPayment(item)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {processingId === item._id ? 'Confirming…' : 'Confirm Payment & Approve Enrollment'}
                  </Button>
                </div>
              </div>
            )}

            {/* APPROVED: MANAGE / UPDATE WHATSAPP LINK */}
            {item.status === 'approved' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Active Project WhatsApp Group
                  </span>
                  {item.whatsAppGroupLink && (
                    <a
                      href={item.whatsAppGroupLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 underline"
                    >
                      Test Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="https://chat.whatsapp.com/invite/..."
                    value={getWhatsApp(item)}
                    onChange={(e) => setWhatsApp(item._id, e.target.value)}
                    className="text-xs bg-white font-mono"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 text-xs py-1.5 px-3"
                    onClick={() => void saveWhatsAppLink(item)}
                  >
                    Update Link
                  </Button>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Application Reference: {item._id}</span>
              <Button
                type="button"
                variant="danger"
                className="text-xs py-1 px-3 flex items-center gap-1"
                onClick={() => void remove(item)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* STAGE 1 APPROVAL MODAL */}
      {approvalModal && (
        <Modal
          open={!!approvalModal}
          title="Stage 1 Approved — Credentials Issued"
          onClose={() => setApprovalModal(null)}
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-emerald-950">Stage 1 Successfully Approved</h3>
              </div>
              <p className="text-sm text-emerald-800 leading-relaxed">
                Candidate <strong>{approvalModal.name}</strong> has been approved for Stage 1. An automated notification has been logged for their email (<strong>{approvalModal.email}</strong>).
              </p>
            </div>

            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1">
                  Application ID
                </label>
                <Input readOnly value={approvalModal.applicationId} className="font-mono text-xs bg-white font-bold" />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1">
                  Private Access Code
                </label>
                <div className="flex gap-2">
                  <Input readOnly value={approvalModal.accessCode} className="font-mono text-xs bg-white font-bold text-teal-800" />
                  <Button
                    type="button"
                    onClick={() => copyText(approvalModal.accessCode)}
                    className="shrink-0 text-xs px-3"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              The applicant can now enter these credentials at <a href="/check-application" className="text-teal-700 underline font-semibold" target="_blank" rel="noreferrer">/check-application</a> to complete their Stage 2 verification and BDT 1,000 project fee submission.
            </p>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs px-5 py-2"
                onClick={() => setApprovalModal(null)}
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
