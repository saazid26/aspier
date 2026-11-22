import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const rules = {
    length: newPassword.length >= 10,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    symbol: /[^A-Za-z0-9]/.test(newPassword),
    matches: Boolean(newPassword && confirmPassword && newPassword === confirmPassword)
  };

  const allValid =
    rules.length &&
    rules.uppercase &&
    rules.lowercase &&
    rules.number &&
    rules.symbol &&
    rules.matches &&
    Boolean(currentPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      toast.error('New passwords do not match');
      return;
    }

    if (!rules.length || !rules.uppercase || !rules.lowercase || !rules.number || !rules.symbol) {
      setError('Please fulfill all password security requirements before saving.');
      toast.error('Password does not fulfill security requirements');
      return;
    }

    setBusy(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        password: newPassword,
        confirmPassword
      });

      const message = response.data?.message || 'Administrator password updated successfully.';
      toast.success(message);
      setSuccess('Your password has been securely updated in the database. Future logins will require this new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Could not update password');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card admin-change-password-card" style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <KeyRound size={22} color="#148f83" />
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1b5660' }}>
          Change Administrator Password
        </h3>
      </div>
      <p className="muted" style={{ fontSize: '0.92rem', marginBottom: 20 }}>
        Update the primary credentials for the administrator account (<code>admin@gmail.com</code>). The updated password is cryptographically hashed with bcrypt and stored strictly in the database.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: 16, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 14px', borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', marginBottom: 16, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="#059669" />
          <span>{success}</span>
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} style={{ maxWidth: 580 }}>
        <label>
          Current Password
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input
              required
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#557178', padding: 4 }}
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
            >
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label>
          New Password
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input
              required
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter strong new password (min. 10 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#557178', padding: 4 }}
              aria-label={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label>
          Confirm New Password
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input
              required
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#557178', padding: 4 }}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {/* Live Security Checklist */}
        <div style={{ background: 'rgba(20,143,131,0.05)', border: '1px solid rgba(20,143,131,0.15)', borderRadius: 10, padding: '12px 16px', margin: '6px 0 12px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1b5660', display: 'block', marginBottom: 6 }}>
            Security Requirements:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4px 12px', fontSize: '0.8rem' }}>
            <span style={{ color: rules.length ? '#059669' : '#6b7280' }}>
              {rules.length ? '✓' : '○'} At least 10 characters
            </span>
            <span style={{ color: rules.uppercase ? '#059669' : '#6b7280' }}>
              {rules.uppercase ? '✓' : '○'} Uppercase letter (A-Z)
            </span>
            <span style={{ color: rules.lowercase ? '#059669' : '#6b7280' }}>
              {rules.lowercase ? '✓' : '○'} Lowercase letter (a-z)
            </span>
            <span style={{ color: rules.number ? '#059669' : '#6b7280' }}>
              {rules.number ? '✓' : '○'} Number (0-9)
            </span>
            <span style={{ color: rules.symbol ? '#059669' : '#6b7280' }}>
              {rules.symbol ? '✓' : '○'} Symbol / Special character
            </span>
            <span style={{ color: rules.matches ? '#059669' : '#6b7280' }}>
              {rules.matches ? '✓' : '○'} Passwords match
            </span>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <Button disabled={busy || !allValid}>
            {busy ? 'Updating Password…' : 'Update Administrator Password'}
          </Button>
        </div>
      </form>
    </section>
  );
}
