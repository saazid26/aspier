import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getApiErrorMessage } from '../../lib/api';
export function Reset() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const passwordChecks = password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && !password.toLowerCase().includes('password') && !password.includes('123456');
    if (!passwordChecks) {
      setError('Use 8+ characters with uppercase, lowercase, and a number. Avoid common passwords.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token: params.get('token') || '', password, confirmPassword: password });
      toast.success('Password reset. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Could not reset the password.');
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return <main className="auth-card"><h1>Choose a password</h1><form className="form" onSubmit={submit}>
    {error && <p className="applicant-error-message" role="alert">{error}</p>}
    <label>New password<Input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}/><small className="muted">Use 8+ characters with uppercase, lowercase, and a number.</small></label>
    <Button disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</Button>
  </form></main>;
}
