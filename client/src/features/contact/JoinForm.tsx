import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Upload, X, ExternalLink, Loader2 } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', email: '', phone: '', wing: '', role: '', education: '', researchDomain: '', cvUrl: '', cvFileName: '', statement: '' });
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState('');
  const cvInputRef = useRef<HTMLInputElement>(null);

  const handleCvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCvError('');
    if (file.size > 10 * 1024 * 1024) {
      setCvError('CV file must be 10MB or smaller.');
      toast.error('CV file must be 10MB or smaller.');
      if (cvInputRef.current) cvInputRef.current.value = '';
      return;
    }
    const isAllowed = /\.(pdf|doc|docx)$/i.test(file.name) ||
      ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
    if (!isAllowed) {
      setCvError('Only PDF, DOC, or DOCX files are permitted.');
      toast.error('Only PDF, DOC, or DOCX files are permitted.');
      if (cvInputRef.current) cvInputRef.current.value = '';
      return;
    }

    setCvUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/public/join/cv', fd);
      const url = res.data?.data?.secure_url || res.data?.data?.url;
      const originalName = res.data?.data?.original_filename || file.name;
      if (!url) throw new Error('Upload failed');
      setForm((prev) => ({ ...prev, cvUrl: url, cvFileName: originalName }));
      toast.success('CV uploaded successfully!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Could not upload CV file. Please try again.';
      setCvError(msg);
      toast.error(msg);
    } finally {
      setCvUploading(false);
      if (cvInputRef.current) cvInputRef.current.value = '';
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCvError('');
    if (!form.cvUrl) {
      setCvError('Curriculum Vitae (CV) attachment is required.');
      toast.error('Please upload your Curriculum Vitae (CV) in PDF, DOC, or DOCX format.');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post('/public/join', form);
      const access = { applicationId: response.data.data.applicationId, accessCode: response.data.data.accessCode };
      localStorage.setItem('aspier-membership-access', JSON.stringify(access));
      sessionStorage.setItem('aspier-applicant-access', JSON.stringify(access));
      window.dispatchEvent(new Event('aspier-applicant-access'));
      setReceipt(access);
      setForm({ name: '', email: '', phone: '', wing: '', role: '', education: '', researchDomain: '', cvUrl: '', cvFileName: '', statement: '' });
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
      <div className="space-y-1.5">
        <label className="block font-semibold text-sm text-slate-800">
          Curriculum Vitae (CV) * <span className="font-normal text-slate-500">(Required — PDF, DOC, or DOCX, Max 10MB)</span>
        </label>
        {!form.cvUrl ? (
          <div className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => void handleCvUpload(e)}
              disabled={cvUploading}
              className="hidden"
              id="join-cv-upload"
            />
            <label
              htmlFor="join-cv-upload"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:border-teal-600 text-slate-700 hover:text-teal-800 text-sm font-semibold cursor-pointer transition w-fit shadow-2xs"
            >
              {cvUploading ? <Loader2 className="w-4 h-4 animate-spin text-teal-700" /> : <Upload className="w-4 h-4 text-teal-700" />}
              <span>{cvUploading ? 'Uploading CV…' : 'Choose CV File (PDF / DOC / DOCX)'}</span>
            </label>
            <small className="text-xs text-slate-500">Attach your up-to-date academic or research CV for Stage 1 committee review.</small>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-5 h-5 text-teal-700 shrink-0" />
              <span className="font-semibold text-teal-950 truncate">{form.cvFileName || 'Uploaded CV'}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={form.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 text-xs font-semibold no-underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Preview</span>
              </a>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, cvUrl: '', cvFileName: '' }))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                title="Remove CV"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        )}
        {cvError && <p className="text-xs font-semibold text-rose-600 m-0" role="alert">{cvError}</p>}
      </div>
      <label>Statement of interest (optional)<textarea className="textarea" rows={5} maxLength={3000} value={form.statement} onChange={(event) => setForm({ ...form, statement: event.target.value })}/></label>
      <Button disabled={busy || cvUploading}>{busy ? 'Submitting…' : 'Submit initial application'}</Button>
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
