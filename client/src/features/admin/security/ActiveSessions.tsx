import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

type Session = {
  refreshTokenHash: string;
  device?: string;
  ip?: string;
  createdAt?: string;
  revokedAt?: string;
};

export function ActiveSessions() {
  const [revoking, setRevoking] = useState('');
  const [revokingAll, setRevokingAll] = useState(false);

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

  const revokeAllOther = async () => {
    if (!window.confirm('Log out all other active sessions and devices? You will remain logged in on this browser.')) return;
    setRevokingAll(true);
    try {
      await api.post('/auth/sessions/revoke-all');
      toast.success('All other devices have been logged out.');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not log out other sessions.'));
    } finally {
      setRevokingAll(false);
    }
  };

  const activeCount = data.filter((s) => !s.revokedAt).length;

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px', color: '#1b5660' }}>Active Sessions & Device Management</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Active login sessions authenticated across your browsers and devices ({activeCount} active).
          </p>
        </div>
        {activeCount > 1 && (
          <Button variant="danger" disabled={revokingAll} onClick={revokeAllOther} style={{ fontSize: '0.85rem' }}>
            {revokingAll ? 'Logging out other devices…' : 'Logout All Other Devices'}
          </Button>
        )}
      </div>

      {isLoading && <p role="status">Loading active sessions…</p>}
      {isError && (
        <p role="alert" className="applicant-error-message">
          Could not load active sessions. <Button type="button" variant="secondary" onClick={() => void refetch()}>Try again</Button>
        </p>
      )}

      {!isLoading && !isError && data.length === 0 && <p className="muted">No active sessions found.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((session) => (
          <div
            key={session.refreshTokenHash}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              borderRadius: 8,
              background: session.revokedAt ? '#f8fafc' : '#ffffff',
              border: '1px solid #e2e8f0',
              opacity: session.revokedAt ? 0.6 : 1,
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: session.revokedAt ? '#64748b' : '#1e293b' }}>
                💻 {session.device || 'Web Browser'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                IP: {session.ip || 'Local / Cloud proxy'} • {session.createdAt ? `Started: ${new Date(session.createdAt).toLocaleString()}` : 'Current session'}
                {session.revokedAt && <span style={{ color: '#ef4444', marginLeft: 8 }}>[Revoked]</span>}
              </div>
            </div>

            {!session.revokedAt && (
              <Button
                type="button"
                variant="danger"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                disabled={revoking === session.refreshTokenHash}
                onClick={() => void revoke(session)}
              >
                {revoking === session.refreshTokenHash ? 'Revoking…' : 'Revoke Session'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
