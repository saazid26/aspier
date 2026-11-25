import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { staticWings } from '../../lib/staticData';

type ApplicationReceipt = { applicationId: string; accessCode: string };

export function JoinForm() {
  const { data: remoteWings = [] } = useQuery({
    queryKey: ['wings'],
    queryFn: async () => (await api.get('/public/wings')).data.data as Array<{ slug: string; name: string }>,
    initialData: staticWings
  });
  const wings = remoteWings && remoteWings.length > 0 ? remoteWings : staticWings;
  const [form, setForm] = useState({ name: '', email: '', phone: '', wing: '', role: '', education: '', researchDomain: '', statement: '' });
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.post('/public/join', form);
      const access = { applicationId: response.data.data.applicationId, accessCode: response.data.data.accessCode };
      localStorage.setItem('aspier-membership-access', JSON.stringify(access));
      sessionStorage.setItem('aspier-applicant-access', JSON.stringify(access));
      window.dispatchEvent(new Event('aspier-applicant-access'));
      setReceipt(access);
      setForm({ name: '', email: '', phone: '', wing: '', role: '', education: '', researchDomain: '', statement: '' });
      toast.success('Your application has been submitted.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit application');
    } finally {
      setBusy(false);
    }
  };

  if (receipt) return <main className="container section" style={{ maxWidth: 720 }}>
    <SEO title="Application Submitted | ASPIER" description="Your ASPIER fellowship application has been received." />
    <article className="card">
      <span className="eyebrow">Application received</span>
      <h1>Thank you for applying to ASPIER</h1>
      <p className="muted">Keep your application ID and private access code. You need both to check the review and complete membership after approval. Save them securely; they are shown only here.</p>
      <label>Application ID<Input readOnly value={receipt.applicationId}/></label>
      <label>Private access code<Input readOnly value={receipt.accessCode}/></label>
      <p className="muted">The access code is shown only once here. Store it safely.</p>
      <button
        type="button"
        className="button button-secondary cursor-pointer"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('aspier-open-check-application', {
            detail: { applicationId: receipt.applicationId, accessCode: receipt.accessCode }
          }));
        }}
      >
        Open application portal
      </button>
    </article>
  </main>;

  return <main className="container section" style={{ maxWidth: 720 }}>
    <SEO
      title="Join the ASPIER Team | Supervisors & Young Scholars Application"
      description="Apply to join ASPIER as a Research Supervisor or Young Scholar. Membership application is 100% free across all stages."
      keywords="Join ASPIER, ASPIER fellowship, ASPIER Young Scholars, ASPIER Research Supervisors, research application, free academic fellowship"
      canonicalPath="/join"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Join ASPIER', path: '/join' }
      ]}
    />
    <span className="eyebrow">Membership application</span>
    <h1>Join the ASPIER Team</h1>
    <p className="muted">Joining ASPIER is completely free for all applicants across all stages. Submit your initial application in Stage 1, and if approved, complete your academic profile in Stage 2 at no cost.</p>
    <form className="form" onSubmit={submit}>
      <label>Apply as
        <select className="select" required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="">Select a role</option>
          <option value="supervisor">Supervisor</option>
          <option value="youngScholar">Young Scholar</option>
        </select>
      </label>
      <label>Full name<Input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
      <label>Email<Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label>
      <label>Phone<Input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label>
      <label>Preferred academic wing<select className="select" required value={form.wing} onChange={(event) => setForm({ ...form, wing: event.target.value })}><option value="">Select a wing</option>{wings.map((wing) => <option key={wing.slug} value={wing.name}>{wing.name}</option>)}</select></label>
      <label>
        Education
        <Input
          required
          value={form.education}
          onChange={(event) => setForm({ ...form, education: event.target.value })}
          placeholder="e.g., B.Sc. (Hons) in Geography and Environmental Studies, University of Rajshahi"
        />
      </label>
      <label>
        Research Domain
        <Input
          required
          value={form.researchDomain}
          onChange={(event) => setForm({ ...form, researchDomain: event.target.value })}
          placeholder="e.g., GIS, Remote Sensing, Climate Modeling, Hydrology (comma-separated)"
        />
      </label>
      <label>Statement of interest (optional)<textarea className="textarea" rows={5} maxLength={3000} value={form.statement} onChange={(event) => setForm({ ...form, statement: event.target.value })}/></label>
      <Button disabled={busy}>{busy ? 'Submitting…' : 'Submit initial application'}</Button>
    </form>
    <p className="muted" style={{ marginTop: 18 }}>
      Already applied?{' '}
      <button
        type="button"
        className="text-teal-700 underline font-semibold cursor-pointer bg-transparent border-0 p-0 inline text-inherit"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('aspier-open-check-application'));
        }}
      >
        Check your application and membership status
      </button>.
    </p>
  </main>;
}
