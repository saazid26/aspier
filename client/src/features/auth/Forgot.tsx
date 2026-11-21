import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getApiErrorMessage } from '../../lib/api';
export function Forgot() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If the account exists, an administrator was notified in the ASPIER control panel.');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Could not request password help.');
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return <main className="auth-card"><h1>Reset password</h1><form className="form" onSubmit={submit}>
    {error && <p className="applicant-error-message" role="alert">{error}</p>}
    <label>Email<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label>
    <Button disabled={busy}>{busy ? 'Sending…' : 'Request password reset'}</Button>
  </form></main>;
}
