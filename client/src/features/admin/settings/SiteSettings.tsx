import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';

type Settings = Record<string, unknown> & {
  heroImage?: string;
  founderPhoto?: string;
  founderPhotoIsPlaceholder?: boolean;
  founderResearchDomains?: string[];
};

export function SiteSettings() {
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['site-settings-admin'],
    queryFn: async () => (await api.get('/admin/settings')).data.data as Settings
  });
  const { data: media } = useQuery({
    queryKey: ['media-options'],
    queryFn: async () => (await api.get('/admin/media')).data.data as Array<{ _id: string; url: string; filename: string }>
  });
  const [form, setForm] = useState<Settings | null>(null);
  const fields = form || data || {};
  const update = (key: string, value: unknown) => setForm({
    ...fields,
    [key]: value,
    ...(key === 'founderPhoto' ? { founderPhotoIsPlaceholder: !value } : {})
  });
  const upload = (key: 'heroImage' | 'founderPhoto') => (url: string) => update(key, url);

  return <>
    <h1>Site settings</h1>
    {isLoading && <p role="status">Loading site settings…</p>}
    {isError && <p role="alert" className="applicant-error-message">Could not load site settings. <Button type="button" variant="secondary" onClick={() => void refetch()}>Try again</Button></p>}
    {data && <form className="form settings-form" onSubmit={async (event) => {
      event.preventDefault();
      if (saving) return;
      setSaving(true);
      try {
        await api.put('/admin/settings', fields);
        await refetch();
        await Promise.all([
          client.invalidateQueries({ queryKey: ['public-settings'] }),
          client.invalidateQueries({ queryKey: ['team-founder'] })
        ]);
        toast.success('Settings saved and published.');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not save settings');
      } finally {
        setSaving(false);
      }
    }}>
      <h2>Homepage content</h2>
      {['siteName', 'heroTitle', 'contactEmail', 'contactPhone', 'address', 'seoTitle'].map((key) =>
        <label key={key}>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}
          <Input value={String(fields[key] || '')} onChange={(event) => update(key, event.target.value)}/>
        </label>
      )}
      <label>Homepage subtitle<RichTextEditor value={String(fields.heroSubtitle || '')} onChange={(value) => update('heroSubtitle', value)}/></label>
      <label>Mission statement<RichTextEditor value={String(fields.missionText || '')} onChange={(value) => update('missionText', value)}/></label>
      <label>SEO description<Input value={String(fields.seoDescription || '')} onChange={(event) => update('seoDescription', event.target.value)}/></label>
      <div className="settings-image-field"><span className="dynamic-image-label">Homepage hero image</span>
        <ImageUploader value={String(fields.heroImage || '')} onUploaded={upload('heroImage')} shape="banner" helperText="Recommended: 800 × 450 px • 16:9 Ratio • Max 2MB" maxSizeMB={2}/>
      </div>
      {fields.heroImage && <Button type="button" variant="danger" onClick={() => update('heroImage', '')}>Remove hero image</Button>}
      <label>Select an image from media gallery
        <select className="select" value={String(fields.heroImage || '')} onChange={(event) => update('heroImage', event.target.value)}>
          <option value="">No image (use abstract artwork)</option>
          {(media || []).map((asset) => <option key={asset._id} value={asset.url}>{asset.filename}</option>)}
        </select>
      </label>
      <div className="media-picker">{(media || []).map((asset) =>
        <button type="button" className={`media-option ${fields.heroImage === asset.url ? 'selected' : ''}`} key={asset._id} onClick={() => update('heroImage', asset.url)}>
          <img src={asset.url} alt={asset.filename}/><span>{asset.filename}</span>
        </button>
      )}</div>

      <div className="admin-section-divider"/>
      <h2>Founder profile</h2>
      <p className="muted">Founder details appear on the ASPIER Team page after saving.</p>
      <label>Founder name<Input value={String(fields.founderName || 'Md Saazid Bin Saif')} onChange={(event) => update('founderName', event.target.value)}/></label>
      <label>Founder designation / title<Input value={String(fields.founderTitle || 'Founder, ASPIER')} onChange={(event) => update('founderTitle', event.target.value)}/></label>
      <div className="settings-image-field"><span className="dynamic-image-label">Founder picture</span>
        <ImageUploader value={String(fields.founderPhoto || '')} onUploaded={upload('founderPhoto')} shape="circle" helperText="Recommended: 400 × 400 px, 1:1 Square, Max 2MB" maxSizeMB={2}/>
        {fields.founderPhotoIsPlaceholder && <p className="muted">Illustrative avatar placeholder. Replace it with a verified founder portrait.</p>}
      </div>
      {fields.founderPhoto && <Button type="button" variant="danger" onClick={() => update('founderPhoto', '')}>Remove founder picture</Button>}
      <label>Google Scholar ID<Input value={String(fields.founderGoogleScholarId || '')} onChange={(event) => update('founderGoogleScholarId', event.target.value)}/></label>
      <label>Google Scholar profile URL<Input type="url" value={String(fields.founderGoogleScholarUrl || '')} onChange={(event) => update('founderGoogleScholarUrl', event.target.value)}/></label>
      <label>Founder description / subtitle<Input value={String(fields.founderDescription || '')} onChange={(event) => update('founderDescription', event.target.value)}/></label>
      <label>Founder biography / statement<RichTextEditor value={String(fields.founderBio || '')} onChange={(value) => update('founderBio', value)}/></label>
      <label>Research domains<textarea className="textarea" rows={3} placeholder="Separate domains with commas" value={Array.isArray(fields.founderResearchDomains) ? fields.founderResearchDomains.join(', ') : ''} onChange={(event) => update('founderResearchDomains', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}/></label>
      <Button disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
    </form>}
  </>;
}
