import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

type SecurityStatus = { enabled: boolean; setupPending: boolean };

export function Setup2FA() {
  const [status, setStatus] = useState<SecurityStatus>({ enabled: false, setupPending: false });
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [strongKey, setStrongKey] = useState('');
  const [confirmStrongKey, setConfirmStrongKey] = useState('');
  const [currentStrongKey, setCurrentStrongKey] = useState('');
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    const response = await api.get('/auth/admin-2fa/settings');
    setStatus(response.data.data);
  };

  useEffect(() => {
    void loadStatus().catch((error: any) => toast.error(error.response?.data?.message || 'Could not load security settings'));
  }, []);

  const beginSetup = async () => {
    setBusy(true);
    try {
      if (strongKey !== confirmStrongKey) throw new Error('Strong Authentication Keys do not match.');
      const response = await api.post('/auth/admin-2fa/settings/setup', {
        strongKey,
        confirmStrongKey,
        ...(status.enabled ? { currentStrongKey, currentTotpCode } : {})
      });
      setQr(response.data.data.qrCode);
      setSecret(response.data.data.secret);
      setCode('');
      toast.success('Scan the QR code, then verify the live authenticator code.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Could not start 2FA setup');
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    setBusy(true);
    try {
      await api.post('/auth/admin-2fa/settings/verify', { code });
      setStatus({ enabled: true, setupPending: false });
      setQr('');
      setSecret('');
      setStrongKey('');
      setConfirmStrongKey('');
      setCurrentStrongKey('');
      setCurrentTotpCode('');
      toast.success('Strong 2FA protection activated.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid authenticator code');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api.post('/auth/admin-2fa/settings/disable', { strongKey: currentStrongKey, code: currentTotpCode });
      setStatus({ enabled: false, setupPending: false });
      setCurrentStrongKey('');
      setCurrentTotpCode('');
      toast.success('Administrator 2FA has been disabled.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not disable 2FA');
    } finally {
      setBusy(false);
    }
  };

  return <section className="card admin-two-factor">
    <h2>Two-Factor Authentication (2FA) &amp; Strong Key</h2>
    <p className="muted">{status.enabled
      ? 'Administrator sign-in requires a live six-digit authenticator code and your Strong Master Authentication Key.'
      : '2FA is currently off. Admin sign-in uses the configured email and password until you activate this protection.'}</p>
    <p><strong>Status:</strong> {status.enabled ? 'Enabled' : 'Disabled'}</p>

    {!qr && <div className="form admin-2fa-management">
      {status.enabled && <>
        <h3>Verify your current credentials</h3>
        <label>Current Strong Master Authentication Key<Input type="password" autoComplete="current-password" value={currentStrongKey} onChange={(event) => setCurrentStrongKey(event.target.value)}/></label>
        <label>Current authenticator code<Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={currentTotpCode} onChange={(event) => setCurrentTotpCode(event.target.value)}/></label>
      </>}
      <h3>{status.enabled ? 'Update Strong Key and authenticator' : 'Set up Strong Key and authenticator'}</h3>
      <label>New Strong Master Authentication Key (16–128 characters)<Input type="password" autoComplete="new-password" minLength={16} maxLength={128} value={strongKey} onChange={(event) => setStrongKey(event.target.value)}/></label>
      <label>Confirm Strong Master Authentication Key<Input type="password" autoComplete="new-password" minLength={16} maxLength={128} value={confirmStrongKey} onChange={(event) => setConfirmStrongKey(event.target.value)}/></label>
      <Button type="button" disabled={busy || strongKey.length < 16 || !confirmStrongKey || (status.enabled && (!currentStrongKey || currentTotpCode.length !== 6))} onClick={() => void beginSetup()}>
        {status.enabled ? 'Update 2FA credentials' : 'Generate Google Authenticator QR'}
      </Button>
    </div>}

    {qr && <div className="admin-2fa-setup">
      <h3>Scan and verify</h3>
      <p>Scan this QR code in Google Authenticator, then enter its current six-digit code to activate your new credentials.</p>
      <img className="admin-2fa-qr" src={qr} alt="ASPIER administrator authenticator QR code"/>
      <p>Manual setup key: <code>{secret}</code></p>
      <div className="admin-2fa-verify">
        <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456"/>
        <Button type="button" disabled={busy || code.length !== 6} onClick={() => void activate()}>Activate Strong 2FA Protection</Button>
      </div>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => { setQr(''); setSecret(''); }}>Cancel setup</Button>
    </div>}

    {status.enabled && !qr && <Button type="button" variant="danger" disabled={busy || !currentStrongKey || currentTotpCode.length !== 6} onClick={() => void disable()}>
      Disable 2FA after verification
    </Button>}
  </section>;
}
