import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';

export function WebAuthnSettings() {
  const [enrolling, setEnrolling] = useState(false);
  const [deviceName, setDeviceName] = useState('My Device (Face Recognition / Windows Hello)');
  const [revokingId, setRevokingId] = useState('');

  // Status Query
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['account-security-status'],
    queryFn: async () => (await api.get('/auth/me')).data.data as { webAuthnEnabled?: boolean }
  });

  // Registered Biometric Credentials Query
  const { data: credentialsData, refetch: refetchCredentials } = useQuery({
    queryKey: ['admin-webauthn-credentials'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/webauthn/credentials');
        return res.data.data as Array<{ id: string; name: string; createdAt: string; transports?: string[] }>;
      } catch {
        return [];
      }
    }
  });

  const credentials = credentialsData || [];

  const enroll = async () => {
    setEnrolling(true);
    try {
      const { data: optionsRes } = await api.post('/auth/webauthn/register/options');
      const credential = await startRegistration({ optionsJSON: optionsRes.data as PublicKeyCredentialCreationOptionsJSON });
      await api.post('/auth/webauthn/register/verify', {
        response: credential,
        deviceName: deviceName.trim() || 'Device Biometrics (Face ID / Windows Hello)'
      });
      await refetchStatus();
      await refetchCredentials();
      toast.success('Face Recognition / Biometric device enrolled successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Could not enroll biometric device');
    } finally {
      setEnrolling(false);
    }
  };

  const revokeCredential = async (id: string, name: string) => {
    if (!window.confirm(`Revoke biometric credential "${name}"?`)) return;
    setRevokingId(id);
    try {
      await api.delete(`/auth/webauthn/credentials/${id}`);
      toast.success('Biometric device revoked.');
      await refetchStatus();
      await refetchCredentials();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not revoke credential');
    } finally {
      setRevokingId('');
    }
  };

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px', color: '#1b5660' }}>
            Face Recognition & Device Biometrics (WebAuthn / Passkeys)
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Verify administrator identity instantly using your device’s built-in Face ID, Windows Hello, or Touch ID.
          </p>
        </div>
        <Badge variant={status?.webAuthnEnabled ? 'green' : 'gray'}>
          {status?.webAuthnEnabled ? '✓ Biometrics Active' : 'Not Configured'}
        </Badge>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, margin: '16px 0' }}>
        <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: 8 }}>Enroll New Biometric / Face Recognition Device</h3>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 14 }}>
          Label this device so you can identify it in your enrolled keys list. When you click enroll, your operating system will prompt for Face Recognition or fingerprint verification.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Workstation Windows Hello / iPhone Face ID"
            />
          </div>
          <Button disabled={enrolling} onClick={() => void enroll()}>
            {enrolling ? 'Enrolling device…' : 'Enroll Face Recognition / Biometric'}
          </Button>
        </div>
      </div>

      {/* List of Registered Biometric Devices */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>Enrolled Biometric Devices & Keys ({credentials.length})</h3>
        {credentials.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            No platform biometric credentials registered yet. Use the tool above to add your first device.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {credentials.map((cred) => (
              <div
                key={cred.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 16px',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>👤 {cred.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Enrolled: {cred.createdAt ? new Date(cred.createdAt).toLocaleDateString() : 'Active'} • Key ID: {cred.id.slice(0, 16)}…
                  </div>
                </div>
                <Button
                  variant="danger"
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  disabled={revokingId === cred.id}
                  onClick={() => revokeCredential(cred.id, cred.name)}
                >
                  {revokingId === cred.id ? 'Revoking…' : 'Revoke Key'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
