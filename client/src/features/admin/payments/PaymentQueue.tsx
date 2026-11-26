import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../../lib/api';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';

type Payment = {
  _id: string;
  userId?: { name?: string; email?: string };
  studentName?: string;
  studentEmail?: string;
  courseId?: { title?: string };
  trxId: string;
  submittedAt: string;
  status: string;
};

export function PaymentQueue() {
  const [busy, setBusy] = useState('');
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['payment-queue'],
    queryFn: async () => (await api.get('/admin/payments')).data.data as Payment[]
  });
  const act = async (payment: Payment, action: 'approve' | 'reject') => {
    let reason: string | null = null;
    if (action === 'reject') {
      reason = window.prompt('Rejection reason');
      if (reason === null) return;
      reason = reason.trim() || 'Invalid transaction';
    }
    setBusy(payment._id);
    try {
      await api.post(`/payments/${payment._id}/${action}`, action === 'reject' ? { reason } : {});
      toast.success(action === 'approve' ? 'Payment approved' : 'Payment rejected');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Could not ${action} payment.`));
    } finally {
      setBusy('');
    }
  };

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm('Are you sure you want to permanently delete this payment record?')) return;
    setBusy(payment._id);
    try {
      await api.delete(`/admin/payments/${payment._id}`);
      queryClient.setQueryData<Payment[]>(['payment-queue'], (prev = []) =>
        prev.filter((item) => item._id !== payment._id)
      );
      toast.success('Payment record permanently deleted');
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not delete payment record.'));
    } finally {
      setBusy('');
    }
  };

  if (isLoading) return <p role="status">Loading payment queue…</p>;
  if (isError) return <p role="alert" className="applicant-error-message">Could not load payments. <button className="button button-secondary" type="button" onClick={() => void refetch()}>Try again</button></p>;
  return <><h1>Payment queue ({data.length})</h1><Table headers={['Student','Course','TrxID','Submitted','SLA','Actions']}>
    {data.map((payment) => {
      const age = Date.now() - new Date(payment.submittedAt).getTime();
      const remaining = Math.max(0, 6 * 3600000 - age);
      const displayName = payment.studentName || (payment.userId?.name !== 'ASPIER Administrator' ? payment.userId?.name : '') || payment.studentEmail || (payment.userId?.email !== 'admin@gmail.com' ? payment.userId?.email : '') || 'Student';
      return <tr key={payment._id}>
        <td>
          <div>{displayName}</div>
          {(payment.studentEmail || (payment.userId?.email && payment.userId.email !== 'admin@gmail.com')) && (
            <small className="muted" style={{ fontFamily: 'monospace' }}>{payment.studentEmail || payment.userId?.email}</small>
          )}
        </td>
        <td>{payment.courseId?.title}</td>
        <td>{payment.trxId}</td>
        <td>{new Date(payment.submittedAt).toLocaleString()}</td>
        <td><Badge tone={remaining === 0 ? 'red' : remaining < 3600000 ? 'yellow' : 'green'}>{remaining === 0 ? 'SLA exceeded' : `${Math.ceil(remaining / 3600000)}h remaining`}</Badge></td>
        <td>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {payment.status === 'pending' && <>
              <button type="button" className="button button-primary" disabled={busy === payment._id} onClick={() => void act(payment, 'approve')}>{busy === payment._id ? 'Processing…' : 'Approve'}</button>
              <button type="button" className="button button-danger" disabled={busy === payment._id} onClick={() => void act(payment, 'reject')}>Reject</button>
            </>}
            <button type="button" className="button button-danger" disabled={busy === payment._id} onClick={() => void handleDelete(payment)}>Delete</button>
          </div>
        </td>
      </tr>;
    })}
  </Table></>;
}
