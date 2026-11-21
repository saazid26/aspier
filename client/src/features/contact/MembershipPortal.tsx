import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ImageUploader } from '../../components/forms/ImageUploader';

type PortalData = {
  applicationId: string;
  name: string;
  email: string;
  role: string;
  wing: string;
  status: string;
  membershipFee?: number;
  bkashNumber?: string;
  nagadNumber?: string;
  paymentInstructions?: string;
  activationCode?: string;
  notifications: Array<{ _id: string; title: string; body: string; createdAt: string; readAt?: string; activationCode?: string }>;
};

const initialAccess = (): { applicationId: string; accessCode: string } => {
  try {
    const stored = localStorage.getItem('aspier-membership-access');
    return stored ? JSON.parse(stored) as { applicationId: string; accessCode: string } : { applicationId: '', accessCode: '' };
  } catch {
    return { applicationId: '', accessCode: '' };
  }
};

export function MembershipPortal() {
  const [access, setAccess] = useState(initialAccess);
  const [details, setDetails] = useState<PortalData | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [profile, setProfile] = useState({
    name: '', presentAddress: '', permanentAddress: '', designation: '', institution: '', educationalBackground: '',
    googleScholar: '', researchGate: '', orcid: '', linkedin: '', bio: '', researchDomains: '', photo: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PortalData['notifications'][number] | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const set = (key: string, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await api.post('/public/membership/lookup', access);
      setDetails(response.data.data);
      setProfile((current) => ({ ...current, name: response.data.data.name }));
      localStorage.setItem('aspier-membership-access', JSON.stringify(access));
      sessionStorage.setItem('aspier-applicant-access', JSON.stringify(access));
      window.dispatchEvent(new Event('aspier-applicant-access'));
    } catch (error: any) {
      setDetails(null);
      toast.error(error.response?.data?.message || 'Could not find application');
    }
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!details) return;
    setBusy(true);
    try {
      const response = await api.post(`/public/membership/${details.applicationId}/profile`, {
        ...profile,
        accessCode: access.accessCode,
        researchDomains: profile.researchDomains.split(',').map((domain) => domain.trim()).filter(Boolean),
        ...(details.role === 'youngScholar' ? { paymentMethod, trxId } : {})
      });
      setDetails({ ...details, status: response.data.data.status });
      toast.success('Final academic profile submitted for review.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit membership profile');
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!details) return;
    setBusy(true);
    try {
      const response = await api.post(`/public/membership/${details.applicationId}/payment`, {
        accessCode: access.accessCode,
        paymentMethod,
        trxId
      });
      setDetails({ ...details, status: response.data.data.status });
      toast.success('Transaction ID submitted for payment verification.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit payment details');
    } finally {
      setBusy(false);
    }
  };

  const copyPaymentNumber = async () => {
    const number = (paymentMethod === 'bKash' ? details?.bkashNumber : details?.nagadNumber) || '01603012448';
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      toast.success('Copied!');
    } catch {
      toast.error('Clipboard access is unavailable. Please copy the number manually.');
    }
  };

  const requestAccessCode = async () => {
    try {
      await api.post('/public/membership/access-code', { applicationId: access.applicationId, email: recoveryEmail });
      toast.success('If the application details match, an administrator will review your access recovery request.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not request an access code');
    }
  };
  const openNotification = async (notice: PortalData['notifications'][number]) => {
    setSelectedNotification(notice);
    if (!notice.readAt && details) {
      try {
        await api.post(`/public/membership/${details.applicationId}/notifications/${notice._id}/read`, { accessCode: access.accessCode });
        setDetails({ ...details, notifications: details.notifications.map((item) => item._id === notice._id ? { ...item, readAt: new Date().toISOString() } : item) });
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not mark notification as read');
      }
    }
  };

  const categoryLabel = details?.role === 'youngScholar' ? 'Young Scholar' : 'Supervisor';

  return <main className="container section" style={{ maxWidth: 820 }}>
    <span className="eyebrow">Applicant portal</span>
    <h1>Membership status & verification</h1>
    {!details && <form className="form card" onSubmit={lookup}>
      <p className="muted">Enter the application ID and private access code displayed when you submitted your application.</p>
      <label>Application ID<Input required value={access.applicationId} onChange={(event) => setAccess({ ...access, applicationId: event.target.value })}/></label>
      <label>Private access code<Input required value={access.accessCode} onChange={(event) => setAccess({ ...access, accessCode: event.target.value })}/></label>
      <Button>Check application</Button>
      <div className="access-code-recovery">
        <label>Email used on application<Input type="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)}/></label>
        <Button type="button" variant="secondary" disabled={!access.applicationId || !recoveryEmail} onClick={requestAccessCode}>Request access-code recovery</Button>
      </div>
    </form>}
    {details && <section className="card membership-status-card" style={{ marginTop: 20 }}>
      <div className="section-head"><div><h2>{details.name}</h2><p className="muted">{categoryLabel} · {details.wing} · {details.email}</p></div><span className="badge badge-green">{details.status.replaceAll('_', ' ')}</span></div>
      <button className="notification-bell applicant-notification-trigger" type="button" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
        <Bell size={18} aria-hidden="true"/> Notifications {details.notifications.some((notice) => !notice.readAt) && <span className="notification-count">{details.notifications.filter((notice) => !notice.readAt).length}</span>}
      </button>
      {notificationsOpen && <section className="applicant-notifications">
        <h3>Notification center</h3>
        {details.notifications.length === 0 && <p className="muted">No notifications yet.</p>}
        {details.notifications.map((notice) => <button type="button" className={`notification-item ${notice.readAt ? '' : 'unread'}`} key={notice._id} onClick={() => void openNotification(notice)}>
          <span className="notification-unread-dot" aria-hidden="true"/>
          <span><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></span>
        </button>)}
        {selectedNotification && <article className="notification-detail"><strong>{selectedNotification.title}</strong><p>{selectedNotification.body}</p>{selectedNotification.activationCode && <div className="activation-code-box"><p>One-time Secret Activation Code</p><code>{selectedNotification.activationCode}</code></div>}<small>{new Date(selectedNotification.createdAt).toLocaleString()}</small></article>}
      </section>}
      {details.status === 'initial_pending' && <p>Your initial application is pending review. We’ll notify you when it is reviewed.</p>}
      {details.status === 'membership_pending' && <>
        <h3>Congratulations — your {categoryLabel} application is approved!</h3>
        <h3>Stage 2: Complete your academic profile</h3>
        <form className="form" onSubmit={submitProfile}>
        {details.role === 'youngScholar' && <>
          <p>Young Scholar Stage 2 includes a <strong>৳1,000 BDT</strong> membership payment. Send it via bKash or Nagad, then submit your TrxID with your academic profile and photo.</p>
          {details.paymentInstructions && <p className="muted">{details.paymentInstructions}</p>}
          <div className="auth-mode-tabs" role="tablist" aria-label="Payment method">
            <button className={`button ${paymentMethod === 'bKash' ? 'button-primary' : 'button-secondary'}`} type="button" onClick={() => setPaymentMethod('bKash')}>bKash</button>
            <button className={`button ${paymentMethod === 'Nagad' ? 'button-primary' : 'button-secondary'}`} type="button" onClick={() => setPaymentMethod('Nagad')}>Nagad</button>
          </div>
          <div className="activation-code-box"><p>Official {paymentMethod} number</p><code>{(paymentMethod === 'bKash' ? details.bkashNumber : details.nagadNumber) || '01603012448'}</code><Button type="button" variant="secondary" onClick={() => void copyPaymentNumber()}>Copy Number</Button></div>
          <label>Transaction ID (TrxID)<Input required minLength={3} maxLength={80} value={trxId} onChange={(event) => setTrxId(event.target.value)}/></label>
        </>}
        {details.role === 'supervisor' && <p>Supervisor membership is free. No payment or transaction details are required.</p>}
          <label>Full name<Input required value={profile.name} onChange={(event) => set('name', event.target.value)}/></label>
          <label>Present address<textarea className="textarea" rows={2} required value={profile.presentAddress} onChange={(event) => set('presentAddress', event.target.value)}/></label>
          <label>Permanent address<textarea className="textarea" rows={2} required value={profile.permanentAddress} onChange={(event) => set('permanentAddress', event.target.value)}/></label>
          <label>Current profession / designation<Input required placeholder="Professor, Researcher, Student…" value={profile.designation} onChange={(event) => set('designation', event.target.value)}/></label>
          <label>University / institution<Input required value={profile.institution} onChange={(event) => set('institution', event.target.value)}/></label>
          <label>Educational background<textarea className="textarea" rows={4} required placeholder="Degrees and institutions" value={profile.educationalBackground} onChange={(event) => set('educationalBackground', event.target.value)}/></label>
          <label>Google Scholar profile URL<Input type="url" value={profile.googleScholar} onChange={(event) => set('googleScholar', event.target.value)}/></label>
          <label>ResearchGate profile URL<Input type="url" value={profile.researchGate} onChange={(event) => set('researchGate', event.target.value)}/></label>
          <label>ORCID<Input value={profile.orcid} onChange={(event) => set('orcid', event.target.value)}/></label>
          <label>LinkedIn profile URL<Input type="url" value={profile.linkedin} onChange={(event) => set('linkedin', event.target.value)}/></label>
          <label>Short research bio<textarea className="textarea" rows={5} required minLength={20} value={profile.bio} onChange={(event) => set('bio', event.target.value)}/></label>
          <label>Research domains (comma-separated)<Input required placeholder="Environmental science, GIS…" value={profile.researchDomains} onChange={(event) => set('researchDomains', event.target.value)}/></label>
          <label>Profile picture
            <ImageUploader
              value={profile.photo}
              onUploaded={(url) => set('photo', url)}
              helperText="Recommended: 400 × 400 px, 1:1 Square, Max 2MB"
              maxSizeMB={2}
              endpoint={`/public/membership/${details.applicationId}/photo`}
              headers={{ 'X-Application-Code': access.accessCode }}
            />
          </label>
          <Button disabled={busy || !profile.photo}>{busy ? 'Submitting…' : 'Submit Final Application'}</Button>
          {!profile.photo && <span className="muted">Upload a profile picture to submit the final application.</span>}
        </form>
      </>}
      {details.status === 'final_pending' && <p>Your final academic application has been submitted. The ASPIER team will review it and notify you when it is accepted or needs changes.</p>}
      {details.status === 'payment_pending' && details.role === 'youngScholar' && <>
        <h3>Stage 2: Membership payment</h3>
        <p>Membership fee: <strong>৳{details.membershipFee ?? 0} BDT</strong></p>
        {details.paymentInstructions && <p className="muted">{details.paymentInstructions}</p>}
        <div className="auth-mode-tabs" role="tablist" aria-label="Payment method">
          <button className={`button ${paymentMethod === 'bKash' ? 'button-primary' : 'button-secondary'}`} type="button" onClick={() => setPaymentMethod('bKash')}>bKash</button>
          <button className={`button ${paymentMethod === 'Nagad' ? 'button-primary' : 'button-secondary'}`} type="button" onClick={() => setPaymentMethod('Nagad')}>Nagad</button>
        </div>
        <div className="activation-code-box"><p>Official {paymentMethod} number</p><code>{(paymentMethod === 'bKash' ? details.bkashNumber : details.nagadNumber) || '01603012448'}</code><Button type="button" variant="secondary" onClick={() => void copyPaymentNumber()}>Copy Number</Button><p>Send the membership fee using the selected payment service, then enter your transaction ID below.</p></div>
        <form className="form" onSubmit={submitPayment}>
          <label>Transaction ID (TrxID)<Input required minLength={3} maxLength={80} value={trxId} onChange={(event) => setTrxId(event.target.value)}/></label>
          <Button disabled={busy}>{busy ? 'Submitting…' : 'Submit TrxID for verification'}</Button>
        </form>
      </>}
      {details.status === 'verification_pending' && <p>{details.role === 'youngScholar' ? 'Your academic profile and BDT 1,000 payment TrxID have been submitted. An administrator will verify both before publishing your profile.' : 'Your profile is awaiting administrator approval.'}</p>}
      {details.status === 'published' && <><p>Your profile is approved and published on the ASPIER Team page.</p><Link to="/team">View ASPIER Team</Link></>}
      {details.status === 'rejected' && <p>This application was not approved. Contact ASPIER if you need more information.</p>}
      <button className="button button-secondary" type="button" style={{ marginTop: 16 }} onClick={() => setDetails(null)}>Check another application</button>
    </section>}
  </main>;
}
