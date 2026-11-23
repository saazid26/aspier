import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  const redirect = searchParams.get('redirect');
  const passwordHint = 'Use 8+ characters with uppercase, lowercase, and a number.';

  return (
    <>
      <SEO title="Student Registration | ASPIER Academy" />
      <main className="auth-card" style={{ maxWidth: 480, margin: '6vh auto 10vh' }}>
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

        <div
          className="badge badge-green"
          style={{
            display: 'inline-flex',
            marginBottom: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '5px 10px',
            borderRadius: 999
          }}
        >
          ASPIER ACADEMY • STUDENT REGISTRATION
        </div>

        <h1 style={{ margin: '4px 0 8px', fontSize: '1.75rem', color: '#173e4a' }}>Create Student Account</h1>
        <p className="muted" style={{ marginBottom: 22, fontSize: '0.94rem', lineHeight: 1.5 }}>
          Join ASPIER Academy to enroll in courses, join live class sessions, and access research learning modules.
        </p>

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
              toast.success('Student account created! Please sign in to continue.');
              const defaultLogin = '/academy/login';
              const targetRedirect = redirect || '/student';
              const loginTarget = `${defaultLogin}?redirect=${encodeURIComponent(targetRedirect)}`;
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
            <Input required minLength={2} placeholder="e.g. Nusrat Jahan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Email Address
            <Input required type="email" placeholder="e.g. student@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Password
            <Input
              required
              type="password"
              minLength={8}
              placeholder="••••••••"
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
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </label>
          <Button disabled={busy} style={{ width: '100%', marginTop: 8 }}>{busy ? 'Creating account…' : 'Create Student Account'}</Button>
        </form>

        <p className="muted" style={{ marginTop: 20, fontSize: '0.88rem', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link
            to={redirect
              ? `/academy/login?redirect=${encodeURIComponent(redirect)}`
              : `/academy/login?redirect=${encodeURIComponent('/student')}`}
            style={{ textDecoration: 'underline', color: '#148f83', fontWeight: 600 }}
          >
            Sign in here
          </Link>
        </p>
      </main>
    </>
  );
}

