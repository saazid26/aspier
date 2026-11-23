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
  membershipFee?: number;
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
    <h1>Payment & membership settings</h1>
    {data && <form className="form" style={{ maxWidth: 680 }} onSubmit={async (event) => {
      event.preventDefault();
      try {
        await api.put('/admin/settings', fields);
        await refetch();
        toast.success('Payment and membership settings saved.');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not save payment settings');
      }
    }}>
      <h2>Academy payment numbers</h2>
      <label>bKash<Input value={String(fields.bkashNumber || '')} onChange={(event) => update('bkashNumber', event.target.value)}/></label>
      <label>Nagad<Input value={String(fields.nagadNumber || '')} onChange={(event) => update('nagadNumber', event.target.value)}/></label>
      <label>Payment instructions<textarea className="textarea" rows={3} value={String(fields.paymentInstructions || '')} onChange={(event) => update('paymentInstructions', event.target.value)}/></label>
      <div className="admin-section-divider"/>
      <h2>Membership billing</h2>
      <label>Membership fee (BDT)<Input type="number" min="0" value={Number(fields.membershipFee ?? 0)} onChange={(event) => update('membershipFee', Number(event.target.value))}/></label>
      <p className="muted">Joining ASPIER as a Supervisor or Young Scholar is completely free across all stages. Default membership fee: BDT 0.</p>
      <Button>Save changes</Button>
    </form>}
  </>;
}
