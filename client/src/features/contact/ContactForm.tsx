import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { usePageSEO } from '../../hooks/usePageSEO';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getApiErrorMessage } from '../../lib/api';

export function ContactForm() {
  usePageSEO({
    title: 'Contact ASPIER Global — Official Inquiries & Support',
    description:
      'Get in touch with ASPIER Global for academic collaborations, ASPIER Academy course inquiries, and research partnerships.',
    path: '/contact'
  });
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/public/contact', form);
      toast.success('Message sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Could not send your message.');
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return <main className="container section" style={{maxWidth:680}}>
    <SEO
      title="Contact ASPIER Global — Official Inquiries & Support"
      exact
      description="Get in touch with ASPIER Global for academic collaborations, ASPIER Academy course inquiries, and research partnerships."
      keywords="Contact ASPIER, ASPIER Global, ASPIER Academy, ASPIER Bangladesh, research collaboration, academic inquiry"
      canonicalPath="/contact"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Contact', path: '/contact' }
      ]}
    />
    <h1>Contact ASPIER</h1>
    <form className="form" onSubmit={submit}>
      {error && <p className="applicant-error-message" role="alert">{error}</p>}
      <label>Name<Input required minLength={2} value={form.name} onChange={(event) => setForm({...form,name:event.target.value})}/></label>
      <label>Email<Input required type="email" value={form.email} onChange={(event) => setForm({...form,email:event.target.value})}/></label>
      <label>Subject<Input required value={form.subject} onChange={(event) => setForm({...form,subject:event.target.value})}/></label>
      <label>Message<textarea className="textarea" required minLength={5} rows={6} value={form.message} onChange={(event) => setForm({...form,message:event.target.value})}/></label>
      <Button disabled={busy}>{busy ? 'Sending…' : 'Send message'}</Button>
    </form>
  </main>;
}
