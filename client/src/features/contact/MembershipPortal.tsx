import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, MessageSquare, CheckCircle2, Copy, Check, ExternalLink, ShieldCheck, Sparkles, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ImageUploader } from '../../components/forms/ImageUploader';

type PortalData = {
  applicationId: string;
  name: string;
  email: string;
  role: string;
  wing: string;
  status: string;
  membershipFee?: number;
  bkashNumber?: string;
  nagadNumber?: string;
  paymentInstructions?: string;
  activationCode?: string;
  notifications: Array<{ _id: string; title: string; body: string; createdAt: string; readAt?: string; activationCode?: string }>;
};

type ResearchMatePortalData = {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  university: string;
  department: string;
  occupation: string;
  wingName: string;
  wingSlug: string;
  researchTitle: string;
  skills: string;
  statement?: string;
  status: 'pending' | 'stage1_approved' | 'payment_submitted' | 'approved' | 'rejected' | string;
  paymentAmount: number;
  paymentMethod?: string;
  paymentSenderPhone?: string;
  trxId?: string;
  bkashNumber: string;
  nagadNumber: string;
  paymentInstructions: string;
  whatsAppGroupLink?: string;
  createdAt: string;
};

const initialAccess = (): { applicationId: string; accessCode: string } => {
  try {
    const stored = localStorage.getItem('aspier-membership-access');
    return stored ? JSON.parse(stored) as { applicationId: string; accessCode: string } : { applicationId: '', accessCode: '' };
  } catch {
    return { applicationId: '', accessCode: '' };
  }
};

