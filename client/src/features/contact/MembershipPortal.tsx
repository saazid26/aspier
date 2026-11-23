import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  ExternalLink,
  User,
  GraduationCap,
  Building,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { ImageUploader } from '../../components/forms/ImageUploader';
import { TagInputField } from '../../components/forms/TagInputField';
import { staticWings } from '../../lib/staticData';

type PortalData = {
  applicationId: string;
  name: string;
  email: string;
  role: string;
  wing: string;
  status: string;
  designation?: string;
  institution?: string;
  educationalBackground?: string;
  bio?: string;
  researchDomains?: string[];
  photo?: string;
  googleScholar?: string;
  researchGate?: string;
  orcid?: string;
  linkedin?: string;
  website?: string;
  github?: string;
  twitter?: string;
  publishedProfileId?: string;
  publishedProfileType?: string;
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
    designation: '',
    institution: '',
    wing: '',
    educationalBackground: '',
    bio: '',
    researchDomains: [] as string[],
    photo: '',
    googleScholar: '',
    researchGate: '',
    orcid: '',
    linkedin: '',
    website: '',
    github: '',
    twitter: '',
    presentAddress: '',
    permanentAddress: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PortalData['notifications'][number] | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Active Wings Query
  const { data: remoteWings } = useQuery({
    queryKey: ['portal-wings'],
    queryFn: async () => (await api.get('/public/wings')).data.data as Array<{ slug: string; name: string }>,
    initialData: staticWings
  });
  const wings = remoteWings && remoteWings.length > 0 ? remoteWings : staticWings;

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

  const setProfileField = (key: string, value: any) =>
    setProfile((current) => ({ ...current, [key]: value }));

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
      const data = response.data.data;
      setDetails(data);
      setResearchMateDetails(null);
      const defaultRoleTitle = data.role === 'youngScholar' ? 'Young Scholar' : 'Research Supervisor';
      setProfile({
        name: data.name || '',
        designation: data.designation || defaultRoleTitle,
        institution: data.institution || '',
        wing: data.wing || '',
        educationalBackground: data.educationalBackground || '',
        bio: data.bio || '',
        researchDomains: Array.isArray(data.researchDomains) ? data.researchDomains : [],
        photo: data.photo || '',
        googleScholar: data.googleScholar || '',
        researchGate: data.researchGate || '',
        orcid: data.orcid || '',
        linkedin: data.linkedin || '',
        website: data.website || '',
        github: data.github || '',
        twitter: data.twitter || '',
        presentAddress: data.presentAddress || '',
        permanentAddress: data.permanentAddress || ''
      });
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
    if (!profile.photo) {
      toast.error('Please upload your 1:1 circular profile picture.');
      return;
    }
    if (!profile.researchDomains || profile.researchDomains.length === 0) {
      toast.error('Please specify at least one research domain tag.');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post(`/public/membership/${details.applicationId}/profile`, {
        ...profile,
        accessCode: access.accessCode
      });
      setDetails({
        ...details,
        status: response.data.data.status,
        photo: profile.photo,
        designation: profile.designation,
        institution: profile.institution,
        wing: profile.wing,
        educationalBackground: profile.educationalBackground,
        bio: profile.bio,
        researchDomains: profile.researchDomains,
        publishedProfileId: response.data.data.profileId,
        publishedProfileType: response.data.data.profileType
      });
      toast.success('Congratulations! Your official profile is now published to the Team page.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit official profile');
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
          className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-8 space-y-6 box-border"
          style={{ marginTop: 20 }}
        >
          {/* Top Badge & Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="badge badge-green font-bold text-xs">
                  {categoryLabel}
                </span>
                <span className="text-xs font-mono text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {details.applicationId}
                </span>
                <button
                  type="button"
                  onClick={() => copyAppId(details.applicationId)}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId ? 'Copied' : 'Copy ID'}
                </button>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{details.name}</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {details.wing || 'ASPIER Institute'} · <span className="font-mono">{details.email}</span>
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

          {/* STATUS 1: STAGE 1 REVIEW PENDING */}
          {details.status === 'initial_pending' && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                Stage 1 Review: Application Pending
              </div>
              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                Your initial fellowship application has been submitted and is currently under faculty review by the {details.wing || 'academic wing'} committee. Joining ASPIER is <strong>100% free across all stages</strong>. Once approved, you can complete your official academic profile here.
              </p>
            </div>
          )}

          {/* STATUS 2: STAGE 1 APPROVED -> COMPLETE STAGE 2 OFFICIAL PROFILE */}
          {details.status === 'membership_pending' && (
            <div className="space-y-6">
              {/* Approval Banner */}
              <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h3 className="font-bold text-base text-emerald-950">
                    Congratulations — your {categoryLabel} application is approved!
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                  Joining ASPIER is <strong>100% free across all stages</strong> — there are no fees or payments. Please complete your official academic profile below. Once submitted, your profile will be immediately published to the public ASPIER Team page.
                </p>
              </div>

              {/* Stage 2 Official Profile Form */}
              <form onSubmit={submitProfile} className="space-y-6">
                {/* 1. Identity & Academic Role */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" /> 1. Identity &amp; Academic Role
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfileField('name', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Academic / Professional Role Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder={details.role === 'youngScholar' ? 'e.g. Young Scholar — Climate & Hydrology' : 'e.g. Assistant Professor, Dept. of CSE'}
                        value={profile.designation}
                        onChange={(e) => setProfileField('designation', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Institution / Department / Affiliation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. University of Rajshahi / BUET"
                        value={profile.institution}
                        onChange={(e) => setProfileField('institution', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Assigned Academic Wing <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={profile.wing}
                        onChange={(e) => setProfileField('wing', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      >
                        <option value="">Select Wing</option>
                        {wings.map((w) => (
                          <option key={w.slug} value={w.slug}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Educational Background <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Ph.D. in Aeronautical Engineering or B.Sc. in Environmental Science"
                        value={profile.educationalBackground}
                        onChange={(e) => setProfileField('educationalBackground', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. 1:1 Circular Profile Photo Upload */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" /> 2. Profile Photo (1:1 Circular Portrait) <span className="text-rose-500">*</span>
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                    <ImageUploader
                      value={profile.photo}
                      onUploaded={(url) => setProfileField('photo', url)}
                      shape="circle"
                      endpoint={`/public/membership/${details.applicationId}/photo`}
                      headers={{ 'X-Application-Code': access.accessCode }}
                      helperText="Recommended: 500 × 500 px • 1:1 Circular portrait matching /team style • Max 2MB"
                      maxSizeMB={2}
                    />
                    {!profile.photo && (
                      <p className="text-xs text-slate-500 mt-2">
                        Upload your official portrait to complete and publish your profile.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Full Biography & Research Statement */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-teal-600" /> 3. Full Biography &amp; Research Statement <span className="text-rose-500">*</span>
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Academic Biography &amp; Research Focus
                    </label>
                    <textarea
                      required
                      minLength={20}
                      rows={5}
                      placeholder="Detail your background, research methodology, areas of inquiry, and ongoing contributions..."
                      value={profile.bio}
                      onChange={(e) => setProfileField('bio', e.target.value)}
                      className="block w-full max-w-full min-w-0 box-border min-h-[120px] rounded-xl border border-slate-300 bg-white p-3.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                    />
                    <p className="text-xs text-slate-500 mt-1">Minimum 20 characters.</p>
                  </div>
                </div>

                {/* 4. Academic Focus / Research Domains (Tag Input) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-teal-600" /> 4. Academic Focus / Research Domains <span className="text-rose-500">*</span>
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Research Domains (Comma-Separated Tags)
                    </label>
                    <TagInputField
                      value={profile.researchDomains}
                      onChange={(tags) => setProfileField('researchDomains', tags)}
                      placeholder="e.g. Water Resource, Groundwater, Climate Change, Hydrology"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Type domains separated by commas. Multi-word phrases and spaces are preserved.
                    </p>
                  </div>
                </div>

                {/* 5. Academic & Social Profiles */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-600" /> 5. Academic &amp; Social Profiles (Optional)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Google Scholar URL</label>
                      <input
                        type="url"
                        placeholder="https://scholar.google.com/citations?user=..."
                        value={profile.googleScholar}
                        onChange={(e) => setProfileField('googleScholar', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ORCID iD / URL</label>
                      <input
                        type="text"
                        placeholder="0000-0000-0000-0000"
                        value={profile.orcid}
                        onChange={(e) => setProfileField('orcid', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ResearchGate URL</label>
                      <input
                        type="url"
                        placeholder="https://www.researchgate.net/profile/..."
                        value={profile.researchGate}
                        onChange={(e) => setProfileField('researchGate', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        placeholder="https://www.linkedin.com/in/..."
                        value={profile.linkedin}
                        onChange={(e) => setProfileField('linkedin', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Personal Website / GitHub URL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={profile.website}
                        onChange={(e) => setProfileField('website', e.target.value)}
                        className="block w-full max-w-full min-w-0 box-border rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Joining ASPIER is <strong>100% free across all stages</strong>. Your profile will be published directly upon submission.
                  </p>
                  <button
                    type="submit"
                    disabled={busy || !profile.photo}
                    className="w-full sm:w-auto min-h-[46px] px-7 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Publishing Profile…
                      </>
                    ) : (
                      <>
                        Publish Profile to ASPIER Team
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STATUS 3: ACTIVE TEAM MEMBER / COMPLETED / PUBLISHED */}
          {(details.status === 'completed' || details.status === 'active_member' || details.status === 'published') && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-emerald-950">
                    Active Team Member • Profile Published
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your official profile is live on the public ASPIER Team page and searchable across academic wings.
                  </p>
                </div>
              </div>

              {/* Live Profile Card Preview */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-teal-600 overflow-hidden shrink-0 shadow-sm bg-white">
                    {details.photo ? (
                      <img src={details.photo} alt={details.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xl text-teal-800 bg-teal-50">
                        {details.name?.charAt(0) || 'M'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200 mb-1">
                      {categoryLabel}
                    </span>
                    <h4 className="text-xl font-bold text-slate-900">{details.name}</h4>
                    <p className="text-sm font-semibold text-teal-700">
                      {details.designation || categoryLabel} {details.institution ? `• ${details.institution}` : ''}
                    </p>
                    <p className="text-xs text-slate-600">
                      Academic Wing: <strong>{details.wing || 'ASPIER Institute'}</strong>
                    </p>
                    {details.educationalBackground && (
                      <p className="text-xs text-slate-600 pt-0.5">
                        <strong>Education:</strong> {details.educationalBackground}
                      </p>
                    )}
                  </div>
                </div>

                {details.bio && (
                  <div className="pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "{details.bio}"
                  </div>
                )}

                {details.researchDomains && details.researchDomains.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {details.researchDomains.map((domain) => (
                      <span key={domain} className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700">
                        {domain}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Link
                    to="/team"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition-all shadow-sm"
                  >
                    View Your Live Profile in Team →
                  </Link>
                  <Link
                    to="/login"
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Sign in to Member Portal
                  </Link>
                </div>
              </div>

              {/* One-time secret activation code if available */}
              {details.activationCode && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-teal-900 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Member Account Activation Credential
                  </div>
                  <p className="text-xs text-teal-800">
                    Use this one-time code to activate your account credentials at <Link to="/login" className="underline font-semibold">ASPIER Sign-In</Link>:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-bold bg-white px-3 py-1.5 rounded-lg border border-teal-300 text-teal-950 select-all">
                      {details.activationCode}
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATUS 4: PENDING REVIEW / FALLBACK */}
          {details.status === 'final_pending' && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                Profile Review Pending
              </div>
              <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                Your academic profile has been submitted and is currently being verified. It will be published shortly to the ASPIER Team page.
              </p>
            </div>
          )}

          {details.status === 'rejected' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm">
              This application was not approved. Contact ASPIER if you need more information.
            </div>
          )}

          {/* Clean Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              className="w-full sm:w-auto min-h-[38px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              type="button"
              onClick={() => {
                setDetails(null);
                setResearchMateDetails(null);
              }}
            >
              ← Check another application
            </button>
            <Link to="/team" className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1">
              Meet the ASPIER Team <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
