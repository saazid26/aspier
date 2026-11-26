import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { api, getApiErrorMessage } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from './AuthContext';

export function StudentAuthGate() {
  const { user, login } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    department: '',
    password: '',
    confirmPassword: ''
  });

  const nonStudentRole = user && user.role && !['student', 'instructor'].includes(user.role)
    ? user.role
    : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBusy(true);
    try {
      const response = await api.post('/auth/login', {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        role: 'learner'
      });
      const resData = response.data;
      const rawUser = resData?.user || resData?.data?.user || resData?.data;
      const token = resData?.token || resData?.data?.token;
      const csrfToken = resData?.csrfToken || resData?.data?.csrfToken;
      login(rawUser, token, csrfToken);
      toast.success('Signed in to Student Portal');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Invalid email or password');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (regForm.password !== regForm.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    const passwordValid =
      regForm.password.length >= 8 &&
      /[a-z]/.test(regForm.password) &&
      /[A-Z]/.test(regForm.password) &&
      /\d/.test(regForm.password) &&
      !regForm.password.toLowerCase().includes('password') &&
      !regForm.password.includes('123456');

    if (!passwordValid) {
      setErrorMsg('Password must be 8+ characters with uppercase, lowercase, and a number.');
      return;
    }

    setBusy(true);
    try {
      const response = await api.post('/auth/register', {
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        phone: regForm.phone.trim(),
        university: regForm.university.trim(),
        department: regForm.department.trim(),
        password: regForm.password,
        role: 'student'
      });
      const resData = response.data;
      const rawUser = resData?.user || resData?.data?.user || resData?.data;
      const token = resData?.token || resData?.data?.token;
      const csrfToken = resData?.csrfToken || resData?.data?.csrfToken;
      login(rawUser, token, csrfToken);
      toast.success('Student account created! Welcome to ASPIER Academy.');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Could not create student account');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Student Portal | Sign In or Register | ASPIER Academy" />
      <main className="container section" style={{ maxWidth: 520, margin: '4vh auto 8vh' }}>
        <div className="mb-4">
          <Link
            to="/academy"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900 no-underline"
          >
            ← Back to ASPIER Academy
          </Link>
        </div>

        <div className="card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">
                ASPIER Academy
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 m-0">
                Student Portal Access
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-5">
            Sign in with your student credentials or create a new student account to access your courses, Google Classroom links, and certificates.
          </p>

          {nonStudentRole && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                You are currently signed in with a non-student role (<strong>{nonStudentRole}</strong>). Please sign in with a Student account or register a new Student account below.
              </span>
            </div>
          )}

          {/* Auth Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => { setTab('login'); setErrorMsg(''); }}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-0'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Student Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => { setTab('register'); setErrorMsg(''); }}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent border-0'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Student Account</span>
            </button>
          </div>

          {errorMsg && (
            <p className="applicant-error-message mb-4" role="alert">
              {errorMsg}
            </p>
          )}

          {tab === 'login' ? (
            <form className="form" onSubmit={handleLogin}>
              <label>
                Student Email Address
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="student@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <Input
                  required
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </label>
              <Button disabled={busy} className="w-full justify-center mt-2">
                {busy ? 'Signing in…' : 'Sign In to Student Portal'}
              </Button>
              <div className="flex justify-between items-center mt-3 text-xs">
                <Link className="text-slate-500 hover:text-teal-700" to="/academy/forgot">
                  Forgot password?
                </Link>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setErrorMsg(''); }}
                  className="text-teal-700 font-semibold underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Need an account? Register
                </button>
              </div>
            </form>
          ) : (
            <form className="form" onSubmit={handleRegister}>
              <label>
                Full Name *
                <Input
                  required
                  placeholder="e.g. Ayesha Rahman"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </label>
              <label>
                Email Address *
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="student@example.com"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </label>
              <label>
                Mobile / WhatsApp Number
                <Input
                  type="tel"
                  placeholder="e.g. 017XXXXXXXX"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  University / Institution
                  <Input
                    placeholder="e.g. University of Dhaka"
                    value={regForm.university}
                    onChange={(e) => setRegForm({ ...regForm, university: e.target.value })}
                  />
                </label>
                <label>
                  Department
                  <Input
                    placeholder="e.g. Geography & Environment"
                    value={regForm.department}
                    onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  Password *
                  <Input
                    required
                    type="password"
                    autoComplete="new-password"
                    placeholder="8+ chars (A-z, 0-9)"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  />
                </label>
                <label>
                  Confirm Password *
                  <Input
                    required
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={regForm.confirmPassword}
                    onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  />
                </label>
              </div>
              <Button disabled={busy} className="w-full justify-center mt-2">
                {busy ? 'Creating Account…' : 'Create Student Account'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
