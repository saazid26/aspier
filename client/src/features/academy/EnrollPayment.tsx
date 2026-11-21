import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useMe } from '../auth/useMe';

export function EnrollPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, loading: meLoading } = useMe();
  const [form, setForm] = useState({ method: 'bKash', senderNumber: '', trxId: '', amount: '' });
  const [submitting, setSubmitting] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => (await api.get(`/academy/courses/${id}`)).data.data,
    enabled: Boolean(id)
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const r = await api.get('/public/settings');
      return r.data.data;
    }
  });

  useEffect(() => {
    if (course?.price && !form.amount) {
      setForm((prev) => ({ ...prev, amount: String(course.price) }));
    }
  }, [course]);

  if (meLoading || courseLoading) {
    return <main className="container section" style={{ maxWidth: 680 }}><p role="status">Loading enrollment…</p></main>;
  }

  const returnUrl = `/academy/courses/${id}/payment`;

  if (!me) {
    return (
      <main className="container section" style={{ maxWidth: 680 }}>
        <h1>Enroll in {course?.title || 'Course'}</h1>
        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: '32px 20px' }}>
          <h2>Sign in required</h2>
          <p className="muted" style={{ maxWidth: 460, margin: '12px auto 24px' }}>
            You need a student account to enroll in courses, submit payments, and access learning materials.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="button button-primary" to={`/academy/login?redirect=${encodeURIComponent(returnUrl)}`}>
              Sign In
            </Link>
            <Link className="button button-secondary" to={`/academy/register?redirect=${encodeURIComponent(returnUrl)}`}>
              Create Student Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container section" style={{ maxWidth: 680 }}>
      <span className="eyebrow">ASPIER Academy · Course Enrollment</span>
      <h1>Enroll in {course?.title || 'Course'}</h1>
      <div className="card" style={{ marginBottom: 20 }}>
        <p><strong>Course Fee:</strong> ৳{course?.price ?? '—'} BDT</p>
        <p><strong>bKash:</strong> {settings?.bkashNumber || '01603012448'}</p>
        <p><strong>Nagad:</strong> {settings?.nagadNumber || '01603012448'}</p>
        <p className="muted">{settings?.paymentInstructions || 'Send the course fee by bKash or Nagad, then submit your transaction ID for verification.'}</p>
      </div>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await api.post('/payments', {
              ...form,
              courseId: id,
              amount: Number(form.amount)
            });
            toast.success('Payment submitted for verification');
            navigate(`/academy/courses/${id}/payment-status`);
          } catch (e: any) {
            toast.error(e.response?.data?.message || 'Submission failed');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label>
          Payment Method
          <select className="select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </label>
        <label>
          Sender Number
          <Input
            required
            placeholder="017XXXXXXXX"
            value={form.senderNumber}
            onChange={(e) => setForm({ ...form, senderNumber: e.target.value })}
          />
        </label>
        <label>
          Transaction ID (TrxID)
          <Input
            required
            placeholder="e.g. 9J28AS87K"
            value={form.trxId}
            onChange={(e) => setForm({ ...form, trxId: e.target.value })}
          />
        </label>
        <label>
          Amount (BDT)
          <Input
            type="number"
            required
            readOnly={Boolean(course?.price)}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <Button disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for verification'}</Button>
      </form>
    </main>
  );
}