export function MembershipPortal() {
  const [searchParams] = useSearchParams();
  const [access, setAccess] = useState(initialAccess);
  const [details, setDetails] = useState<PortalData | null>(null);
  const [researchMateDetails, setResearchMateDetails] = useState<ResearchMatePortalData | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [profile, setProfile] = useState({
    name: '', presentAddress: '', permanentAddress: '', designation: '', institution: '', educationalBackground: '',
    googleScholar: '', researchGate: '', orcid: '', linkedin: '', bio: '', researchDomains: '', photo: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PortalData['notifications'][number] | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Check URL params or session on mount
  useEffect(() => {
    const urlId = searchParams.get('id') || searchParams.get('applicationId');
    const urlCode = searchParams.get('code') || searchParams.get('accessCode');
    if (urlId) {
      setAccess((prev) => ({
        applicationId: urlId,
        accessCode: urlCode || prev.accessCode
      }));
    } else {
      try {
        const last = sessionStorage.getItem('aspier-last-research-application');
        if (last) {
          const parsed = JSON.parse(last);
          if (parsed.applicationId && !access.applicationId) {
            setAccess((prev) => ({ ...prev, applicationId: parsed.applicationId }));
          }
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  const set = (key: string, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const appId = access.applicationId.trim().toUpperCase();
    const code = access.accessCode.trim();

    // Check if ID pattern is Research Mate (contains RM or begins with ASPIER-RM)
    const isLikelyResearchMate = appId.includes('RM');

    if (isLikelyResearchMate) {
      try {
        const response = await api.post('/public/research-applications/lookup', {
          applicationId: appId,
          accessCode: code
        });
        setResearchMateDetails(response.data.data);
        setDetails(null);
        localStorage.setItem('aspier-membership-access', JSON.stringify({ applicationId: appId, accessCode: code }));
        toast.success('Research Mate application retrieved successfully.');
        setBusy(false);
        return;
      } catch (err: any) {
        // If failed, try fellowship fallback
      }
    }

    // Try membership fellowship lookup
    try {
      const response = await api.post('/public/membership/lookup', {
        applicationId: appId,
        accessCode: code
      });
      setDetails(response.data.data);
      setResearchMateDetails(null);
      setProfile((current) => ({ ...current, name: response.data.data.name }));
      localStorage.setItem('aspier-membership-access', JSON.stringify({ applicationId: appId, accessCode: code }));
      sessionStorage.setItem('aspier-applicant-access', JSON.stringify({ applicationId: appId, accessCode: code }));
      window.dispatchEvent(new Event('aspier-applicant-access'));
    } catch (error: any) {
      // If membership failed, try research applications lookup
      try {
        const response = await api.post('/public/research-applications/lookup', {
          applicationId: appId,
          accessCode: code
        });
        setResearchMateDetails(response.data.data);
        setDetails(null);
        localStorage.setItem('aspier-membership-access', JSON.stringify({ applicationId: appId, accessCode: code }));
        toast.success('Research Mate application retrieved.');
      } catch {
        setDetails(null);
        setResearchMateDetails(null);
        toast.error('Could not find application. Please verify your Application ID and Private Access Code.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!details) return;
    setBusy(true);
    try {
      const response = await api.post(`/public/membership/${details.applicationId}/profile`, {
        ...profile,
        accessCode: access.accessCode,
        researchDomains: profile.researchDomains.split(',').map((domain) => domain.trim()).filter(Boolean)
      });
      setDetails({ ...details, status: response.data.data.status });
      toast.success('Final academic profile submitted for review.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit membership profile');
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!details) return;
    setBusy(true);
    try {
      const response = await api.post(`/public/membership/${details.applicationId}/payment`, {
        accessCode: access.accessCode,
        paymentMethod,
        trxId
      });
      setDetails({ ...details, status: response.data.data.status });
      toast.success('Transaction ID submitted for payment verification.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit payment details');
    } finally {
      setBusy(false);
    }
  };

  const submitResearchMatePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!researchMateDetails) return;
    if (!trxId || trxId.trim().length < 4) {
      toast.error('Please enter a valid Transaction ID (TrxID).');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post('/public/research-applications/payment', {
        applicationId: researchMateDetails.applicationId,
        accessCode: access.accessCode,
        paymentMethod,
        senderPhone,
        trxId: trxId.trim()
      });
      setResearchMateDetails({
        ...researchMateDetails,
        status: response.data.data.status,
        paymentMethod,
        paymentSenderPhone: senderPhone,
        trxId: trxId.trim()
      });
      toast.success('Payment submitted! Awaiting administrator verification.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit payment details.');
    } finally {
      setBusy(false);
    }
  };

  const copyPaymentNumber = async (num?: string) => {
    const number = num || (paymentMethod === 'bKash' ? (researchMateDetails?.bkashNumber || details?.bkashNumber) : (researchMateDetails?.nagadNumber || details?.nagadNumber)) || '01603012448';
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      setCopiedNumber(true);
      toast.success(`Copied ${paymentMethod} number: ${number}`);
      setTimeout(() => setCopiedNumber(false), 2500);
    } catch {
      toast.error('Clipboard access is unavailable.');
    }
  };

  const requestAccessCode = async () => {
    try {
      await api.post('/public/membership/access-code', { applicationId: access.applicationId, email: recoveryEmail });
      toast.success('If the application details match, an administrator will review your access recovery request.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not request an access code');
    }
  };

  const openNotification = async (notice: PortalData['notifications'][number]) => {
    setSelectedNotification(notice);
    if (!notice.readAt && details) {
      try {
        await api.post(`/public/membership/${details.applicationId}/notifications/${notice._id}/read`, { accessCode: access.accessCode });
        setDetails({ ...details, notifications: details.notifications.map((item) => item._id === notice._id ? { ...item, readAt: new Date().toISOString() } : item) });
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not mark notification as read');
      }
    }
  };

  const categoryLabel = details?.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor';

  return (
    <main className="container section" style={{ maxWidth: 840 }}>
      <SEO title="Check Application Portal | ASPIER" description="Check your fellowship, Young Scholar, Supervisor, or Research Mate application status." />

      <div className="mb-6">
        <span className="eyebrow block">Application Status &amp; Verification</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Check Application Portal
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Track Stage 1 review progress, complete fee-free academic profiles, or submit Research Mate project onboarding and access official WhatsApp research groups.
        </p>
      </div>

      {/* LOGIN / LOOKUP FORM */}
      {!details && !researchMateDetails && (
        <form className="form card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm bg-white space-y-4" onSubmit={lookup}>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Enter the <strong>Application ID</strong> and <strong>Private Access Code</strong> generated upon submitting your application or received via approval notification.</span>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
              Application ID
            </label>
            <Input
              required
              placeholder="e.g. ASPIER-RM-2026-A101 or ASPIER-2026-XXXX"
              value={access.applicationId}
              onChange={(e) => setAccess({ ...access, applicationId: e.target.value.toUpperCase() })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
              Private Access Code
            </label>
            <Input
              required
              placeholder="Enter your private access code"
              value={access.accessCode}
              onChange={(e) => setAccess({ ...access, accessCode: e.target.value })}
            />
          </div>

          <Button disabled={busy} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 w-full">
            {busy ? 'Verifying Credentials…' : 'Check Application Status →'}
          </Button>

          <div className="access-code-recovery pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Lost your access code?</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email used on application"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!access.applicationId || !recoveryEmail}
                onClick={requestAccessCode}
                className="shrink-0 text-xs"
              >
                Request Recovery
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* RESEARCH MATE PORTAL VIEW                                                 */}
      {/* ========================================================================= */}
      {researchMateDetails && (
        <section className="card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm bg-white space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> Research Mate
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">{researchMateDetails.applicationId}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{researchMateDetails.name}</h2>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Project:</strong> {researchMateDetails.researchTitle} · <strong>Wing:</strong> {researchMateDetails.wingName}
              </p>
            </div>

            <div>
              {researchMateDetails.status === 'pending' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" /> Stage 1: Under Review
                </span>
              )}
              {researchMateDetails.status === 'stage1_approved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  <Sparkles className="w-3.5 h-3.5" /> Stage 1 Approved — Verification Pending
                </span>
              )}
              {researchMateDetails.status === 'payment_submitted' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  <Clock className="w-3.5 h-3.5" /> Payment Submitted — Pending Final Approval
                </span>
              )}
              {researchMateDetails.status === 'approved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved &amp; Enrolled
                </span>
              )}
            </div>
          </div>

          {/* STATUS 1: PENDING STAGE 1 REVIEW */}
          {researchMateDetails.status === 'pending' && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
              <h3 className="font-bold text-base text-amber-950 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Stage 1 Review in Progress
              </h3>
              <p className="text-sm leading-relaxed text-amber-800">
                Your application to join <strong>{researchMateDetails.researchTitle}</strong> as a Research Mate has been received and is currently being evaluated by our Academic Wing review committee.
              </p>
              <p className="text-xs text-amber-700">
                When your Stage 1 application is approved, your Private Access Code will unlock Stage 2 verification (BDT 1,000 project onboarding) and access to the project WhatsApp group.
              </p>
            </div>
          )}

          {/* STATUS 2: STAGE 1 APPROVED -> 2-STEP VERIFICATION & BDT 1,000 PAYMENT */}
          {researchMateDetails.status === 'stage1_approved' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base text-emerald-950">Congratulations! Stage 1 Application Approved</h3>
                </div>
                <p className="text-sm text-emerald-800">
                  You have successfully passed Stage 1 review for <strong>{researchMateDetails.researchTitle}</strong>. Please continue to 2-step verification below to complete your BDT 1,000 onboarding payment.
                </p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-700" />
                      Stage 2 Verification: Project Onboarding Fee
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Fixed One-Time Research Project Fee: <strong className="text-slate-900 text-sm">৳1,000 BDT</strong>
                    </p>
                  </div>
                  <span className="badge badge-yellow text-xs font-semibold">Payment Required</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {researchMateDetails.paymentInstructions || 'Send BDT 1,000 via bKash or Nagad Personal (Send Money) to our official number, then enter your sender phone number and Transaction ID (TrxID) below.'}
                </p>

                {/* Method selector tabs */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${paymentMethod === 'bKash' ? 'bg-[#e2136e] text-white border-[#e2136e]' : 'bg-white text-slate-700 border-slate-300'}`}
                    onClick={() => setPaymentMethod('bKash')}
                  >
                    bKash Personal
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${paymentMethod === 'Nagad' ? 'bg-[#f7941d] text-white border-[#f7941d]' : 'bg-white text-slate-700 border-slate-300'}`}
                    onClick={() => setPaymentMethod('Nagad')}
                  >
                    Nagad Personal
                  </button>
                </div>

                {/* Official Number Box */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Official {paymentMethod} Number:</span>
                    <span className="font-mono text-base font-bold text-slate-900">
                      {paymentMethod === 'bKash' ? researchMateDetails.bkashNumber : researchMateDetails.nagadNumber}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => copyPaymentNumber()}
                    className="text-xs flex items-center gap-1"
                  >
                    {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedNumber ? 'Copied' : 'Copy Number'}
                  </Button>
                </div>

                {/* Form to submit TrxID */}
                <form className="space-y-4 pt-2" onSubmit={submitResearchMatePayment}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
                        Sender Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. 01711223344"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
                        Transaction ID (TrxID) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. 9B38K120LA"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={busy}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-lg w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {busy ? 'Submitting Payment…' : 'Submit TrxID for Final Approval →'}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* STATUS 3: PAYMENT SUBMITTED — PENDING FINAL APPROVAL */}
          {researchMateDetails.status === 'payment_submitted' && (
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600 shrink-0" />
                <h3 className="font-bold text-lg text-purple-950">Payment Submitted — Pending Final Approval</h3>
              </div>
              <p className="text-sm text-purple-800 leading-relaxed">
                Your BDT 1,000 onboarding payment details have been submitted. An administrator is currently verifying your Transaction ID (<strong>{researchMateDetails.trxId}</strong>).
              </p>
              <div className="p-3 bg-white/70 border border-purple-200 rounded-lg text-xs space-y-1">
                <p>• <strong>Payment Method:</strong> {researchMateDetails.paymentMethod}</p>
                <p>• <strong>Transaction ID:</strong> <span className="font-mono font-bold">{researchMateDetails.trxId}</span></p>
                <p>• <strong>Next Step:</strong> Once verified, your status will update to <strong>Approved</strong> and your custom project WhatsApp group joining link will be available right here.</p>
              </div>
            </div>
          )}

          {/* STATUS 4: APPROVED — DYNAMIC WHATSAPP GROUP LINK */}
          {researchMateDetails.status === 'approved' && (
            <div className="space-y-6">
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-emerald-900">Research Mate Registration Approved!</h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Your BDT 1,000 project fee has been confirmed. You are officially enrolled in <strong>{researchMateDetails.researchTitle}</strong>.
                    </p>
                  </div>
                </div>

                {/* WhatsApp Group Joining Card */}
                <div className="p-5 bg-white border border-emerald-300 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <MessageSquare className="w-5 h-5 text-[#25D366]" />
                    <h4 className="font-bold text-base">Official Project WhatsApp Coordination Group</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Join your project coordination group to connect with faculty supervisors, research leads, young scholars, and fellow research mates. Weekly syncs and research tasks are coordinated through this channel.
                  </p>

                  <div className="pt-2">
                    {researchMateDetails.whatsAppGroupLink ? (
                      <a
                        href={researchMateDetails.whatsAppGroupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm rounded-xl shadow-md transition-all transform hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-4 h-4 fill-white" />
                        Join WhatsApp Group →
                      </a>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                        The administrator is currently assigning the specific WhatsApp group for your cohort. Please check back shortly or check your email.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
              onClick={() => {
                setResearchMateDetails(null);
                setDetails(null);
              }}
            >
              ← Check another application
            </button>
            <Link to="/wings" className="text-xs text-teal-700 hover:text-teal-900 font-medium">
              Explore Academic Wings →
            </Link>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* LEGACY / FELLOWSHIP MEMBERSHIP VIEW                                       */}
      {/* ========================================================================= */}
      {details && (
        <section className="card membership-status-card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm bg-white" style={{ marginTop: 20 }}>
          <div className="section-head">
            <div>
              <h2>{details.name}</h2>
              <p className="muted">{categoryLabel} · {details.wing} · {details.email}</p>
            </div>
            <span className="badge badge-green">{details.status.replaceAll('_', ' ')}</span>
          </div>

          <button className="notification-bell applicant-notification-trigger" type="button" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
            <Bell size={18} aria-hidden="true"/> Notifications {details.notifications.some((notice) => !notice.readAt) && <span className="notification-count">{details.notifications.filter((notice) => !notice.readAt).length}</span>}
          </button>

          {notificationsOpen && (
            <section className="applicant-notifications">
              <h3>Notification center</h3>
              {details.notifications.length === 0 && <p className="muted">No notifications yet.</p>}
              {details.notifications.map((notice) => (
                <button type="button" className={`notification-item ${notice.readAt ? '' : 'unread'}`} key={notice._id} onClick={() => void openNotification(notice)}>
                  <span className="notification-unread-dot" aria-hidden="true"/>
                  <span><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></span>
                </button>
              ))}
              {selectedNotification && (
                <article className="notification-detail">
                  <strong>{selectedNotification.title}</strong>
                  <p>{selectedNotification.body}</p>
                  {selectedNotification.activationCode && (
                    <div className="activation-code-box">
                      <p>One-time Secret Activation Code</p>
                      <code>{selectedNotification.activationCode}</code>
                    </div>
                  )}
                  <small>{new Date(selectedNotification.createdAt).toLocaleString()}</small>
                </article>
              )}
            </section>
          )}

          {details.status === 'initial_pending' && <p>Your initial application is pending review. We’ll notify you when it is reviewed.</p>}

          {details.status === 'membership_pending' && (
            <>
              <h3>Congratulations — your {categoryLabel} application is approved!</h3>
              <h3>Stage 2: Complete your academic profile</h3>
              <form className="form" onSubmit={submitProfile}>
                <p className="text-sm text-slate-600 mb-4">Joining ASPIER is completely free across all stages. Please complete your academic profile and upload a photo to finalize your membership.</p>
                <label>Full name<Input required value={profile.name} onChange={(event) => set('name', event.target.value)}/></label>
                <label>Present address<textarea className="textarea" rows={2} required value={profile.presentAddress} onChange={(event) => set('presentAddress', event.target.value)}/></label>
                <label>Permanent address<textarea className="textarea" rows={2} required value={profile.permanentAddress} onChange={(event) => set('permanentAddress', event.target.value)}/></label>
                <label>Current profession / designation<Input required placeholder="Professor, Researcher, Student…" value={profile.designation} onChange={(event) => set('designation', event.target.value)}/></label>
                <label>University / institution<Input required value={profile.institution} onChange={(event) => set('institution', event.target.value)}/></label>
                <label>Educational background<textarea className="textarea" rows={4} required placeholder="Degrees and institutions" value={profile.educationalBackground} onChange={(event) => set('educationalBackground', event.target.value)}/></label>
                <label>Google Scholar profile URL<Input type="url" value={profile.googleScholar} onChange={(event) => set('googleScholar', event.target.value)}/></label>
                <label>ResearchGate profile URL<Input type="url" value={profile.researchGate} onChange={(event) => set('researchGate', event.target.value)}/></label>
                <label>ORCID<Input value={profile.orcid} onChange={(event) => set('orcid', event.target.value)}/></label>
                <label>LinkedIn profile URL<Input type="url" value={profile.linkedin} onChange={(event) => set('linkedin', event.target.value)}/></label>
                <label>Short research bio<textarea className="textarea" rows={5} required minLength={20} value={profile.bio} onChange={(event) => set('bio', event.target.value)}/></label>
                <label>Research domains (comma-separated)<Input required placeholder="Environmental science, GIS…" value={profile.researchDomains} onChange={(event) => set('researchDomains', event.target.value)}/></label>
                <label>Profile picture
                  <ImageUploader
                    value={profile.photo}
                    onUploaded={(url) => set('photo', url)}
                    helperText="Recommended: 400 × 400 px, 1:1 Square, Max 2MB"
                    maxSizeMB={2}
                    endpoint={`/public/membership/${details.applicationId}/photo`}
                    headers={{ 'X-Application-Code': access.accessCode }}
                  />
                </label>
                <Button disabled={busy || !profile.photo}>{busy ? 'Submitting…' : 'Submit Final Application'}</Button>
                {!profile.photo && <span className="muted">Upload a profile picture to submit the final application.</span>}
              </form>
            </>
          )}

          {details.status === 'final_pending' && <p>Your final academic application has been submitted. The ASPIER team will review it and notify you when it is accepted or needs changes.</p>}

          {details.status === 'verification_pending' && <p>Your academic profile has been submitted. An administrator will review it before publishing your profile to the ASPIER Team.</p>}
          {details.status === 'published' && <><p>Your profile is approved and published on the ASPIER Team page.</p><Link to="/team">View ASPIER Team</Link></>}
          {details.status === 'rejected' && <p>This application was not approved. Contact ASPIER if you need more information.</p>}
          <button className="button button-secondary" type="button" style={{ marginTop: 16 }} onClick={() => setDetails(null)}>Check another application</button>
        </section>
      )}
    </main>
  );
}
