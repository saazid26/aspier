import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
type Session = { refreshTokenHash: string; device?: string; ip?: string; revokedAt?: string };
export function ActiveSessions() {
  const [revoking, setRevoking] = useState('');
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/auth/sessions')).data.data as Session[]
  });
  const revoke = async (session: Session) => {
    setRevoking(session.refreshTokenHash);
    try {
      await api.delete(`/auth/sessions/${session.refreshTokenHash}`);
      toast.success('Session revoked');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not revoke session.'));
    } finally {
      setRevoking('');
    }
  };
  return <section className="card" style={{marginTop:16}}>
    <h2>Active sessions</h2>
    {isLoading && <p role="status">Loading sessions…</p>}
    {isError && <p role="alert">Could not load active sessions. <Button type="button" variant="secondary" onClick={() => void refetch()}>Try again</Button></p>}
    {!isLoading && !isError && data.length === 0 && <p className="muted">No active sessions.</p>}
    {data.map((session) => <div key={session.refreshTokenHash} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'8px 0'}}>
      <span>{session.device || 'Unknown device'} • {session.ip || 'Unknown IP'}</span>
      {!session.revokedAt && <Button type="button" variant="danger" disabled={revoking === session.refreshTokenHash} onClick={() => void revoke(session)}>{revoking === session.refreshTokenHash ? 'Revoking…' : 'Revoke'}</Button>}
    </div>)}
  </section>;
}
