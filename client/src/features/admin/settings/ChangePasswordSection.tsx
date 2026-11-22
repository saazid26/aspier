import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShieldCheck, KeyRound, Mail } from 'lucide-react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
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

  const isChangingPassword = Boolean(newPassword || confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Current password is required to verify administrator authorization.');
      return;
    }

    if (isChangingPassword) {
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
    } else if (!newEmail) {
      setError('Please provide a new email address or a new password to update.');
      return;
    }

    setBusy(true);
    try {
      const response = await api.post('/auth/admin/update-credentials', {
        currentPassword,
        newEmail: newEmail.trim() || undefined,
        newPassword: newPassword || undefined,
        confirmPassword: confirmPassword || undefined
      });

      const message = response.data?.message || 'Administrator credentials updated successfully.';
      toast.success(message);
      setSuccess('Your administrator credentials have been securely updated in the database (hashed with bcrypt). Future logins will require these credentials.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewEmail('');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Could not update administrator credentials');
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
          Administrator Password & Email Management
        </h3>
      </div>
      <p className="muted" style={{ fontSize: '0.92rem', marginBottom: 20 }}>
        Update the primary credentials for the administrator account. All passwords are cryptographically hashed using bcrypt before persistence in the database and are never stored in plain text.
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
          Current Password (Required for verification)
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

        <label style={{ marginTop: 12 }}>
          New Admin Email Address (Optional — leave blank to keep current)
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input
              type="email"
              placeholder="admin@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
        </label>

        <label style={{ marginTop: 12 }}>
          New Password (Optional — leave blank to keep current)
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Input
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

        {isChangingPassword && (
          <>
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

            {/* Password Requirements Checklist */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', margin: '14px 0', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#334155' }}>Password Strength Requirements:</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li style={{ color: rules.length ? '#16a34a' : '#64748b' }}>{rules.length ? '✓' : '○'} At least 10 characters long</li>
                <li style={{ color: rules.uppercase ? '#16a34a' : '#64748b' }}>{rules.uppercase ? '✓' : '○'} At least one uppercase letter (A-Z)</li>
                <li style={{ color: rules.lowercase ? '#16a34a' : '#64748b' }}>{rules.lowercase ? '✓' : '○'} At least one lowercase letter (a-z)</li>
                <li style={{ color: rules.number ? '#16a34a' : '#64748b' }}>{rules.number ? '✓' : '○'} At least one numeric digit (0-9)</li>
                <li style={{ color: rules.symbol ? '#16a34a' : '#64748b' }}>{rules.symbol ? '✓' : '○'} At least one special symbol or punctuation</li>
                {confirmPassword && (
                  <li style={{ color: rules.matches ? '#16a34a' : '#dc2626' }}>{rules.matches ? '✓ Passwords match' : '✕ Passwords do not match'}</li>
                )}
              </ul>
            </div>
          </>
        )}

        <Button disabled={busy} style={{ marginTop: 12 }}>
          {busy ? 'Verifying & Updating…' : 'Update Administrator Credentials'}
        </Button>
      </form>
    </section>
  );
}
