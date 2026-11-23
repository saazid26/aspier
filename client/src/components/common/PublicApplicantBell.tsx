import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell, Orbit, X, Lock, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
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

  const applicantLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setBusy(true);
    try {
      const response = await api.post('/public/membership/applicant-login', {
        applicationId,
        accessCode,
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
        setTotpSetup(null);
        setLoginStep('credentials');
        setTotpCode('');
      }
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Could not verify applicant credentials.');
      setLoginError(message);
      toast.error(message);
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
            {data && <button type="button" className="notification-switch-button" onClick={() => { setData(null); setMode('check'); }}>Switch / Check Another ID</button>}
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18}/></button>
          </div>
        </div>

        {data ? (
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
          <div className="notification-title"><strong>Applicant Notifications</strong>{unreadCount > 0 && <span className="notification-header-count">{unreadCount}</span>}</div>
          <div className="notification-header-actions">
            {data && <button type="button" className="notification-switch-button" onClick={() => { setData(null); setMode('check'); }}>Switch / Check Another ID</button>}
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18}/></button>
          </div>
        </div>
        {data ? <>
          <div className="applicant-login-summary"><strong>{data.name}</strong><span>{data.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor'} · {data.wing}</span><span className="badge badge-green">{data.status.replaceAll('_', ' ')}</span></div>
          <div className="notification-list">{data.notifications.map((notice) => <button type="button" key={notice._id} className={`notification-item ${notice.readAt ? '' : 'unread'}`} onClick={() => markRead(notice._id)}><span className="notification-unread-dot" aria-hidden="true"/><span><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small><small>{notice.body}</small></span></button>)}</div>
          {data.notifications.length === 0 && <p className="muted">No notifications yet.</p>}
          <Button type="button" variant="secondary" onClick={signOut}>Sign out</Button>
        </> : <div className="notification-desktop-content">
          <div className="applicant-tabs" role="tablist" aria-label="Applicant access">
            <button role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'active' : ''}`} type="button" onClick={() => setMode('signup')}>Sign Up</button>
            <button role="tab" aria-selected={mode === 'check'} className={`tab ${mode === 'check' ? 'active' : ''}`} type="button" onClick={() => setMode('check')}>Check Application</button>
          </div>
          {mode === 'check' && <form className="form applicant-login-form" onSubmit={applicantLogin}>
            {loginError && <p className="applicant-error-message" role="alert">{loginError}</p>}
            <label>Application ID<Input required autoComplete="username" className="notification-form-input" value={applicationId} onChange={(event) => setApplicationId(event.target.value)}/></label>
            <label>Private Access Code<Input required autoComplete="current-password" className="notification-form-input" value={accessCode} onChange={(event) => setAccessCode(event.target.value)}/></label>
            <Button className="notification-submit-button" disabled={busy}>{busy ? 'Verifying…' : 'Continue to 2FA'}</Button>
          </form>}
          {mode === 'signup' && <p className="muted" style={{ padding: 16 }}>Sign-up is available from the applicant panel. Complete the form and submit for review.</p>}
        </div>}
      </section>
    ))}
  </div>;
}
