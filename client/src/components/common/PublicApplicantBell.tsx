import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Orbit, X } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const bellRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('signup');
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
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const openSignup = () => {
      setMode('signup');
      setOpen(true);
      onOpenChange?.(true);
      setSignupError('');
    };
    window.addEventListener('aspier-open-signup', openSignup);
    return () => window.removeEventListener('aspier-open-signup', openSignup);
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
        <div className="notification-title"><strong>Applicant Notifications</strong>{unreadCount > 0 && <span className="notification-header-count">{unreadCount}</span>}</div>
        <div className="notification-header-actions">
          {data && <button type="button" className="notification-switch-button" onClick={() => { setData(null); setMode('check'); }}>Switch / Check Another ID</button>}
          <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>
      </div>
      {data ? <>
        <div className="applicant-login-summary">
          <strong>{data.name}</strong>
          <span>{data.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor'} · {data.wing}</span>
          <span className="badge badge-green">{data.status.replaceAll('_', ' ')}</span>
        </div>
        <div className="notification-list">{data.notifications.map((notice) => <button type="button" key={notice._id} className={`notification-item ${notice.readAt ? '' : 'unread'}`} onClick={() => markRead(notice._id)}>
          <span className="notification-unread-dot" aria-hidden="true"/><span><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small><small>{notice.body}</small></span>
        </button>)}</div>
        {data.notifications.length === 0 && <p className="muted">No notifications yet.</p>}
        <Button type="button" variant="secondary" onClick={signOut}>Sign out</Button>
      </> : <>
        <div className="applicant-tabs" role="tablist" aria-label="Applicant access">
          <button role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'active' : ''}`} type="button" onClick={() => setMode('signup')}>Sign Up</button>
          <button role="tab" aria-selected={mode === 'check'} className={`tab ${mode === 'check' ? 'active' : ''}`} type="button" onClick={() => setMode('check')}>Check Application</button>
        </div>
        {mode === 'signup' && (pendingAt ? <div className="applicant-pending card" role="status">
          <span className="applicant-pending-icon"><Orbit size={26}/></span>
          <strong>Pending verification</strong>
          <p>Your sign-up is with the ASPIER team for review. After approval, use the Application ID and Private Access Code provided by the team to check your application here.</p>
          <span className="applicant-elapsed">Time in review: {formatElapsed(Math.max(0, Math.floor((now - pendingAt) / 1000)))}</span>
          <Button type="button" variant="secondary" onClick={() => { setPendingAt(null); sessionStorage.removeItem('aspier-signup-pending-at'); setSignup(initialSignup); }}>Submit another sign-up</Button>
        </div> : <form className="form applicant-signup-form" onSubmit={submitSignup}>
          <p className="muted">Create an applicant profile. After review, ASPIER will provide the Application ID and Private Access Code needed to check your status here.</p>
          {signupError && <p className="applicant-error-message" role="alert">{signupError}</p>}
          <label>Full name<Input required minLength={2} maxLength={120} value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })}/></label>
          <label>Email address<Input required type="email" autoComplete="email" value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })}/></label>
          <label>Phone number<Input required type="tel" value={signup.phone} onChange={(event) => setSignup({ ...signup, phone: event.target.value })}/></label>
          <label>Password<Input required type="password" autoComplete="new-password" minLength={8} value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })}/></label>
          <label>Confirm password<Input required type="password" autoComplete="new-password" minLength={8} value={signup.confirmPassword} onChange={(event) => setSignup({ ...signup, confirmPassword: event.target.value })}/></label>
          <label>Role<select className="input" value={signup.role} onChange={(event) => setSignup({ ...signup, role: event.target.value as typeof signup.role })}><option value="youngScholar">Young Scholar</option><option value="supervisor">Supervisor</option></select></label>
          <label>Preferred Wing<select className="input" required value={signup.wing} onChange={(event) => setSignup({ ...signup, wing: event.target.value })}><option value="">Select a Wing</option>{wings.map((wing) => <option value={wing.name} key={wing._id}>{wing.name}</option>)}</select></label>
          <label>Institution / University<Input required value={signup.institution} onChange={(event) => setSignup({ ...signup, institution: event.target.value })}/></label>
          <label>Academic status / profession<Input required placeholder="Undergraduate, PhD, Faculty…" value={signup.academicStatus} onChange={(event) => setSignup({ ...signup, academicStatus: event.target.value })}/></label>
          <Button disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</Button>
        </form>)}
        {mode === 'check' && <form className="form applicant-login-form" onSubmit={applicantLogin}>
          <p className="muted">Enter the Application ID and Private Access Code sent by ASPIER. Google Authenticator verification is required to view your status and notifications.</p>
          {loginError && <p className="applicant-error-message" role="alert">{loginError}</p>}
          <label>Application ID<Input required autoComplete="username" className="notification-form-input" value={applicationId} onChange={(event) => setApplicationId(event.target.value)}/></label>
          <div className="notification-copy-row">
            <code className="notification-code-box">{applicationId || 'Application ID will appear here'}</code>
            {applicationId && <button type="button" onClick={() => void copyText(applicationId, 'application-id')}>{copied === 'application-id' ? 'Copied!' : 'Copy'}</button>}
          </div>
          <label>Private Access Code<Input required autoComplete="current-password" className="notification-form-input" value={accessCode} onChange={(event) => setAccessCode(event.target.value)}/></label>
          <div className="notification-copy-row">
            <code className="notification-code-box break-all">{accessCode || 'Private Access Code will appear here'}</code>
            {accessCode && <button type="button" onClick={() => void copyText(accessCode, 'access-code')}>{copied === 'access-code' ? 'Copied!' : 'Copy'}</button>}
          </div>
          {loginStep === 'setup' && totpSetup && <div className="applicant-totp-setup">
            <h3>Set up Google Authenticator</h3>
            <p>Scan the QR code in Google Authenticator, then enter its current six-digit code to bind 2FA.</p>
            <img src={totpSetup.qrDataUrl} alt="Google Authenticator setup QR code"/>
            <label>Manual setup key<code>{totpSetup.manualKey}</code></label>
          </div>}
          {loginStep === 'otp' && <p className="muted">Enter the current 6-digit code from Google Authenticator.</p>}
          {loginStep !== 'credentials' && <label>6-digit authenticator code<Input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}/></label>}
          <Button className="notification-submit-button" disabled={busy}>{busy ? 'Verifying…' : loginStep === 'credentials' ? 'Continue to 2FA' : 'Verify and continue'}</Button>
        </form>}
      </>}
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
