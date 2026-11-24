import React, { useEffect, useRef, useState } from 'react';
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
  Clock,
  User,
  UserPlus,
  KeyRound,
  GraduationCap,
  Building,
  Globe,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../lib/api';
import { ImageUploader } from '../forms/ImageUploader';
import { TagInputField } from '../forms/TagInputField';
import { staticWings } from '../../lib/staticData';

type ApplicantNotice = {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  activationCode?: string;
};

type MemberPortalData = {
  applicationId: string;
  name: string;
  email: string;
  role: 'supervisor' | 'youngScholar' | string;
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
  presentAddress?: string;
  permanentAddress?: string;
  publishedProfileId?: string;
  publishedProfileType?: string;
  activationCode?: string;
  notifications: ApplicantNotice[];
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

type WingOption = { slug: string; name: string };
type Mode = 'check' | 'signup';

const formatElapsed = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export function PublicApplicantBell({ onOpenChange }: { onOpenChange?: (open: boolean) => void } = {}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const bellRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const appIdInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('check');

  // Input states always start completely empty (no hardcoded pre-filled values)
  const [applicationId, setApplicationId] = useState('');
  const [accessCode, setAccessCode] = useState('');

  // Access Code Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  // Verified Application Data
  const [memberData, setMemberData] = useState<MemberPortalData | null>(null);
  const [researchMateData, setResearchMateData] = useState<ResearchMateData | null>(null);

  // Stage 2 Official Profile state for Supervisors / Young Scholars
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
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [extraProfileOpen, setExtraProfileOpen] = useState(false);
  const [wings, setWings] = useState<WingOption[]>(staticWings);

  // Research Mate Stage 2 Payment state
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Notification accordion / selection
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<ApplicantNotice | null>(null);

  // General UI state
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pendingAt, setPendingAt] = useState<number | null>(() => {
    const saved = Number(sessionStorage.getItem('aspier-signup-pending-at'));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });
  const [now, setNow] = useState(Date.now());

  const unreadCount = memberData?.notifications?.filter((n) => !n.readAt).length || 0;
  const isExpanded = Boolean(memberData || researchMateData);

  // Reset scroll position to top on open and whenever view/mode/data changes
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [open, mode, isExpanded, memberData, researchMateData, extraProfileOpen, noticesOpen]);

  // Responsive listener
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Outside click & escape handlers
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

  // Timer & Wings fetch
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    void api.get('/public/wings').then((response) => {
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        setWings(response.data.data);
      }
    }).catch(() => {
      // keep staticWings
    });
    return () => window.clearInterval(timer);
  }, [open]);

  // URL search parameter check on mount/update (e.g. redirected from /join/portal or /check-application)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldCheck = params.get('checkApplication') === 'true' || params.get('check') === '1';
    const urlId = params.get('id') || params.get('applicationId');
    const urlCode = params.get('code') || params.get('accessCode');

    if (shouldCheck || urlId) {
      setOpen(true);
      setMode('check');
      if (urlId) setApplicationId(urlId);
      if (urlCode) setAccessCode(urlCode);
      onOpenChange?.(true);
    }
  }, [onOpenChange]);

  // Listen for custom programmatic event
  useEffect(() => {
    const handleOpenCheck = (event?: any) => {
      setOpen(true);
      setMode('check');
      if (event?.detail?.applicationId) {
        setApplicationId(event.detail.applicationId);
      }
      if (event?.detail?.accessCode) {
        setAccessCode(event.detail.accessCode);
      }
      onOpenChange?.(true);
    };
    window.addEventListener('aspier-open-check-application', handleOpenCheck);
    return () => window.removeEventListener('aspier-open-check-application', handleOpenCheck);
  }, [onOpenChange]);

  // Copy helper
  const copyText = async (text: string, type: 'id' | 'code' | 'number') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        toast.success('Application ID copied!');
        setTimeout(() => setCopiedId(false), 2000);
      } else if (type === 'code') {
        setCopiedCode(true);
        toast.success('Activation Code copied!');
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedNumber(true);
        toast.success('Payment number copied!');
        setTimeout(() => setCopiedNumber(false), 2000);
      }
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  // Reset / Check Another Application
  const handleCheckAnother = () => {
    setMemberData(null);
    setResearchMateData(null);
    setApplicationId('');
    setAccessCode('');
    setLoginError('');
    setRecoverySuccess('');
    setRecoveryError('');
    setSenderPhone('');
    setTrxId('');
    setSelectedNotice(null);
    setNoticesOpen(false);
  };

  // Check Application Status
  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRecoverySuccess('');
    setRecoveryError('');

    const appId = applicationId.trim().toUpperCase();
    const code = accessCode.trim();

    if (!appId || !code) {
      setLoginError('Please enter both Application ID and Private Access Code.');
      return;
    }

    setBusy(true);

    const isLikelyResearchMate = appId.includes('RM');

    if (isLikelyResearchMate) {
      try {
        const res = await api.post('/public/research-applications/lookup', {
          applicationId: appId,
          accessCode: code
        });
        setResearchMateData(res.data.data);
        setMemberData(null);
        toast.success('Research Mate application retrieved successfully.');
        setBusy(false);
        return;
      } catch {
        // Fallback to membership lookup below
      }
    }

    try {
      const res = await api.post('/public/membership/lookup', {
        applicationId: appId,
        accessCode: code
      });
      const d = res.data.data as MemberPortalData;
      setMemberData(d);
      setResearchMateData(null);
      const defaultRoleTitle = d.role === 'youngScholar' ? 'Young Scholar' : 'Research Supervisor';
      setProfile({
        name: d.name || '',
        designation: d.designation || defaultRoleTitle,
        institution: d.institution || '',
        wing: d.wing || '',
        educationalBackground: d.educationalBackground || '',
        bio: d.bio || '',
        researchDomains: Array.isArray(d.researchDomains) ? d.researchDomains : [],
        photo: d.photo || '',
        googleScholar: d.googleScholar || '',
        researchGate: d.researchGate || '',
        orcid: d.orcid || '',
        linkedin: d.linkedin || '',
        website: d.website || '',
        github: d.github || '',
        twitter: d.twitter || '',
        presentAddress: d.presentAddress || '',
        permanentAddress: d.permanentAddress || ''
      });
      toast.success('Application retrieved successfully.');
    } catch (err: any) {
      // Second fallback: try research application lookup in case user has a non-standard ID
      try {
        const fallbackRes = await api.post('/public/research-applications/lookup', {
          applicationId: appId,
          accessCode: code
        });
        setResearchMateData(fallbackRes.data.data);
        setMemberData(null);
        toast.success('Research Mate application retrieved.');
      } catch {
        const msg = getApiErrorMessage(err, 'Could not find application. Please verify your Application ID and Private Access Code.');
        setLoginError(msg);
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  // Lost Access Code Recovery
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    if (!recoveryEmail.trim()) {
      setRecoveryError('Please enter the email address used on your application.');
      return;
    }

    setIsRecovering(true);
    try {
      const res = await api.post('/public/membership/access-code', {
        email: recoveryEmail.trim(),
        applicationId: applicationId.trim()
      });
      setRecoverySuccess(res.data.message || 'If the application details match, an administrator will review your access recovery request.');
      toast.success('Recovery request submitted.');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Could not submit recovery request.');
      setRecoveryError(msg);
      toast.error(msg);
    } finally {
      setIsRecovering(false);
    }
  };

  // Submit Stage 2 Official Profile for Supervisors / Young Scholars
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData) return;
    if (!profile.photo) {
      toast.error('Please upload your 1:1 circular profile picture.');
      return;
    }
    if (!profile.researchDomains || profile.researchDomains.length === 0) {
      toast.error('Please specify at least one research domain tag.');
      return;
    }
    setIsSubmittingProfile(true);
    try {
      const res = await api.post(`/public/membership/${memberData.applicationId}/profile`, {
        ...profile,
        accessCode: accessCode.trim()
      });
      setMemberData({
        ...memberData,
        status: res.data.data.status,
        photo: profile.photo,
        designation: profile.designation,
        institution: profile.institution,
        wing: profile.wing,
        educationalBackground: profile.educationalBackground,
        bio: profile.bio,
        researchDomains: profile.researchDomains,
        publishedProfileId: res.data.data.profileId,
        publishedProfileType: res.data.data.profileType
      });
      toast.success('Congratulations! Your official profile is now published to the Team page.');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Could not submit official profile.'));
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Submit Research Mate Payment
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

  // Mark notification read
  const markRead = (id: string) => {
    if (!memberData) return;
    setMemberData({
      ...memberData,
      notifications: memberData.notifications.map((notice) =>
        notice._id === id ? { ...notice, readAt: new Date().toISOString() } : notice
      )
    });
  };

  // =========================================================================
  // VIEW: SUPERVISOR & YOUNG SCHOLAR POST-VERIFICATION RESULTS
  // =========================================================================
  const renderMemberView = () => {
    if (!memberData) return null;
    const isSupervisor = memberData.role !== 'youngScholar';
    const roleTitle = isSupervisor ? 'Supervisor' : 'Young Scholar';
    const isApprovedAwaitingProfile = memberData.status === 'membership_pending';
    const isPendingReview = memberData.status === 'initial_pending';
    const isPublished = ['completed', 'published', 'active_member'].includes(memberData.status);

    return (
      <div className="space-y-4">
        {/* Back navigation button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={handleCheckAnother}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Check another application
          </button>
          <span className="badge badge-green text-[11px] font-bold uppercase tracking-wider">
            {roleTitle}
          </span>
        </div>

        {/* Applicant Header Card */}
        <div className="p-3.5 bg-teal-50/90 border border-teal-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900 leading-snug">{memberData.name}</h4>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] font-bold text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                {memberData.applicationId}
              </span>
              <button
                type="button"
                onClick={() => copyText(memberData.applicationId, 'id')}
                className="p-1 text-teal-700 hover:text-teal-900 bg-white border border-teal-200 rounded hover:bg-teal-50 cursor-pointer"
                title="Copy Application ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            <strong>Wing:</strong> {memberData.wing || 'ASPIER Institute'} · <span className="font-mono">{memberData.email}</span>
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-teal-900 uppercase">{memberData.status.replaceAll('_', ' ')}</span>
          </div>
        </div>

        {/* STATUS 1: STAGE 1 REVIEW PENDING */}
        {isPendingReview && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Stage 1 Review in Progress</span>
            </div>
            <p className="leading-relaxed text-amber-800">
              Your initial application to join ASPIER as a {roleTitle} is under faculty evaluation by the academic wing committee.
            </p>
            <p className="text-[11px] font-semibold text-amber-900">
              Joining ASPIER is <strong>100% free across all stages</strong>. Once approved, complete your official profile here to appear on the Team page.
            </p>
          </div>
        )}

        {/* STATUS 2: STAGE 1 APPROVED -> COMPLETE STAGE 2 OFFICIAL PROFILE */}
        {isApprovedAwaitingProfile && (
          <div className="space-y-3.5">
            {/* Approval Banner */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Congratulations — your {roleTitle} application is approved!</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                Joining ASPIER is <strong>100% free across all stages</strong> — there are zero fees or payment gateways. Please complete your official academic profile below to auto-publish your profile to the public Team page.
              </p>
            </div>

            {/* Stage 2 Official Profile Form */}
            <form onSubmit={handleProfileSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  Stage 2: Official Academic Profile
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Your submitted details will be immediately published to the public ASPIER Team page.
                </p>
              </div>

              {/* 1. Identity & Role */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Academic / Professional Role Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder={isSupervisor ? 'e.g. Assistant Professor, Dept. of CSE' : 'e.g. Young Scholar — Hydrology & Climate'}
                    value={profile.designation}
                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Institution / University / Affiliation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. University of Rajshahi / BUET / MIT"
                    value={profile.institution}
                    onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Assigned Academic Wing <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={profile.wing}
                    onChange={(e) => setProfile({ ...profile, wing: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  >
                    <option value="">Select Wing</option>
                    {wings.map((w) => (
                      <option key={w.slug} value={w.slug}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Educational Background <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ph.D. in Aeronautical Engineering or B.Sc. in Physics"
                    value={profile.educationalBackground}
                    onChange={(e) => setProfile({ ...profile, educationalBackground: e.target.value })}
                    className="w-full min-h-[42px] px-3 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  />
                </div>
              </div>

              {/* 2. 1:1 Circular Profile Photo */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-slate-800 block">
                  Profile Photo (1:1 Circular Portrait) <span className="text-rose-500">*</span>
                </label>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <ImageUploader
                    value={profile.photo}
                    onUploaded={(url) => setProfile({ ...profile, photo: url })}
                    shape="circle"
                    maxSizeMB={2}
                    endpoint={`/public/membership/${memberData.applicationId}/photo`}
                    headers={{ 'x-application-code': accessCode.trim() }}
                    helperText="500 × 500 px • 1:1 Circular portrait • Max 2MB"
                  />
                </div>
              </div>

              {/* 3. Professional Bio */}
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-slate-800 block">
                  Professional Bio / Research Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="3-4 sentence summary of your research domain, background, and academic focus..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full p-2.5 text-base sm:text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                />
              </div>

              {/* 4. Research Domains (Tags) */}
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-slate-800 block">
                  Academic Focus / Research Domains <span className="text-rose-500">*</span>
                </label>
                <TagInputField
                  value={profile.researchDomains}
                  onChange={(tags) => setProfile({ ...profile, researchDomains: tags })}
                  placeholder="Type tags separated by commas (e.g. Remote Sensing, Hydrology, Climate Risk)"
                  className="w-full min-h-[42px] px-3 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white box-border"
                />
              </div>

              {/* 5. Optional External Profiles Toggle */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setExtraProfileOpen(!extraProfileOpen)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-teal-800 py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    Academic Profiles &amp; Addresses (Optional)
                  </span>
                  {extraProfileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {extraProfileOpen && (
                  <div className="space-y-2 pt-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Google Scholar URL</label>
                      <input
                        type="url"
                        placeholder="https://scholar.google.com/citations?user=..."
                        value={profile.googleScholar}
                        onChange={(e) => setProfile({ ...profile, googleScholar: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">ResearchGate URL</label>
                      <input
                        type="url"
                        placeholder="https://www.researchgate.net/profile/..."
                        value={profile.researchGate}
                        onChange={(e) => setProfile({ ...profile, researchGate: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">ORCID ID</label>
                      <input
                        type="text"
                        placeholder="0000-0002-1825-0097"
                        value={profile.orcid}
                        onChange={(e) => setProfile({ ...profile, orcid: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">LinkedIn Profile</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={profile.linkedin}
                        onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Personal Website</label>
                      <input
                        type="url"
                        placeholder="https://yourdomain.edu"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Present Address</label>
                      <input
                        type="text"
                        placeholder="City, Country"
                        value={profile.presentAddress}
                        onChange={(e) => setProfile({ ...profile, presentAddress: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Profile Button */}
              <button
                type="submit"
                disabled={isSubmittingProfile}
                className="w-full min-h-[46px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs sm:text-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmittingProfile ? 'Submitting & Publishing Profile…' : 'Submit Official Profile & Publish to Team Page →'}
              </button>
            </form>
          </div>
        )}

        {/* STATUS 3: COMPLETED / PUBLISHED / ACTIVE MEMBER */}
        {isPublished && (
          <div className="space-y-3.5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Official Profile Published!</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                Your official {roleTitle} profile has been published to the public ASPIER Team page. Joining ASPIER is completely fee-free.
              </p>
              <div className="pt-1">
                <Link
                  to="/team"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 w-full min-h-[40px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors"
                >
                  <span>View Live Profile on Team Page →</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Secret Activation Code for Account Creation */}
            {memberData.activationCode && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Secret Account Activation Code:</span>
                  <button
                    type="button"
                    onClick={() => copyText(memberData.activationCode!, 'code')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-white border border-slate-300 px-2 py-0.5 rounded cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <code className="block p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-900 break-all">
                  {memberData.activationCode}
                </code>
                <p className="text-[11px] text-slate-500">
                  Use this one-time code to activate your login account.
                </p>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 w-full min-h-[40px] px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors"
                >
                  <span>Activate Account &amp; Log In →</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Member Notifications Center Accordion */}
        {memberData.notifications && memberData.notifications.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setNoticesOpen(!noticesOpen)}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-teal-700" />
                Administrative Notices ({memberData.notifications.length})
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </span>
              {noticesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {noticesOpen && (
              <div className="p-3 space-y-2 border-t border-slate-200 max-h-56 overflow-y-auto">
                {memberData.notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => markRead(n._id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      n.readAt ? 'bg-slate-50/60 border-slate-200' : 'bg-teal-50/60 border-teal-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <strong className="text-slate-900 font-semibold">{n.title}</strong>
                      <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.body}</p>
                    {n.activationCode && (
                      <div className="mt-1.5 p-1.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-900 break-all">
                        Activation Code: <strong>{n.activationCode}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // VIEW: RESEARCH MATE POST-VERIFICATION RESULTS
  // =========================================================================
  const renderResearchMateView = () => {
    if (!researchMateData) return null;
    const isStage1Approved = researchMateData.status === 'stage1_approved';
    const isPaymentSubmitted = researchMateData.status === 'payment_submitted';
    const isApproved = researchMateData.status === 'approved' || researchMateData.status === 'active';
    const isPending = researchMateData.status === 'pending';
    const isRejected = researchMateData.status === 'rejected';

    const officialNumber = (paymentMethod === 'bKash' ? researchMateData.bkashNumber : researchMateData.nagadNumber) || '01603012448';

    return (
      <div className="space-y-4">
        {/* Back navigation button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={handleCheckAnother}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Check another application
          </button>
          <span className="badge badge-green text-[11px] font-bold uppercase tracking-wider">
            Research Mate
          </span>
        </div>

        {/* Header Summary Card */}
        <div className="p-3.5 bg-teal-50/90 border border-teal-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900">{researchMateData.name}</h4>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] font-bold text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                {researchMateData.applicationId}
              </span>
              <button
                type="button"
                onClick={() => copyText(researchMateData.applicationId, 'id')}
                className="p-1 text-teal-700 hover:text-teal-900 bg-white border border-teal-200 rounded hover:bg-teal-50 cursor-pointer"
                title="Copy Application ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            <strong>Project:</strong> {researchMateData.researchTitle}
          </p>
          <p className="text-xs text-slate-500 leading-snug">
            <strong>Wing:</strong> {researchMateData.wingName}
          </p>
        </div>

        {/* STATUS: PENDING STAGE 1 REVIEW */}
        {isPending && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Stage 1: Under Faculty Review</span>
            </div>
            <p className="leading-relaxed text-amber-800">
              Your application is being evaluated by the academic wing committee. Stage 1 is completely free. Once approved, you will be notified to complete Stage 2 verification.
            </p>
          </div>
        )}

        {/* STATUS: STAGE 1 APPROVED (Awaiting BDT 1,000 Payment) */}
        {isStage1Approved && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Stage 1 Approved — Ready for Onboarding</span>
              </div>
              <p className="leading-relaxed text-blue-800">
                Congratulations! You are accepted to collaborate on <strong>{researchMateData.researchTitle}</strong>. Complete Stage 2 project verification below:
              </p>
            </div>

            {/* BDT 1,000 Payment Card */}
            <form onSubmit={handlePaymentSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
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
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      paymentMethod === 'bKash'
                        ? 'bg-[#D12053] text-white border-[#D12053] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    bKash (Send Money)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Nagad')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      paymentMethod === 'Nagad'
                        ? 'bg-[#F7941D] text-white border-[#F7941D] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Nagad (Send Money)
                  </button>
                </div>
              </div>

              {/* Official Number with Copy Button */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">{paymentMethod} Personal Number</span>
                  <strong className="font-mono text-sm text-slate-900 tracking-wide">{officialNumber}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(officialNumber, 'number')}
                  className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    copiedNumber ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  {copiedNumber ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedNumber ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Sender Phone & TrxID */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Sender Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. 01711223344"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 text-base sm:text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Transaction ID (TrxID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. BL9A8BC1X7"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                    className="w-full min-h-[42px] px-3.5 py-2 font-mono text-base sm:text-xs bg-white uppercase rounded-xl border border-slate-300 placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmittingPayment ? 'Submitting Payment…' : 'Submit Payment Details'}
              </button>
            </form>
          </div>
        )}

        {/* STATUS: PAYMENT SUBMITTED (Verification Pending) */}
        {isPaymentSubmitted && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2.5 text-xs text-purple-950">
            <div className="flex items-center gap-1.5 font-bold text-purple-900 text-sm">
              <CreditCard className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Payment Submitted — Verification Pending</span>
            </div>
            <p className="leading-relaxed text-purple-900">
              Your BDT 1,000 onboarding payment details have been submitted. An administrator is currently verifying your transaction.
            </p>
            <div className="bg-white p-3 rounded-lg border border-purple-200 space-y-1 font-mono text-[11px]">
              <div><span className="text-slate-500 font-sans">Method:</span> <strong>{researchMateData.paymentMethod || paymentMethod}</strong></div>
              <div><span className="text-slate-500 font-sans">Sender:</span> <strong>{researchMateData.paymentSenderPhone || senderPhone || '—'}</strong></div>
              <div><span className="text-slate-500 font-sans">TrxID:</span> <strong className="text-purple-800">{researchMateData.trxId || trxId}</strong></div>
            </div>
            <p className="text-[11px] text-purple-800">
              Once verified, your official WhatsApp Group link will appear here.
            </p>
          </div>
        )}

        {/* STATUS: APPROVED (Final Approved with WhatsApp Link) */}
        {isApproved && (
          <div className="space-y-3.5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Final Approved &amp; Enrolled!</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                Your BDT 1,000 onboarding payment has been verified. Welcome to the <strong>{researchMateData.researchTitle}</strong> research team!
              </p>
            </div>

            <div className="p-4 bg-white border border-emerald-200 rounded-xl shadow-sm text-center space-y-2.5">
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
                className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
            <strong>Application Not Selected:</strong>
            <p className="leading-relaxed">
              Thank you for your interest. Unfortunately, this project position has been filled. We encourage you to apply for other academic wings and projects.
            </p>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // VIEW: CREDENTIAL LOOKUP & RECOVERY GATE (TAB 1: CHECK, TAB 2: SIGN UP)
  // =========================================================================
  const renderLookupGate = () => (
    <div className="w-full">
      {mode === 'check' ? (
        /* TAB 1: CHECK APPLICATION (EXECUTIVE VERIFICATION CARD + RECOVERY CARD) */
        <div className="flex flex-col w-full">
          {/* Card 1 — Application Verification Gate */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-4.5 shadow-xs">
            <div className="flex items-start gap-3 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Application Verification Gate</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-0.5 m-0">
                  Enter your assigned Application ID and Private Access Code to check status and proceed to Stage 2.
                </p>
              </div>
            </div>

            <form className="flex flex-col gap-3 w-full" onSubmit={handleCheckStatus}>
              {loginError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Application ID Input */}
              <div className="w-full">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Application ID</label>
                <input
                  ref={appIdInputRef}
                  required
                  type="text"
                  autoComplete="username"
                  className="w-full min-h-[44px] px-3.5 py-2.5 font-mono text-base sm:text-sm rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:font-sans placeholder:text-slate-400 box-border uppercase"
                  placeholder="e.g. ASPIER-2026-XXXX"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value.toUpperCase())}
                />
              </div>

              {/* Private Access Code Input */}
              <div className="w-full">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Private Access Code</label>
                <input
                  required
                  type="text"
                  autoComplete="current-password"
                  className="w-full min-h-[44px] px-3.5 py-2.5 font-mono text-base sm:text-sm rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:font-sans placeholder:text-slate-400 box-border"
                  placeholder="e.g. SEC-XXXX-XXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[44px] mt-1 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Orbit className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Check Application Status</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card 2 — Lost your access code? Recovery Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 sm:p-4 mt-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <KeyRound className="w-4 h-4 text-slate-600 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 m-0">
                Lost your access code?
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3 m-0">
              Enter the email address used on your application to request an access recovery review from our admissions team.
            </p>

            {recoverySuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs mb-2.5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            {recoveryError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs mb-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{recoveryError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Email used on application"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="flex-1 min-w-0 min-h-[42px] px-3 py-2 text-base sm:text-sm rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
              />
              <button
                type="button"
                onClick={handleRequestRecovery}
                disabled={isRecovering}
                className="w-full sm:w-auto shrink-0 min-h-[42px] px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
              >
                {isRecovering ? 'Requesting…' : 'Request Recovery'}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-3.5 mt-3 text-center border-t border-slate-100">
            Haven&apos;t applied yet?{' '}
            <Link to="/join" onClick={() => { setOpen(false); onOpenChange?.(false); }} className="text-teal-700 hover:text-teal-900 font-semibold underline">
              Apply to Join ASPIER →
            </Link>
          </p>
        </div>
      ) : (
        /* TAB 2: SIGN UP (CONNECTED 2-STEP ONBOARDING TIMELINE CARDS) */
        <div className="flex flex-col w-full space-y-1">
          {/* Step 1 Card: Submit Initial Application */}
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-4 sm:p-4.5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  1
                </span>
                <h4 className="text-sm font-bold text-slate-900 leading-snug m-0">
                  Step 1: Submit Application First
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
                Free Stage 1
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mb-3.5 m-0">
              Applicants cannot sign up directly without submitting an initial application. Apply first as a <strong>Research Supervisor</strong>, <strong>Young Scholar</strong>, or <strong>Research Mate</strong> before account/portal verification.
            </p>
            <Link
              to="/join"
              onClick={() => {
                setOpen(false);
                onOpenChange?.(false);
              }}
              className="w-full min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition"
            >
              <span>Apply to Join ASPIER →</span>
            </Link>
          </div>

          {/* Subtle Vertical Step Connector */}
          <div className="flex justify-center my-1.5 relative">
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Step 2 Card: Check Application & Verify */}
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white p-4 sm:p-4.5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  2
                </span>
                <h4 className="text-sm font-bold text-slate-900 leading-snug m-0">
                  Step 2: Check Application &amp; Verify
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-800 border border-amber-200/80 shrink-0">
                Post-Approval
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mb-3.5 m-0">
              Already applied? Enter your admin-issued <strong>Application ID</strong> and <strong>Private Access Code</strong> in the Check Application gate to complete Stage 2 profile setup, submit payment (Research Mate only), or join your project.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('check');
                setTimeout(() => appIdInputRef.current?.focus(), 60);
              }}
              className="w-full min-h-[42px] px-4 rounded-xl bg-amber-100/90 hover:bg-amber-200/80 border border-amber-300/80 text-amber-950 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Go to Check Application Gate →</span>
            </button>
          </div>

          {pendingAt && (
            <div className="mt-3 p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-center justify-between" role="status">
              <div className="flex items-center gap-2">
                <Orbit size={18} className="text-blue-600 shrink-0 animate-spin" />
                <span>Review in progress: {formatElapsed(Math.max(0, Math.floor((now - pendingAt) / 1000)))}</span>
              </div>
              <button
                type="button"
                className="text-blue-700 underline font-semibold text-[11px] cursor-pointer"
                onClick={() => { setPendingAt(null); sessionStorage.removeItem('aspier-signup-pending-at'); }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Popover Inner Content
  const popoverContent = (
    <div className="flex flex-col h-full max-h-full min-h-0 overflow-hidden box-border">
      {/* Executive Header */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/50 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight truncate">
                Applicant Portal &amp; Notifications
              </strong>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-700 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5 m-0">
              Track application status or begin onboarding
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isExpanded && (
            <button
              type="button"
              className="text-xs font-semibold text-teal-800 hover:text-teal-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              onClick={handleCheckAnother}
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            aria-label="Close notifications"
            className="w-9 h-9 rounded-xl bg-white/80 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
            onClick={() => {
              setOpen(false);
              onOpenChange?.(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Modern Segmented Pill Tab Switcher */}
      {!isExpanded && (
        <div className="w-full px-4 pt-3 pb-2.5 sm:px-5 bg-white border-b border-slate-100 shrink-0 box-border">
          <div
            className="w-full grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/95 border border-slate-200/80 box-border"
            role="tablist"
            aria-label="Applicant access"
          >
            <button
              role="tab"
              aria-selected={mode === 'check'}
              className={`w-full min-w-0 h-10 px-2 sm:px-3 rounded-lg inline-flex items-center justify-center gap-1.5 transition-all duration-200 select-none cursor-pointer whitespace-nowrap text-[12px] sm:text-[13px] leading-none tracking-tight ${
                mode === 'check'
                  ? 'bg-white text-teal-800 font-semibold shadow-sm ring-1 ring-teal-600/20 border-0'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium border-0 shadow-none'
              }`}
              type="button"
              onClick={() => setMode('check')}
            >
              <ShieldCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${mode === 'check' ? 'text-teal-700' : 'text-slate-500'}`} />
              <span className="truncate">Check Application</span>
            </button>
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              className={`w-full min-w-0 h-10 px-2 sm:px-3 rounded-lg inline-flex items-center justify-center gap-1.5 transition-all duration-200 select-none cursor-pointer whitespace-nowrap text-[12px] sm:text-[13px] leading-none tracking-tight ${
                mode === 'signup'
                  ? 'bg-white text-teal-800 font-semibold shadow-sm ring-1 ring-teal-600/20 border-0'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium border-0 shadow-none'
              }`}
              type="button"
              onClick={() => setMode('signup')}
            >
              <UserPlus className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${mode === 'signup' ? 'text-teal-700' : 'text-slate-500'}`} />
              <span className="truncate">Sign Up</span>
            </button>
          </div>
        </div>
      )}

      {/* Scrollable body container with smooth wheel, trackpad, and touch swipe */}
      <div
        ref={scrollContainerRef}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="scrollable-body flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 min-h-0 box-border overscroll-contain touch-pan-y"
        style={{
          maxHeight: isMobile
            ? 'calc(85dvh - 110px)'
            : isExpanded
            ? 'min(calc(100vh - 175px), 720px)'
            : 'min(calc(100vh - 175px), 560px)',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        {researchMateData ? (
          renderResearchMateView()
        ) : memberData ? (
          renderMemberView()
        ) : (
          renderLookupGate()
        )}
      </div>
    </div>
  );

  return (
    <div className="notification-bell-wrap public-applicant-bell" ref={bellRef}>
      <button
        className="notification-bell"
        type="button"
        aria-label={`${unreadCount} unread applicant notifications`}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>

      {open &&
        (isMobile ? (
          createPortal(
            <>
              <button
                type="button"
                className="notification-mobile-backdrop"
                aria-label="Close applicant notifications"
                onClick={() => {
                  setOpen(false);
                  onOpenChange?.(false);
                }}
                tabIndex={-1}
              />
              <section
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                className={`notification-popover public-applicant-popover fixed inset-x-3 top-16 z-[999] mx-auto w-[calc(100vw-24px)] max-w-[440px] max-h-[85dvh] rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.16)] flex flex-col overflow-hidden box-border overscroll-contain ${
                  isExpanded ? 'popover-expanded !max-w-[520px] !max-h-[88dvh]' : ''
                }`}
                role="dialog"
                aria-modal="true"
                aria-label="Applicant notifications and check status"
              >
                {popoverContent}
              </section>
            </>,
            document.body
          )
        ) : (
          <section
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className={`notification-popover public-applicant-popover sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[440px] sm:max-h-[calc(100vh-88px)] rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.16)] flex flex-col overflow-hidden box-border overscroll-contain ${
              isExpanded ? 'popover-expanded sm:!w-[520px] sm:!max-h-[calc(100vh-88px)]' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Applicant notifications and check status"
          >
            {popoverContent}
          </section>
        ))}
    </div>
  );
}
