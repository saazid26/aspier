import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SEO } from '../../components/common/SEO';

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAcademy = location.pathname.startsWith('/academy');
  const redirect = searchParams.get('redirect');
  const passwordHint = 'Use 8+ characters with uppercase, lowercase, and a number.';

  return (
    <>
      <SEO title="Student Registration" />
      <main className="auth-card">
        <h1>Create Student Account</h1>
        <p className="muted">Join ASPIER Academy to enroll in courses and access learning modules.</p>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setFormError('');
            if (form.password !== form.confirmPassword) {
              setFormError('Passwords do not match');
              return;
            }
            const passwordChecks = form.password.length >= 8 && /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) && /\d/.test(form.password) && !form.password.toLowerCase().includes('password') && !form.password.includes('123456');
            if (!passwordChecks) {
              setFormError(passwordHint);
              return;
            }
            setBusy(true);
            try {
              await api.post('/auth/register', {
                name: form.name,
                email: form.email,
                password: form.password
              });
              toast.success('Account created! Please sign in.');
              const defaultLogin = isAcademy ? '/academy/login' : '/login';
              const loginTarget = redirect ? `${defaultLogin}?redirect=${encodeURIComponent(redirect)}` : defaultLogin;
              navigate(loginTarget);
            } catch (error: any) {
              const msg = getApiErrorMessage(error, 'Registration failed');
              setFormError(msg);
              toast.error(msg);
            } finally {
              setBusy(false);
            }
          }}
        >
          {formError && <p className="applicant-error-message" role="alert">{formError}</p>}
          <label>
            Full Name
            <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Email Address
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Password
            <Input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <small className="muted">{passwordHint}</small>
          </label>
          <label>
            Confirm Password
            <Input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </label>
          <Button disabled={busy}>{busy ? 'Creating account…' : 'Create Student Account'}</Button>
        </form>
        <p className="muted" style={{ marginTop: 16, fontSize: '0.88rem', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link
            to={redirect
              ? (isAcademy ? `/academy/login?redirect=${encodeURIComponent(redirect)}` : `/login?redirect=${encodeURIComponent(redirect)}`)
              : (isAcademy ? '/academy/login' : '/login')}
            style={{ textDecoration: 'underline' }}
          >
            Sign in here
          </Link>
        </p>
      </main>
    </>
  );
}

