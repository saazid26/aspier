import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Clock,
  CreditCard,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
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
  activationCode?: string;
  notifications: Array<{
    _id: string;
    title: string;
    body: string;
    createdAt: string;
    readAt?: string;
    activationCode?: string;
  }>;
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
    return stored
      ? (JSON.parse(stored) as { applicationId: string; accessCode: string })
      : { applicationId: '', accessCode: '' };
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
    name: '',
    presentAddress: '',
    permanentAddress: '',
    designation: '',
    institution: '',
    educationalBackground: '',
    googleScholar: '',
    researchGate: '',
    orcid: '',
    linkedin: '',
    bio: '',
    researchDomains: '',
    photo: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PortalData['notifications'][number] | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

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

  const copyAppId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      toast.success('Application ID copied to clipboard!');
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      toast.error('Could not access clipboard.');
    }
  };

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
      } catch {
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
    } catch {
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
        researchDomains: profile.researchDomains
          .split(',')
          .map((domain) => domain.trim())
          .filter(Boolean)
      });
      setDetails({ ...details, status: response.data.data.status });
      toast.success('Final academic profile submitted for review.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit membership profile');
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
        senderPhone: senderPhone.trim(),
        trxId: trxId.trim()
      });
      setResearchMateDetails({
        ...researchMateDetails,
        status: response.data.data.status,
        paymentMethod,
        paymentSenderPhone: senderPhone.trim(),
        trxId: trxId.trim()
      });
      toast.success('Payment submitted! Awaiting administrator verification.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit payment details.');
    } finally {
      setBusy(false);
    }
  };

  const copyPaymentNumber = async () => {
    const number =
      (paymentMethod === 'bKash'
        ? researchMateDetails?.bkashNumber
        : researchMateDetails?.nagadNumber) || '01603012448';
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
      await api.post('/public/membership/access-code', {
        applicationId: access.applicationId,
        email: recoveryEmail
      });
      toast.success('If the application details match, an administrator will review your access recovery request.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not request an access code');
    }
  };

  const openNotification = async (notice: PortalData['notifications'][number]) => {
    setSelectedNotification(notice);
    if (!notice.readAt && details) {
      try {
        await api.post(`/public/membership/${details.applicationId}/notifications/${notice._id}/read`, {
          accessCode: access.accessCode
        });
        setDetails({
          ...details,
          notifications: details.notifications.map((item) =>
            item._id === notice._id ? { ...item, readAt: new Date().toISOString() } : item
          )
        });
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not mark notification as read');
      }
    }
  };

  const categoryLabel = details?.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor';

  return (
    <main className="container section py-10 sm:py-16" style={{ maxWidth: 840 }}>
      <SEO
        title="Check Application Portal | ASPIER"
        description="Check your Young Scholar, Supervisor, or Research Mate application status."
      />

      <div className="mb-6">
        <span className="eyebrow block">Application Status &amp; Verification</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Check Application Portal
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Track review progress, complete fee-free academic profiles for Supervisors and Young Scholars, or submit Research Mate project onboarding verification.
        </p>
      </div>

      {/* LOGIN / LOOKUP FORM */}
      {!details && !researchMateDetails && (
        <form
          className="w-full max-w-xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4 box-border"
          onSubmit={lookup}
        >
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
            <span>
              Enter the <strong>Application ID</strong> and <strong>Private Access Code</strong> received upon submitting your application or issued via notification.
            </span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Application ID
            </label>
            <input
              required
              placeholder="e.g. ASPIER-RM-2026-XXXX or ASPIER-2026-XXXX"
              value={access.applicationId}
              onChange={(e) => setAccess({ ...access, applicationId: e.target.value.toUpperCase() })}
              className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Private Access Code
            </label>
            <input
              required
              placeholder="Enter your private access code"
              value={access.accessCode}
              onChange={(e) => setAccess({ ...access, accessCode: e.target.value })}
              className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[46px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 px-4 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Verifying Credentials…' : 'Check Application Status →'}
          </button>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Lost your access code?</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Email used on application"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="block w-full flex-1 min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="button"
                disabled={!access.applicationId || !recoveryEmail}
                onClick={requestAccessCode}
                className="min-h-[40px] px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors disabled:opacity-50 shrink-0"
              >
                Request Recovery
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* RESEARCH MATE PORTAL VIEW (WING PROJECT COLLABORATION & PAYMENT GATEWAY)  */}
      {/* ========================================================================= */}
      {researchMateDetails && (
        <section className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 box-border">
          {/* Top Badge & Reference ID Row */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100/80 text-teal-900 border border-teal-200 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" /> Research Mate
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-300 break-all">
                {researchMateDetails.applicationId}
              </span>
              <button
                type="button"
                onClick={() => copyAppId(researchMateDetails.applicationId)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-white border border-teal-200 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedId ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            {/* Applicant Header & Project Meta */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {researchMateDetails.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600 leading-normal">
                <span>
                  <strong>Project:</strong>{' '}
                  <span className="text-teal-950 font-semibold">{researchMateDetails.researchTitle}</span>
                </span>
                <span className="hidden sm:inline text-slate-300">·</span>
                <span>
                  <strong>Wing:</strong> <span className="text-slate-800">{researchMateDetails.wingName}</span>
                </span>
              </div>
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
            <div className="space-y-5">
              {/* Stage 1 Approval Status Card */}
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                  <strong className="font-bold text-emerald-950">Stage 1 Approved:</strong>
                  <span className="text-emerald-800">Verification &amp; Project Onboarding Pending</span>
                </div>
              </div>

              {/* Stage 2 Project Onboarding Fee Card */}
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 space-y-5 box-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-700 shrink-0" />
                      Stage 2 Verification: Project Onboarding Fee
                    </h3>
                    <p className="text-xs text-slate-600">
                      Fixed One-Time Research Project Fee: <strong className="text-slate-900 font-bold">৳1,000 BDT</strong>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Payment Required
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {researchMateDetails.paymentInstructions ||
                    'Send BDT 1,000 via bKash or Nagad Personal (Send Money) to our official number, then enter your sender phone number and Transaction ID (TrxID) below for verification.'}
                </p>

                {/* Styled Payment Method Toggle (grid grid-cols-2 gap-2.5 w-full) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Select Payment Gateway
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bKash')}
                      className={`min-h-[44px] rounded-xl border font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'bKash'
                          ? 'bg-[#e2136e] text-white border-[#e2136e] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      bKash Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Nagad')}
                      className={`min-h-[44px] rounded-xl border font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'Nagad'
                          ? 'bg-[#f7941d] text-white border-[#f7941d] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      Nagad Personal
                    </button>
                  </div>
                </div>

                {/* Official Account Number Box */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-white border border-slate-200">
                  <div className="min-w-0">
                    <span className="text-xs text-slate-500 block">
                      Official {paymentMethod} Number:
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900 block truncate">
                      {paymentMethod === 'bKash'
                        ? researchMateDetails.bkashNumber || '01603012448'
                        : researchMateDetails.nagadNumber || '01603012448'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyPaymentNumber}
                    className="min-h-[38px] px-3.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedNumber ? 'Copied!' : 'Copy Number'}
                  </button>
                </div>

                {/* Responsive Phone & TrxID Form (grid grid-cols-1 sm:grid-cols-2 gap-4 w-full) */}
                <form className="space-y-4 pt-1" onSubmit={submitResearchMatePayment}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Sender Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        placeholder="e.g. 01711223344"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Transaction ID (TrxID) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 9B38K120LA"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white uppercase font-mono focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {busy ? 'Submitting Details…' : 'Submit TrxID for Final Approval →'}
                    </button>
                  </div>
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
                    Join your project coordination group to connect with faculty supervisors, research leads, young scholars, and fellow research mates.
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

          {/* Clean Footer Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              className="min-h-[40px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer"
              onClick={() => {
                setResearchMateDetails(null);
                setDetails(null);
              }}
            >
              ← Check another application
            </button>
            <Link
              to="/wings"
              className="min-h-[40px] px-4 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs sm:text-sm flex items-center justify-center transition-colors text-center"
            >
              Explore Academic Wings →
            </Link>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 100% FEE-FREE SUPERVISOR & YOUNG SCHOLAR MEMBERSHIP VIEW                 */}
      {/* ========================================================================= */}
      {details && (
        <section
          className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 box-border"
          style={{ marginTop: 20 }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-green font-bold text-xs">
                  {categoryLabel}
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  {details.applicationId}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{details.name}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {details.wing} · {details.email}
              </p>
            </div>
            <span className="badge badge-green text-xs capitalize">
              {details.status.replaceAll('_', ' ')}
            </span>
          </div>

          <button
            className="notification-bell applicant-notification-trigger"
            type="button"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={18} aria-hidden="true" /> Notifications{' '}
            {details.notifications.some((notice) => !notice.readAt) && (
              <span className="notification-count">
                {details.notifications.filter((notice) => !notice.readAt).length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <section className="applicant-notifications">
              <h3>Notification center</h3>
              {details.notifications.length === 0 && <p className="muted">No notifications yet.</p>}
              {details.notifications.map((notice) => (
                <button
                  type="button"
                  className={`notification-item ${notice.readAt ? '' : 'unread'}`}
                  key={notice._id}
                  onClick={() => void openNotification(notice)}
                >
                  <span className="notification-unread-dot" aria-hidden="true" />
                  <span>
                    <strong>{notice.title}</strong>
                    <small>{new Date(notice.createdAt).toLocaleString()}</small>
                  </span>
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

          {details.status === 'initial_pending' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
              Your initial application is pending review. We’ll notify you when it is reviewed.
            </div>
          )}

          {details.status === 'membership_pending' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <h3 className="font-bold text-base text-emerald-950">
                  Congratulations — your {categoryLabel} application is approved!
                </h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Joining ASPIER is <strong>100% free across all stages</strong>. Please complete your academic profile below to finalize your membership.
                </p>
              </div>

              <h3 className="text-lg font-bold text-slate-900">Stage 2: Complete Your Academic Profile</h3>

              <form className="form" onSubmit={submitProfile}>
                <label>
                  Full name
                  <Input required value={profile.name} onChange={(event) => set('name', event.target.value)} />
                </label>
                <label>
                  Present address
                  <textarea
                    className="textarea"
                    rows={2}
                    required
                    value={profile.presentAddress}
                    onChange={(event) => set('presentAddress', event.target.value)}
                  />
                </label>
                <label>
                  Permanent address
                  <textarea
                    className="textarea"
                    rows={2}
                    required
                    value={profile.permanentAddress}
                    onChange={(event) => set('permanentAddress', event.target.value)}
                  />
                </label>
                <label>
                  Current profession / designation
                  <Input
                    required
                    placeholder="Professor, Researcher, Student…"
                    value={profile.designation}
                    onChange={(event) => set('designation', event.target.value)}
                  />
                </label>
                <label>
                  University / institution
                  <Input
                    required
                    value={profile.institution}
                    onChange={(event) => set('institution', event.target.value)}
                  />
                </label>
                <label>
                  Educational background
                  <textarea
                    className="textarea"
                    rows={4}
                    required
                    placeholder="Degrees and institutions"
                    value={profile.educationalBackground}
                    onChange={(event) => set('educationalBackground', event.target.value)}
                  />
                </label>
                <label>
                  Google Scholar profile URL
                  <Input
                    type="url"
                    value={profile.googleScholar}
                    onChange={(event) => set('googleScholar', event.target.value)}
                  />
                </label>
                <label>
                  ResearchGate profile URL
                  <Input
                    type="url"
                    value={profile.researchGate}
                    onChange={(event) => set('researchGate', event.target.value)}
                  />
                </label>
                <label>
                  ORCID
                  <Input value={profile.orcid} onChange={(event) => set('orcid', event.target.value)} />
                </label>
                <label>
                  LinkedIn profile URL
                  <Input
                    type="url"
                    value={profile.linkedin}
                    onChange={(event) => set('linkedin', event.target.value)}
                  />
                </label>
                <label>
                  Short research bio
                  <textarea
                    className="textarea"
                    rows={5}
                    required
                    minLength={20}
                    value={profile.bio}
                    onChange={(event) => set('bio', event.target.value)}
                  />
                </label>
                <label>
                  Research domains (comma-separated)
                  <Input
                    required
                    placeholder="Environmental science, GIS…"
                    value={profile.researchDomains}
                    onChange={(event) => set('researchDomains', event.target.value)}
                  />
                </label>
                <label>
                  Profile picture
                  <ImageUploader
                    value={profile.photo}
                    onUploaded={(url) => set('photo', url)}
                    helperText="Recommended: 400 × 400 px, 1:1 Square, Max 2MB"
                    maxSizeMB={2}
                    endpoint={`/public/membership/${details.applicationId}/photo`}
                    headers={{ 'X-Application-Code': access.accessCode }}
                  />
                </label>
                <Button disabled={busy || !profile.photo}>
                  {busy ? 'Submitting…' : 'Submit Final Academic Application'}
                </Button>
                {!profile.photo && (
                  <span className="muted">Upload a profile picture to submit the final application.</span>
                )}
              </form>
            </div>
          )}

          {details.status === 'final_pending' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-sm">
              Your final academic profile has been submitted. The ASPIER team will review it and notify you when it is published.
            </div>
          )}

          {details.status === 'verification_pending' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-sm">
              Your academic profile has been submitted. An administrator will review it before publishing your profile to the ASPIER Team.
            </div>
          )}

          {details.status === 'published' && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-950 text-sm space-y-2">
              <p className="font-semibold text-teal-950">Your profile is approved and published on the ASPIER Team page.</p>
              <Link to="/team" className="button button-primary inline-flex text-xs">
                View ASPIER Team →
              </Link>
            </div>
          )}

          {details.status === 'rejected' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm">
              This application was not approved. Contact ASPIER if you need more information.
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              className="button button-secondary text-xs"
              type="button"
              onClick={() => setDetails(null)}
            >
              ← Check another application
            </button>
            <Link to="/team" className="text-xs text-teal-700 hover:text-teal-900 font-semibold">
              Meet the ASPIER Team →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
