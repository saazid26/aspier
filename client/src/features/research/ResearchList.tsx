import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';

type ResearchItem = {
  _id: string;
  slug: string;
  title: string;
  category: 'ongoing' | 'past' | 'future';
  abstract?: string;
  coverImage?: string;
  publicationUrl?: string;
  sampleData?: boolean;
};

const categories = [
  { id: 'ongoing', label: 'Ongoing Research' },
  { id: 'past', label: 'Past / Published Research Papers' },
  { id: 'future', label: 'Future Research' }
] as const;

export function ResearchList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category');
  const initialCategory = categories.some((entry) => entry.id === requestedCategory) ? requestedCategory as ResearchItem['category'] : 'ongoing';
  const [category, setCategory] = useState<ResearchItem['category']>(initialCategory);
  const [selected, setSelected] = useState<ResearchItem | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', institution: '', academicStatus: '', city: '', country: '', skills: '', statement: '', googleScholar: '', researchGate: '' });
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['research', category],
    queryFn: async () => (await api.get('/public/research', { params: { category } })).data.data as ResearchItem[]
  });
  useEffect(() => {
    const applicationId = searchParams.get('apply');
    const project = data.find((item) => item._id === applicationId);
    if (project) {
      setSelected(project);
      setSearchParams({}, { replace: true });
    }
  }, [data, searchParams, setSearchParams]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (cv) payload.append('cv', cv);
      await api.post(`/public/research/${selected._id}/applications`, payload);
      toast.success('Research collaboration application submitted.');
      setSelected(null);
      setCv(null);
      setForm({ name: '', email: '', phone: '', institution: '', academicStatus: '', city: '', country: '', skills: '', statement: '', googleScholar: '', researchGate: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit application');
    } finally {
      setBusy(false);
    }
  };

  return <section className="section">
    <div className="container">
      <span className="eyebrow">Research portal</span><h1>Research & collaboration</h1>
      <div className="tabs research-tabs" role="tablist" aria-label="Research categories">
        {categories.map((item) => <button key={item.id} className={`tab ${category === item.id ? 'active' : ''}`} role="tab" aria-selected={category === item.id} type="button" onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </div>
      {isLoading && <p role="status">Loading research…</p>}
      {isError && <p role="alert">Could not load research. Please try again.</p>}
      {!isLoading && !isError && !data.length && <p className="card muted">No research is currently listed in this category.</p>}
      <div className="grid research-grid">{data.map((item) => <article className="card research-card" key={item._id}>
        <Link className="research-media" to={`/research/${item.slug}`}>
          <CoverMedia
            src={item.coverImage}
            alt={`${item.title} cover`}
            fallbackLabel={item.category === 'ongoing' ? 'Ongoing Research' : item.category === 'past' ? 'Published Study' : 'Future Initiative'}
            className="research-cover-media"
            fallbackClassName={`research-cover-placeholder research-cover-${item.category}`}
          />
        </Link>
        {item.sampleData && <span className="badge-sample">Sample research</span>}
        <span className="badge badge-green">{categories.find((entry) => entry.id === item.category)?.label}</span>
        <h2><Link to={`/research/${item.slug}`}>{item.title}</Link></h2>
        {item.abstract && <RichTextContent content={item.abstract} className="muted research-excerpt"/>}
        {item.category === 'past' && item.publicationUrl && <a className="publication-link" href={item.publicationUrl.startsWith('http') ? item.publicationUrl : `https://${item.publicationUrl}`} target="_blank" rel="noreferrer">Publication / DOI</a>}
        {item.category !== 'past' && <Button onClick={() => setSelected(item)}>Apply to Join Research</Button>}
      </article>)}</div>
    </div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="modal research-application-modal" role="dialog" aria-modal="true" aria-labelledby="research-application-title">
        <div className="section-head"><div><span className="eyebrow">Research collaboration</span><h2 id="research-application-title">Apply to join</h2><p>{selected.title}</p></div><button className="button button-secondary" type="button" onClick={() => setSelected(null)}>Close</button></div>
        <form className="form" onSubmit={submit}>
          <label>Full name<Input required minLength={2} maxLength={120} value={form.name} onChange={(event) => update('name', event.target.value)}/></label>
          <label>Email address<Input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)}/></label>
          <label>Phone number<Input required value={form.phone} onChange={(event) => update('phone', event.target.value)}/></label>
          <label>Current institution / university<Input required value={form.institution} onChange={(event) => update('institution', event.target.value)}/></label>
          <label>Academic status / profession<Input required placeholder="Undergraduate, Master's, PhD, Faculty…" value={form.academicStatus} onChange={(event) => update('academicStatus', event.target.value)}/></label>
          <div className="research-location-fields"><label>City<Input required value={form.city} onChange={(event) => update('city', event.target.value)}/></label><label>Country<Input required value={form.country} onChange={(event) => update('country', event.target.value)}/></label></div>
          <label>Research, technical, analytical or lab skills (required)<textarea className="textarea" required minLength={2} maxLength={5000} rows={4} value={form.skills} onChange={(event) => update('skills', event.target.value)}/></label>
          <label>Statement of interest (optional)<textarea className="textarea" maxLength={5000} rows={4} value={form.statement} onChange={(event) => update('statement', event.target.value)}/></label>
          <label>Google Scholar URL (optional)<Input type="url" value={form.googleScholar} onChange={(event) => update('googleScholar', event.target.value)}/></label>
          <label>ResearchGate URL (optional)<Input type="url" value={form.researchGate} onChange={(event) => update('researchGate', event.target.value)}/></label>
          <label>CV / Resume (optional; PDF, DOC or DOCX, max 5MB)<input className="input" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setCv(event.target.files?.[0] || null)}/></label>
          <Button disabled={busy}>{busy ? 'Submitting…' : 'Submit research application'}</Button>
        </form>
      </section>
    </div>}
  </section>;
}
