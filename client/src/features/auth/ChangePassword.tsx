import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getApiErrorMessage } from '../../lib/api';
export function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const passwordChecks = form.password.length >= 8 && /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) && /\d/.test(form.password) && !form.password.toLowerCase().includes('password') && !form.password.includes('123456');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!passwordChecks) {
      setError('Use 8+ characters with uppercase, lowercase, and a number. Avoid common passwords.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/change-password', form);
      toast.success('Password changed');
      setForm({ currentPassword: '', password: '', confirmPassword: '' });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Could not change the password.');
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return <form className="form" onSubmit={submit}>
    {error && <p className="applicant-error-message" role="alert">{error}</p>}
    <label>Current password<Input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({...form,currentPassword:event.target.value})}/></label>
    <label>New password<Input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({...form,password:event.target.value})}/><small className="muted">Use 8+ characters with uppercase, lowercase, and a number.</small></label>
    <label>Confirm password<Input required type="password" minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({...form,confirmPassword:event.target.value})}/></label>
    <Button disabled={busy}>{busy ? 'Saving…' : 'Change password'}</Button>
  </form>;
}
