import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';

type HomeCmsData = Record<string, any>;

export function HomeCms() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-home-cms'],
    queryFn: async () => (await api.get('/admin/settings')).data.data as HomeCmsData
  });

  const [form, setForm] = useState<HomeCmsData | null>(null);
  const fields = form || data || {};

  const update = (key: string, value: any) => {
    setForm({ ...fields, [key]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', fields);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      toast.success('Home page content saved and published live.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save home page content');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p role="status">Loading Home Page CMS…</p>;

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>Home Page (/) Content Manager</h1>
          <p className="muted">Live edit Hero headlines, subtext, CTA buttons, Mission statement, Team preview banner, stats counters, and graphics.</p>
        </div>
      </div>

      <form className="form settings-form" onSubmit={handleSave}>
        {/* 1. Hero Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>1. Hero Section</h2>
          <p className="muted" style={{ marginBottom: 16 }}>The top banner greeting visitors when they land on ASPIER.</p>

          <label>
            Hero Headline (Main Title)
            <Input
              value={String(fields.heroTitle || 'Research for our planet and beyond')}
              onChange={(e) => update('heroTitle', e.target.value)}
              placeholder="Research for our planet and beyond"
            />
          </label>

          <label>
            Hero Subtitle / Description
            <RichTextEditor
              value={String(fields.heroSubtitle || 'The Aeronautical, Spatial, Planetary Institute for Environmental Research advances discovery across Earth and space.')}
              onChange={(val) => update('heroSubtitle', val)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
            <label>
              Primary CTA Button Text
              <Input
                value={String(fields.heroCtaText || 'Explore wings')}
                onChange={(e) => update('heroCtaText', e.target.value)}
              />
            </label>
            <label>
              Primary CTA Destination Link
              <Input
                value={String(fields.heroCtaLink || '/wings')}
                onChange={(e) => update('heroCtaLink', e.target.value)}
              />
            </label>
            <label>
              Secondary CTA Button Text
              <Input
                value={String(fields.heroSecondaryCtaText || 'Visit academy')}
                onChange={(e) => update('heroSecondaryCtaText', e.target.value)}
              />
            </label>
            <label>
              Secondary CTA Destination Link
              <Input
                value={String(fields.heroSecondaryCtaLink || '/academy')}
                onChange={(e) => update('heroSecondaryCtaLink', e.target.value)}
              />
            </label>
          </div>

          <div className="settings-image-field" style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Hero Featured Cover Graphic / Banner</label>
            <p className="muted" style={{ marginBottom: 12 }}>If no custom image is uploaded, the site displays the elegant abstract ASPIER planetary orbit artwork.</p>
            <ImageUploader
              value={fields.heroImage || ''}
              onUploaded={(url) => update('heroImage', url)}
              shape="banner"
              variant="cover"
              helperText="Recommended: 1200 × 675 px • 16:9 Ratio • Max 3MB"
              maxSizeMB={3}
            />
            {fields.heroImage && (
              <Button type="button" variant="secondary" style={{ marginTop: 8 }} onClick={() => update('heroImage', '')}>
                Remove Custom Hero Image (Revert to Abstract Art)
              </Button>
            )}
          </div>
        </div>

        {/* 2. Our Mission Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>2. Our Mission Section</h2>
          <p className="muted" style={{ marginBottom: 16 }}>The core vision statement panel beneath the hero section.</p>

          <label>
            Mission Headline
            <Input
              value={String(fields.missionHeadline || 'Rigorous inquiry, shared progress.')}
              onChange={(e) => update('missionHeadline', e.target.value)}
            />
          </label>

          <label>
            Mission Body Statement
            <RichTextEditor
              value={String(fields.missionText || 'We connect disciplines, support emerging researchers, and turn knowledge into practical public impact.')}
              onChange={(val) => update('missionText', val)}
            />
          </label>
        </div>

        {/* 3. Supervisors & Young Scholars Preview Banner */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>3. "Supervisors & Young Scholars" Preview Banner</h2>
          <p className="muted" style={{ marginBottom: 16 }}>The team preview card on the Home page inviting visitors to meet academic leaders.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <label>
              Eyebrow Label
              <Input
                value={String(fields.teamPreviewEyebrow || 'ASPIER Team')}
                onChange={(e) => update('teamPreviewEyebrow', e.target.value)}
              />
            </label>
            <label>
              Section Title
              <Input
                value={String(fields.teamPreviewTitle || 'Supervisors & Young Scholars')}
                onChange={(e) => update('teamPreviewTitle', e.target.value)}
              />
            </label>
          </div>

          <label style={{ marginTop: 12 }}>
            Callout Banner Headline
            <Input
              value={String(fields.teamPreviewBannerHeadline || 'Research guidance, collaborative discovery')}
              onChange={(e) => update('teamPreviewBannerHeadline', e.target.value)}
            />
          </label>

          <label>
            Callout Banner Subtext
            <textarea
              className="textarea"
              rows={2}
              value={String(fields.teamPreviewBannerSubtext || 'Meet the academic leaders and emerging researchers advancing work across our ten wings.')}
              onChange={(e) => update('teamPreviewBannerSubtext', e.target.value)}
            />
          </label>
        </div>

        {/* 4. Dynamic Stats Counters */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>4. Dynamic Stats Counters</h2>
          <p className="muted" style={{ marginBottom: 16 }}>The 4 highlight cards showing institutional accomplishments.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label>Counter 1 Number<Input value={String(fields.statWings || '10')} onChange={(e) => update('statWings', e.target.value)}/></label>
              <label style={{ marginTop: 6 }}>Counter 1 Label<Input value={String(fields.statWingsLabel || 'Academic wings')} onChange={(e) => update('statWingsLabel', e.target.value)}/></label>
            </div>
            <div>
              <label>Counter 2 Number<Input value={String(fields.statDomains || '25+')} onChange={(e) => update('statDomains', e.target.value)}/></label>
              <label style={{ marginTop: 6 }}>Counter 2 Label<Input value={String(fields.statDomainsLabel || 'Research domains')} onChange={(e) => update('statDomainsLabel', e.target.value)}/></label>
            </div>
            <div>
              <label>Counter 3 Number<Input value={String(fields.statTracks || '3')} onChange={(e) => update('statTracks', e.target.value)}/></label>
              <label style={{ marginTop: 6 }}>Counter 3 Label<Input value={String(fields.statTracksLabel || 'Academy tracks')} onChange={(e) => update('statTracksLabel', e.target.value)}/></label>
            </div>
            <div>
              <label>Counter 4 Number<Input value={String(fields.statAccess || '24/7')} onChange={(e) => update('statAccess', e.target.value)}/></label>
              <label style={{ marginTop: 6 }}>Counter 4 Label<Input value={String(fields.statAccessLabel || 'Digital access')} onChange={(e) => update('statAccessLabel', e.target.value)}/></label>
            </div>
          </div>
        </div>

        {/* 5. Bottom Call-to-Action Band */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>5. Bottom Call-To-Action Band</h2>
          <p className="muted" style={{ marginBottom: 16 }}>The concluding banner above the footer on the Home page.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <label>
              Eyebrow
              <Input
                value={String(fields.bottomCtaEyebrow || 'Explore ASPIER')}
                onChange={(e) => update('bottomCtaEyebrow', e.target.value)}
              />
            </label>
            <label>
              Headline
              <Input
                value={String(fields.bottomCtaHeadline || 'Discover research that moves forward')}
                onChange={(e) => update('bottomCtaHeadline', e.target.value)}
              />
            </label>
            <label>
              Button Text
              <Input
                value={String(fields.bottomCtaText || 'Explore research')}
                onChange={(e) => update('bottomCtaText', e.target.value)}
              />
            </label>
            <label>
              Button Destination Link
              <Input
                value={String(fields.bottomCtaLink || '/research')}
                onChange={(e) => update('bottomCtaLink', e.target.value)}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Button disabled={saving}>{saving ? 'Saving changes…' : 'Save & Publish Home Page'}</Button>
        </div>
      </form>
    </div>
  );
}
