import { useQuery } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

export function WebAuthnSettings() {
  const { data, refetch } = useQuery({
    queryKey: ['account-security'],
    queryFn: async () => (await api.get('/auth/me')).data.data as { webAuthnEnabled?: boolean }
  });

  const enroll = async () => {
    try {
      const { data: options } = await api.post('/auth/webauthn/register/options');
      const credential = await startRegistration({ optionsJSON: options.data as PublicKeyCredentialCreationOptionsJSON });
      await api.post('/auth/webauthn/register/verify', { response: credential });
      await refetch();
      toast.success('Platform biometric authentication enabled.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Could not enable platform biometric authentication');
    }
  };

  return <section className="card">
    <h2>Face Recognition / Biometric Security</h2>
    <p className="muted">Register this device’s platform authenticator. Supported devices can verify with Face ID, Windows Hello, or another device biometric; the biometric template stays on your device.</p>
    {data?.webAuthnEnabled
      ? <p className="badge badge-green">Platform authenticator enabled</p>
      : <Button onClick={() => void enroll()}>Enable Face Recognition / Biometric Security</Button>}
  </section>;
}
