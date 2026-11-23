import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Lock } from 'lucide-react';
import { api, getApiErrorMessage } from '../../lib/api';
import { useCsrf } from '../../hooks/useCsrf';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SEO } from '../../components/common/SEO';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';

type Role = 'admin' | 'supervisor' | 'youngScholar' | 'learner';

export function Login() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const isAcademy = location.pathname.startsWith('/academy');
  const isStudentRedirect = Boolean(redirect && (redirect.includes('student') || redirect.includes('academy')));
  const isStudentLocked = isAcademy || isStudentRedirect;
  const [role, setRole] = useState<Role>(() => isStudentLocked ? 'learner' : 'admin');
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [strongKey, setStrongKey] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [webAuthnChallenge, setWebAuthnChallenge] = useState<{ token: string; options: PublicKeyCredentialRequestOptionsJSON } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  useCsrf();
  const navigate = useNavigate();

  const changeRole = (value: Role) => {
    setRole(value);
    setMode('login');
    setSetupToken('');
    setQrCode('');
    setRequiresOtp(false);
    setStrongKey('');
    setWebAuthnChallenge(null);
    setTotpCode('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      if (mode === 'activate') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        await api.post('/public/membership/activate', { role, activationCode, email, password, confirmPassword });
        toast.success('Member account activated. Sign in with your Gmail and new password.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setActivationCode('');
        return;
      }

      if (setupToken) {
        const response = await api.post('/auth/admin-2fa/verify', { setupToken, code: totpCode });
        setBackupCodes(response.data.data.backupCodes || []);
        setSetupToken('');
        setSetupComplete(true);
        toast.success('Two-factor protection is active.');
        return;
      }

      const response = await api.post('/auth/login', {
        email,
        password,
        role: role === 'learner' ? 'learner' : role,
        totpCode: totpCode || undefined,
        strongKey: strongKey || undefined
      });
      if (response.data.data.requires2FASetup) {
        const token = response.data.data.setupToken as string;
        const setup = await api.post('/auth/admin-2fa/setup', { setupToken: token });
        setSetupToken(token);
        if (!setup.data.data.qrCode) throw new Error('Authenticator setup did not return a QR code.');
        setQrCode(setup.data.data.qrCode);
        setSecret(setup.data.data.secret);
        toast('Set up an authenticator app before continuing.');
        return;
      }
      if (response.data.data.requires2FA) {
        if (response.data.data.webAuthn) setWebAuthnChallenge(response.data.data.webAuthn);
        if (requiresOtp) toast.error('The authenticator or recovery code was not accepted.');
        else toast('Enter your six-digit authenticator code or a recovery code.');
        setRequiresOtp(true);
        return;
      }
      toast.success('Signed in');
      const resolvedRole = response.data.data?.role || response.data.data?.user?.role;
      const defaultTarget = ['admin', 'superadmin'].includes(resolvedRole)
        ? '/admin'
        : '/academy/student';
      const target = redirect || defaultTarget;
      navigate(target);
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Login failed');
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const verifyWithBiometrics = async () => {
    if (!webAuthnChallenge) return;
    setFormError('');
    setBusy(true);
    try {
      const credential = await startAuthentication({ optionsJSON: webAuthnChallenge.options });
      const response = await api.post('/auth/webauthn/login/verify', { challengeToken: webAuthnChallenge.token, response: credential });
      toast.success('Biometric verification complete.');
      const resolvedBioRole = response.data.data?.role || response.data.data?.user?.role;
      const defaultTarget = ['admin', 'superadmin'].includes(resolvedBioRole)
        ? '/admin'
        : '/academy/student';
      navigate(redirect || defaultTarget);
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Biometric verification failed');
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const memberRole = role === 'supervisor' || role === 'youngScholar';
  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  return <>
    <SEO title={isStudentLocked ? "Student Portal Login | ASPIER Academy" : "Login"}/>
    <main className="auth-card">
      {isAcademy && (
        <Link
          to="/academy"
          className="back-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.86rem',
            color: '#148f83',
            marginBottom: 16,
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          ← Back to ASPIER Academy
        </Link>
      )}
      <h1>{mode === 'activate' ? 'Activate member account' : isStudentLocked ? 'Student Portal Login' : 'Welcome back'}</h1>
      <p className="muted">{isStudentLocked ? 'Sign in to access your courses and student dashboard.' : 'Sign in to the ASPIER platform.'}</p>
      {isStudentLocked && (
        <div
          className="student-login-notice"
          style={{
            margin: '12px 0 16px',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(20, 143, 131, 0.08)',
            border: '1px solid rgba(20, 143, 131, 0.25)',
            color: '#148f83',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>🎓</span>
          <span>Please sign in with your student credentials to access the Student Portal.</span>
        </div>
      )}
      {!setupComplete && <form className="form" onSubmit={submit}>
        {formError && <p className="applicant-error-message" role="alert">{formError}</p>}
        {!setupToken && (
          isStudentLocked ? (
            <label>
              Role
              <div
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-700 text-sm font-semibold select-none cursor-not-allowed"
                title="Student Portal login is locked to Student role"
              >
                <GraduationCap className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Student</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Locked
                </span>
              </div>
            </label>
          ) : (
            <label>Role
              <select className="select" required value={role} onChange={(event) => changeRole(event.target.value as Role)}>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="youngScholar">Young Scholar</option>
                <option value="learner">Student</option>
              </select>
            </label>
          )
        )}
        {memberRole && !setupToken && <div className="auth-mode-tabs">
          <button type="button" className={`button ${mode === 'activate' ? 'button-primary' : 'button-secondary'}`} onClick={() => setMode('activate')}>First-Time Registration (Activate with Secret Code)</button>
          <button type="button" className={`button ${mode === 'login' ? 'button-primary' : 'button-secondary'}`} onClick={() => setMode('login')}>Member Login</button>
        </div>}
        {mode === 'activate' ? <>
          <label>Secret activation code<Input required autoComplete="one-time-code" value={activationCode} onChange={(event) => setActivationCode(event.target.value)}/></label>
          <label>Gmail ID<Input required type="email" pattern=".+@gmail\.com" title="Use an address ending in @gmail.com" value={email} onChange={(event) => setEmail(event.target.value.toLowerCase())}/></label>
          <label>Create new password<Input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}/></label>
          <label>Confirm password<Input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}/></label>
        </> : <>
          <label>{memberRole ? 'Gmail ID' : 'Email'}<Input type="email" pattern={memberRole ? '.+@gmail\\.com' : undefined} value={email} onChange={(event) => setEmail(event.target.value.toLowerCase())} required/></label>
          <label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password"/></label>
          {(['admin', 'supervisor', 'youngScholar'].includes(role) && (requiresOtp || setupToken)) && <label>{setupToken ? 'Authenticator code to finish setup' : role === 'admin' ? '6-digit authenticator code' : 'Authenticator code or backup recovery code'}
            <Input required value={totpCode} onChange={(event) => setTotpCode(event.target.value)} placeholder="123456" autoComplete="one-time-code"/>
          </label>}
          {role === 'admin' && requiresOtp && <label>Strong Master Authentication Key
            <Input required type="password" autoComplete="current-password" value={strongKey} onChange={(event) => setStrongKey(event.target.value)}/>
          </label>}
          {webAuthnChallenge && !setupToken && <Button type="button" variant="secondary" disabled={busy} onClick={() => void verifyWithBiometrics()}>Verify with Face Recognition / Biometric</Button>}
        </>}
        <Button disabled={busy}>{busy ? 'Please wait…' : mode === 'activate' ? 'Activate account' : setupToken ? 'Verify and secure admin login' : 'Sign in'}</Button>
      </form>}
      {qrCode && <section className="admin-2fa-setup">
        <h2>Secure your {role === 'youngScholar' ? 'Young Scholar' : role === 'supervisor' ? 'Supervisor' : 'Admin'} account</h2>
        <p>Scan this QR code with Google Authenticator or another TOTP app. You must verify a six-digit code before continuing.</p>
        <img src={qrCode} alt="Admin authenticator setup QR code"/>
        <p><strong>Manual setup key:</strong> <code>{secret}</code> <Button type="button" variant="secondary" onClick={() => void copyToClipboard(secret, 'Setup key')}>Copy key</Button></p>
      </section>}
      {backupCodes.length > 0 && <section className="backup-codes" aria-live="polite">
        <h2>Save your recovery codes</h2>
        <p>Each code works once. Store them securely; they will not be shown again.</p>
        <code>{backupCodes.join('  ·  ')}</code>
        <Button type="button" variant="secondary" onClick={() => void copyToClipboard(backupCodes.join('\n'), 'Recovery codes')}>Copy recovery codes</Button>
        <a className="button button-secondary" download="aspier-recovery-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(`ASPIER one-time recovery codes\n\n${backupCodes.join('\n')}\n`)}`}>Download recovery codes</a>
      </section>}
      {setupComplete && <Button onClick={() => navigate(['admin', 'superadmin'].includes(role) ? '/admin' : '/student/dashboard')}>Continue to ASPIER</Button>}
      {!memberRole && !setupToken && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: '0.88rem' }}>
          <Link className="muted" to={isAcademy ? '/academy/forgot' : '/forgot'}>Forgot password?</Link>
          <Link
            className="muted"
            to={redirect ? `/academy/register?redirect=${encodeURIComponent(redirect)}` : '/academy/register'}
            style={{ textDecoration: 'underline', color: '#148f83', fontWeight: 600 }}
          >
            Create Student Account
          </Link>
        </div>
      )}
    </main>
  </>;
}
