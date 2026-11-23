import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Bell,
  Orbit,
  X,
  Lock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  CreditCard,
  MessageSquare,
  ExternalLink,
  Sparkles,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

type ApplicantNotice = {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

type ApplicantData = {
  notifications: ApplicantNotice[];
  applicationId: string;
  name: string;
  email: string;
  role: 'supervisor' | 'youngScholar';
  wing: string;
  status: string;
};

type ResearchMateData = {
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
  wingSlug?: string;
  researchTitle: string;
  skills: string;
  statement?: string;
  status: 'pending' | 'stage1_approved' | 'payment_submitted' | 'approved' | 'rejected' | string;
  paymentAmount: number;
  paymentMethod?: string;
  paymentSenderPhone?: string;
  trxId?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  paymentInstructions?: string;
  whatsAppGroupLink?: string;
  createdAt: string;
};

type TotpSetup = { qrDataUrl: string; manualKey: string };
type WingOption = { _id: string; name: string; isActive: boolean };
type Mode = 'signup' | 'check';
type LoginStep = 'credentials' | 'setup' | 'otp';
type SignupForm = { name: string; email: string; phone: string; password: string; confirmPassword: string; role: 'supervisor' | 'youngScholar'; wing: string; institution: string; academicStatus: string };

const initialSignup: SignupForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'youngScholar', wing: '', institution: '', academicStatus: '' };
const formatElapsed = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export function PublicApplicantBell({ onOpenChange }: { onOpenChange?: (open: boolean) => void } = {}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const bellRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('check');
  const [signup, setSignup] = useState(initialSignup);
  const [wings, setWings] = useState<WingOption[]>([]);
  const [pendingAt, setPendingAt] = useState<number | null>(() => {
    const saved = Number(sessionStorage.getItem('aspier-signup-pending-at'));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });
  const [now, setNow] = useState(Date.now());
  const [applicationId, setApplicationId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [data, setData] = useState<ApplicantData | null>(null);
  const [researchMateData, setResearchMateData] = useState<ResearchMateData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [signupError, setSignupError] = useState('');
  const [loginError, setLoginError] = useState('');
  const unreadCount = data?.notifications.filter((notice) => !notice.readAt).length || 0;

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);


  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      if (bellRef.current && !bellRef.current.contains(target) && !target.closest?.('.notification-popover')) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    const closeByMenu = () => setOpen(false);
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside);
    document.addEventListener('keydown', closeEscape);
    window.addEventListener('aspier-notifications-close', closeByMenu);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      window.removeEventListener('aspier-notifications-close', closeByMenu);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    void api.get('/public/wings').then((response) => {
      setWings((response.data.data as WingOption[]).filter((wing) => wing.isActive !== false));
    }).catch(() => toast.error('Could not load Wings. Please try again.'));
    return () => window.clearInterval(timer);
  }, [open]);

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSignupError('');
    if (signup.password !== signup.confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = signup;
      const response = await api.post('/public/membership/signup', payload);
      const submittedAt = new Date(response.data.data.createdAt).getTime();
      setPendingAt(submittedAt);
      sessionStorage.setItem('aspier-signup-pending-at', String(submittedAt));
      toast.success('Sign-up submitted for review.');
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Could not submit sign-up.');
      setSignupError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const copyPaymentNumber = async () => {
    const num = (paymentMethod === 'bKash' ? researchMateData?.bkashNumber : researchMateData?.nagadNumber) || '01603012448';
    try {
      await navigator.clipboard.writeText(num);
      setCopiedNumber(true);
      toast.success('Payment number copied to clipboard!');
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {
      toast.error('Could not copy number.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchMateData) return;
    if (!trxId.trim() || trxId.trim().length < 4) {
      toast.error('Please enter a valid Transaction ID (TrxID).');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const res = await api.post('/public/research-applications/payment', {
        applicationId: researchMateData.applicationId,
        accessCode: accessCode.trim(),
        paymentMethod,
        senderPhone: senderPhone.trim(),
        trxId: trxId.trim()
      });
      setResearchMateData({
        ...researchMateData,
        status: res.data.data.status || 'payment_submitted',
        paymentMethod,
        paymentSenderPhone: senderPhone.trim(),
        trxId: trxId.trim()
      });
      toast.success('Payment details submitted successfully! Awaiting admin verification.');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to submit payment details.'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const clearResearchMate = () => {
    setResearchMateData(null);
    setSenderPhone('');
    setTrxId('');
    setLoginError('');
  };

  const applicantLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setBusy(true);

    const appId = applicationId.trim().toUpperCase();
    const code = accessCode.trim();

    // Check if ID pattern is Research Mate (contains RM or begins with ASPIER-RM)
    const isLikelyResearchMate = appId.includes('RM');

    if (isLikelyResearchMate) {
      try {
        const response = await api.post('/public/research-applications/lookup', {
          applicationId: appId,
          accessCode: code
        });
        setResearchMateData(response.data.data);
        setData(null);
        setLoginError('');
        toast.success('Research Mate application retrieved successfully.');
        setBusy(false);
        return;
      } catch (err: any) {
        const message = getApiErrorMessage(err, 'Could not find Research Mate application. Please verify your Application ID and Private Access Code.');
        setLoginError(message);
        toast.error(message);
        setBusy(false);
        return;
      }
    }

    try {
      const response = await api.post('/public/membership/applicant-login', {
        applicationId: appId,
        accessCode: code,
        ...(loginStep !== 'credentials' && totpCode ? { totpCode } : {})
      });
      const result = response.data.data;
      if (result.requiresSetup) {
        setTotpSetup({ qrDataUrl: result.qrDataUrl, manualKey: result.manualKey });
        setLoginStep('setup');
        return;
      }
      if (result.requiresOtp) {
        setLoginStep('otp');
        return;
      }
      if (result.authenticated) {
        setData(result as ApplicantData);
        setResearchMateData(null);
        setTotpSetup(null);
        setLoginStep('credentials');
        setTotpCode('');
      }
    } catch (error: any) {
      // Fallback: If membership login failed, attempt research application lookup in case user has a custom ID
      try {
        const fallbackRes = await api.post('/public/research-applications/lookup', {
          applicationId: appId,
          accessCode: code
        });
        setResearchMateData(fallbackRes.data.data);
        setData(null);
        setLoginError('');
        toast.success('Research Mate application retrieved.');
        setBusy(false);
        return;
      } catch {
        const message = getApiErrorMessage(error, 'Could not verify applicant credentials. Please check your Application ID and Private Access Code.');
        setLoginError(message);
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const markRead = (id: string) => {
    setData((current) => current ? {
      ...current,
      notifications: current.notifications.map((notice) => notice._id === id ? { ...notice, readAt: new Date().toISOString() } : notice)
    } : current);
  };

  const signOut = () => {
    setData(null);
    setResearchMateData(null);
    setTotpSetup(null);
    setTotpCode('');
    setLoginStep('credentials');
  };
  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      toast.success('Copied!');
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      toast.error('Could not copy.');
    }
  };

  const renderResearchMateView = () => {
    if (!researchMateData) return null;
    const isStage1Approved = researchMateData.status === 'stage1_approved';
    const isPaymentSubmitted = researchMateData.status === 'payment_submitted';
    const isApproved = researchMateData.status === 'approved' || researchMateData.status === 'active';
    const isPending = researchMateData.status === 'pending';
    const isRejected = researchMateData.status === 'rejected';

    const officialNumber = (paymentMethod === 'bKash' ? researchMateData.bkashNumber : researchMateData.nagadNumber) || '01603012448';

    return (
      <div className="p-4 space-y-3.5 overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(78vh - 60px)' : '480px' }}>
        {/* Header Summary Card */}
        <div className="p-3 bg-teal-50/90 border border-teal-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-teal-800 font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Research Mate Application
            </span>
            <span className="font-mono text-[11px] font-bold text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-200">
              {researchMateData.applicationId}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">{researchMateData.name}</h4>
          <p className="text-xs text-slate-600 leading-snug">
            <strong>Project:</strong> {researchMateData.researchTitle}
          </p>
          <p className="text-xs text-slate-500 leading-snug">
            <strong>Wing:</strong> {researchMateData.wingName}
          </p>
        </div>

        {/* STATUS: PENDING */}
        {isPending && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Stage 1: Under Faculty Review</span>
            </div>
            <p className="leading-relaxed">
              Your application is being evaluated by the academic wing committee. Once approved, you will be notified to complete Stage 2 verification.
            </p>
          </div>
        )}

        {/* STATUS: STAGE 1 APPROVED (Awaiting BDT 1,000 Payment) */}
        {isStage1Approved && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 mb-1">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Stage 1 Approved — Ready for Onboarding</span>
              </div>
              <p className="leading-relaxed">
                Congratulations! You are accepted to collaborate on <strong>{researchMateData.researchTitle}</strong>. Complete Stage 2 project verification below:
              </p>
            </div>

            {/* BDT 1,000 Payment Card */}
            <form onSubmit={handlePaymentSubmit} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                  Stage 2: Project Fee (BDT 1,000)
                </h5>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  BDT 1,000
                </span>
              </div>

              {/* Method Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Select Payment Method:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bKash')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      paymentMethod === 'bKash'
                        ? 'bg-[#D12053] text-white border-[#D12053]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    bKash (Send Money)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Nagad')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      paymentMethod === 'Nagad'
                        ? 'bg-[#F7941D] text-white border-[#F7941D]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Nagad (Send Money)
                  </button>
                </div>
              </div>

              {/* Official Number with Copy Button */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">{paymentMethod} Personal Number</span>
                  <strong className="font-mono text-sm text-slate-900 tracking-wide">{officialNumber}</strong>
                </div>
                <button
                  type="button"
                  onClick={copyPaymentNumber}
                  className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded border transition-colors ${
                    copiedNumber ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  {copiedNumber ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedNumber ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Sender Phone & TrxID */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Sender Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="tel"
                    placeholder="e.g. 01711223344"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Transaction ID (TrxID) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. BL9A8BC1X7"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                    className="font-mono text-xs bg-white uppercase"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                {isSubmittingPayment ? 'Submitting Payment…' : 'Submit Payment Details'}
              </Button>
            </form>
          </div>
        )}

        {/* STATUS: PAYMENT SUBMITTED (Verification Pending) */}
        {isPaymentSubmitted && (
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs text-purple-950">
            <div className="flex items-center gap-1.5 font-bold text-purple-900">
              <CreditCard className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Payment Submitted — Verification Pending</span>
            </div>
            <p className="leading-relaxed text-purple-900">
              Your BDT 1,000 payment details have been submitted.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-purple-200 space-y-1 font-mono text-[11px]">
              <div><span className="text-slate-500 font-sans">Method:</span> <strong>{researchMateData.paymentMethod || paymentMethod}</strong></div>
              <div><span className="text-slate-500 font-sans">Sender:</span> <strong>{researchMateData.paymentSenderPhone || senderPhone || '—'}</strong></div>
              <div><span className="text-slate-500 font-sans">TrxID:</span> <strong className="text-purple-800">{researchMateData.trxId || trxId}</strong></div>
            </div>
            <p className="text-[11px] text-purple-800">
              Once an administrator verifies your transaction, your official WhatsApp Group link will appear here.
            </p>
          </div>
        )}

        {/* STATUS: APPROVED (Final Approved with WhatsApp Link) */}
        {isApproved && (
          <div className="space-y-3">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Final Approved &amp; Enrolled!</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                Your BDT 1,000 onboarding payment has been verified. Welcome to the <strong>{researchMateData.researchTitle}</strong> research team!
              </p>
            </div>

            <div className="p-3.5 bg-white border border-emerald-200 rounded-xl shadow-sm text-center space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Official Project WhatsApp Group
              </span>
              <p className="text-xs text-slate-600">
                Join your dedicated research project group to collaborate directly with supervisors and teammates.
              </p>
              <a
                href={researchMateData.whatsAppGroupLink || 'https://chat.whatsapp.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-md transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                Join WhatsApp Group
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
            </div>
          </div>
        )}

        {/* STATUS: REJECTED */}
        {isRejected && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
            <strong>Application Not Selected:</strong>
            <p className="leading-relaxed">
              Thank you for your interest. Unfortunately, this project position has been filled. We encourage you to apply for other academic wings and projects.
            </p>
          </div>
        )}

        {/* Switch / Reset Button */}
        <Button
          type="button"
          variant="secondary"
          className="w-full text-xs py-2"
          onClick={clearResearchMate}
        >
          Check Another Application ID
        </Button>
      </div>
    );
  };

  return <div className="notification-bell-wrap public-applicant-bell" ref={bellRef}>
    <button className="notification-bell" type="button" aria-label={`${unreadCount} unread applicant notifications`} aria-expanded={open} onClick={() => {
      const next = !open;
      setOpen(next);
      onOpenChange?.(next);
    }}>
      <Bell size={20}/>{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
    </button>
    {open && (isMobile ? createPortal(
      <>
      <button type="button" className="notification-mobile-backdrop" aria-label="Close applicant notifications" onClick={() => setOpen(false)} tabIndex={-1}/>
      <section className="notification-popover public-applicant-popover" role="dialog" aria-modal="true" aria-label="Applicant notifications">
        <div className="notification-popover-head">
          <div className="notification-title">
            <strong>Applicant Notifications</strong>
            {unreadCount > 0 && <span className="notification-header-count">{unreadCount}</span>}
          </div>
          <div className="notification-header-actions">
            {(data || researchMateData) && (
              <button
                type="button"
                className="notification-switch-button"
                onClick={() => {
                  setData(null);
                  setResearchMateData(null);
                  setMode('check');
                }}
              >
                Switch / Check Another ID
              </button>
            )}
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18}/></button>
          </div>
        </div>

        {researchMateData ? (
          renderResearchMateView()
        ) : data ? (
          <div className="notification-detail-view p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(78vh - 60px)' }}>
            <div className="applicant-login-summary p-3 bg-teal-50 border border-teal-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-teal-800 font-bold text-sm mb-0.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{data.name}</span>
              </div>
              <div className="text-xs text-slate-600 flex items-center justify-between">
                <span>{data.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor'} · {data.wing}</span>
                <span className="badge badge-green text-[10px] px-2 py-0.5 font-bold uppercase">{data.status.replaceAll('_', ' ')}</span>
              </div>
            </div>

            {data.status === 'published' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                <p><strong>Profile Published!</strong> Your ASPIER account is active. Use your Secret Activation Code from notifications below to complete account activation.</p>
                <Link to="/login" onClick={() => setOpen(false)} className="button button-primary w-full text-center text-xs py-2 block">
                  Activate Member Account
                </Link>
              </div>
            )}

            <div className="notification-list space-y-2">
              <strong className="text-xs uppercase tracking-wider text-slate-500 block mb-1">Your Notifications</strong>
              {data.notifications.map((notice) => (
                <button type="button" key={notice._id} className={`notification-item ${notice.readAt ? '' : 'unread'}`} onClick={() => markRead(notice._id)}>
                  <span className="notification-unread-dot" aria-hidden="true"/>
                  <span>
                    <strong>{notice.title}</strong>
                    <small>{new Date(notice.createdAt).toLocaleString()}</small>
                    <small>{notice.body}</small>
                  </span>
                </button>
              ))}
              {data.notifications.length === 0 && <p className="muted text-xs p-3 text-center">No notifications yet.</p>}
            </div>

            <Button type="button" variant="secondary" className="w-full text-xs" onClick={signOut}>
              Sign out of Applicant View
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(78vh - 60px)' }}>
            <div className="applicant-tabs" role="tablist" aria-label="Applicant access">
              <button
                role="tab"
                aria-selected={mode === 'check'}
                className={`tab ${mode === 'check' ? 'active' : ''}`}
                type="button"
                onClick={() => setMode('check')}
              >
                Check Application
              </button>
              <button
                role="tab"
                aria-selected={mode === 'signup'}
                className={`tab ${mode === 'signup' ? 'active' : ''}`}
                type="button"
                onClick={() => setMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* STEP 2: CHECK APPLICATION (VERIFICATION GATE) */}
            {mode === 'check' && (
              <form className="form applicant-login-form p-4 space-y-3" onSubmit={applicantLogin}>
                <div className="p-3 bg-teal-50/80 border border-teal-200/90 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Application Verification Gate:</strong>
                    <p className="mt-0.5 leading-relaxed text-teal-800">
                      Enter the admin-issued <strong>Application ID</strong> and <strong>Private Access Code</strong> received upon approval to verify your status.
                    </p>
                  </div>
                </div>

                {loginError && <p className="applicant-error-message text-xs p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200" role="alert">{loginError}</p>}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Application ID</label>
                  <Input
                    required
                    autoComplete="username"
                    className="notification-form-input text-sm"
                    placeholder="e.g. ASPIER-2026-XXXX"
                    value={applicationId}
                    onChange={(event) => setApplicationId(event.target.value)}
                  />
                </div>
                <div className="notification-copy-row">
                  <code className="notification-code-box text-xs">{applicationId || 'Application ID will appear here'}</code>
                  {applicationId && <button type="button" onClick={() => void copyText(applicationId, 'application-id')}>{copied === 'application-id' ? 'Copied!' : 'Copy'}</button>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Private Access Code</label>
                  <Input
                    required
                    autoComplete="current-password"
                    className="notification-form-input text-sm"
                    placeholder="Private 24-character code"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                  />
                </div>
                <div className="notification-copy-row">
                  <code className="notification-code-box break-all text-xs">{accessCode || 'Private Access Code will appear here'}</code>
                  {accessCode && <button type="button" onClick={() => void copyText(accessCode, 'access-code')}>{copied === 'access-code' ? 'Copied!' : 'Copy'}</button>}
                </div>

                {loginStep === 'setup' && totpSetup && (
                  <div className="applicant-totp-setup p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <h3 className="font-bold text-slate-900 mb-1">Set up Google Authenticator</h3>
                    <p className="text-slate-600 mb-2">Scan the QR code in Google Authenticator, then enter its current six-digit code to bind 2FA.</p>
                    <img src={totpSetup.qrDataUrl} alt="Google Authenticator setup QR code" className="mx-auto my-2 rounded border border-slate-200 w-36 h-36" />
                    <label className="block mt-2">Manual setup key: <code className="block mt-1 font-mono">{totpSetup.manualKey}</code></label>
                  </div>
                )}

                {loginStep === 'otp' && <p className="text-xs text-slate-600">Enter the current 6-digit code from Google Authenticator.</p>}

                {loginStep !== 'credentials' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">6-digit authenticator code</label>
                    <Input
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                    />
                  </div>
                )}

                <Button className="notification-submit-button w-full font-semibold" disabled={busy}>
                  {busy ? 'Verifying…' : loginStep === 'credentials' ? 'Verify Credentials' : 'Verify & Continue'}
                </Button>

                <p className="text-xs text-slate-500 pt-2 text-center border-t border-slate-100">
                  Haven't applied yet?{' '}
                  <Link to="/apply" onClick={() => setOpen(false)} className="text-teal-700 font-semibold underline">
                    Submit initial application (/apply)
                  </Link>
                </p>
              </form>
            )}

            {/* 3-STEP GATED ONBOARDING FLOW (WHEN SIGN UP IS CLICKED) */}
            {mode === 'signup' && (
              <div className="mobile-gated-workflow p-4 space-y-3.5">
                {/* Step 1: Submit Application First */}
                <div className="step-card p-3.5 rounded-xl border border-teal-200 bg-teal-50/70">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    <h3 className="font-bold text-xs text-teal-950 uppercase tracking-wide">Step 1: Submit Application First</h3>
                  </div>
                  <p className="text-xs text-teal-900 leading-relaxed mb-2.5">
                    Applicants cannot sign up directly without submitting an initial application. Apply first as a Research Supervisor or Young Scholar.
                  </p>
                  <Link
                    to="/apply"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all text-center"
                  >
                    <span>Apply to Join ASPIER (/apply)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Step 2: Check Application & Enter Credentials */}
                <div className="step-card p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Step 2: Check Application &amp; Verify</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                    Already applied? Enter your admin-issued <strong>Application ID</strong> and <strong>Private Access Code</strong> in the Check Application gate to verify your account status.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMode('check')}
                    className="w-full text-xs py-1.5"
                  >
                    Go to Check Application Gate
                  </Button>
                </div>

                {/* Step 3: Account Creation Gated */}
                <div className="step-card p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">Step 3: Account Sign-Up (Locked)</h3>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Account creation is locked until your Application ID and Private Access Code are verified and confirmed by the Admin Panel.
                  </p>
                </div>

                {pendingAt && (
                  <div className="applicant-pending card p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-center justify-between" role="status">
                    <div className="flex items-center gap-2">
                      <Orbit size={18} className="text-blue-600 shrink-0 animate-spin" />
                      <span>Review in progress: {formatElapsed(Math.max(0, Math.floor((now - pendingAt) / 1000)))}</span>
                    </div>
                    <button
                      type="button"
                      className="text-blue-700 underline font-semibold text-[11px]"
                      onClick={() => { setPendingAt(null); sessionStorage.removeItem('aspier-signup-pending-at'); }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
      </>,
      document.body
    ) : (
      <section className="notification-popover public-applicant-popover" role="dialog" aria-modal="true" aria-label="Applicant notifications">
        <div className="notification-popover-head">
          <div className="notification-title">
            <strong>Applicant Notifications</strong>
            {unreadCount > 0 && <span className="notification-header-count">{unreadCount}</span>}
          </div>
          <div className="notification-header-actions">
            {(data || researchMateData) && (
              <button
                type="button"
                className="notification-switch-button"
                onClick={() => {
                  setData(null);
                  setResearchMateData(null);
                  setMode('check');
                }}
              >
                Switch / Check Another ID
              </button>
            )}
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18}/></button>
          </div>
        </div>

        {researchMateData ? (
          renderResearchMateView()
        ) : data ? (
          <div className="p-4 space-y-3">
            <div className="applicant-login-summary">
              <strong>{data.name}</strong>
              <span>{data.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor'} · {data.wing}</span>
              <span className="badge badge-green">{data.status.replaceAll('_', ' ')}</span>
            </div>
            <div className="notification-list">
              {data.notifications.map((notice) => (
                <button type="button" key={notice._id} className={`notification-item ${notice.readAt ? '' : 'unread'}`} onClick={() => markRead(notice._id)}>
                  <span className="notification-unread-dot" aria-hidden="true"/>
                  <span>
                    <strong>{notice.title}</strong>
                    <small>{new Date(notice.createdAt).toLocaleString()}</small>
                    <small>{notice.body}</small>
                  </span>
                </button>
              ))}
            </div>
            {data.notifications.length === 0 && <p className="muted">No notifications yet.</p>}
            <Button type="button" variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        ) : (
          <div className="notification-desktop-content">
            <div className="applicant-tabs" role="tablist" aria-label="Applicant access">
              <button role="tab" aria-selected={mode === 'check'} className={`tab ${mode === 'check' ? 'active' : ''}`} type="button" onClick={() => setMode('check')}>Check Application</button>
              <button role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'active' : ''}`} type="button" onClick={() => setMode('signup')}>Sign Up</button>
            </div>
            {mode === 'check' && (
              <form className="form applicant-login-form p-4 space-y-3" onSubmit={applicantLogin}>
                <div className="p-3 bg-teal-50/80 border border-teal-200/90 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Application Verification Gate:</strong>
                    <p className="mt-0.5 leading-relaxed text-teal-800">
                      Enter your admin-issued <strong>Application ID</strong> and <strong>Private Access Code</strong> to verify status.
                    </p>
                  </div>
                </div>

                {loginError && <p className="applicant-error-message text-xs p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200" role="alert">{loginError}</p>}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Application ID</label>
                  <Input
                    required
                    autoComplete="username"
                    className="notification-form-input text-sm"
                    placeholder="e.g. ASPIER-RM-2026-XXXX"
                    value={applicationId}
                    onChange={(event) => setApplicationId(event.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Private Access Code</label>
                  <Input
                    required
                    autoComplete="current-password"
                    className="notification-form-input text-sm"
                    placeholder="Private 24-character code"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                  />
                </div>

                {loginStep === 'setup' && totpSetup && (
                  <div className="applicant-totp-setup p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <h3 className="font-bold text-slate-900 mb-1">Set up Google Authenticator</h3>
                    <p className="text-slate-600 mb-2">Scan the QR code in Google Authenticator, then enter its current six-digit code to bind 2FA.</p>
                    <img src={totpSetup.qrDataUrl} alt="Google Authenticator setup QR code" className="mx-auto my-2 rounded border border-slate-200 w-36 h-36" />
                    <label className="block mt-2">Manual setup key: <code className="block mt-1 font-mono">{totpSetup.manualKey}</code></label>
                  </div>
                )}

                {loginStep === 'otp' && <p className="text-xs text-slate-600">Enter the current 6-digit code from Google Authenticator.</p>}

                {loginStep !== 'credentials' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">6-digit authenticator code</label>
                    <Input
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                    />
                  </div>
                )}

                <Button className="notification-submit-button w-full font-semibold" disabled={busy}>
                  {busy ? 'Verifying…' : 'Verify Credentials'}
                </Button>

                <p className="text-xs text-slate-500 pt-2 text-center border-t border-slate-100">
                  Haven&apos;t applied yet?{' '}
                  <Link to="/apply" onClick={() => setOpen(false)} className="text-teal-700 font-semibold underline">
                    Submit initial application (/apply)
                  </Link>
                </p>
              </form>
            )}

            {mode === 'signup' && (
              <div className="p-4 space-y-3">
                <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/70 text-xs text-teal-950 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    <strong className="uppercase">Step 1: Submit Application First</strong>
                  </div>
                  <p className="text-teal-900 leading-relaxed">
                    Direct sign-up is locked. Please submit an application as a Supervisor, Young Scholar, or Research Mate first.
                  </p>
                  <Link
                    to="/apply"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                  >
                    Apply to Join ASPIER (/apply) <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                    <strong className="uppercase text-slate-900">Step 2: Check Application</strong>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Already applied? Enter your Application ID and Access Code in the Check Application gate.
                  </p>
                  <Button type="button" variant="secondary" onClick={() => setMode('check')} className="w-full text-xs py-1.5">
                    Go to Check Application Gate
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    ))}
  </div>;
}
