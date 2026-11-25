import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

type PaymentSettingsValue = {
  bkashNumber?: string;
  nagadNumber?: string;
  paymentInstructions?: string;
};

export function PaymentSettings() {
  const { data, refetch } = useQuery({
    queryKey: ['payment-settings-admin'],
    queryFn: async () => (await api.get('/admin/settings')).data.data as PaymentSettingsValue
  });
  const [form, setForm] = useState<PaymentSettingsValue | null>(null);
  const fields = form || data || {};
  const update = (key: keyof PaymentSettingsValue, value: string | number) => setForm({ ...fields, [key]: value });

  return <>
    <h1>Student Course Payment Accounts (Students Only)</h1>
    <p className="muted" style={{ marginBottom: 16 }}>Configures bKash & Nagad merchant numbers and payment instructions strictly for Aspire Academy student course enrollments. (No fees apply to Young Scholars or Supervisors.)</p>
    {data && <form className="form" style={{ maxWidth: 680 }} onSubmit={async (event) => {
      event.preventDefault();
      try {
        await api.put('/admin/settings', fields);
        await refetch();
        toast.success('Student course payment settings saved.');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not save payment settings');
      }
    }}>
      <h2>Academy student payment numbers</h2>
      <label>bKash Merchant / Personal Number<Input value={String(fields.bkashNumber || '')} onChange={(event) => update('bkashNumber', event.target.value)} placeholder="01603012448"/></label>
      <label>Nagad Number<Input value={String(fields.nagadNumber || '')} onChange={(event) => update('nagadNumber', event.target.value)} placeholder="01603012448"/></label>
      <label>Student Course Payment Instructions<textarea className="textarea" rows={3} value={String(fields.paymentInstructions || '')} onChange={(event) => update('paymentInstructions', event.target.value)} placeholder="Send the course fee by bKash or Nagad, then submit the exact transaction ID for verification."/></label>
      <Button>Save changes</Button>
    </form>}
  </>;
}
