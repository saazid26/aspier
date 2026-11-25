import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ImageUploader } from '../../../components/forms/ImageUploader';

type BrandingData = Record<string, any>;

export function BrandingSettings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-branding-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data.data as BrandingData
  });

  const [form, setForm] = useState<BrandingData | null>(null);
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
      toast.success('Branding & general settings saved successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p role="status">Loading branding settings…</p>;

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>General & Branding Settings</h1>
          <p className="muted">Manage platform titles, browser tab metadata, logos, footer, and organization details across ASPIER and ASPIER Academy.</p>
        </div>
      </div>

      <form className="form settings-form" onSubmit={handleSave}>
        {/* Logos & Assets */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Site Logos & Favicon</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Upload custom brand assets with uniform, zero-shift dimensions across desktop and mobile.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* ASPIER Logo */}
            <div className="settings-image-field">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>ASPIER Main Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <img
                  src={fields.aspierLogoUrl || '/aspier-logo.png'}
                  alt="ASPIER Logo Preview"
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                />
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current: {fields.aspierLogoUrl ? 'Custom uploaded' : 'Default asset'}</span>
                </div>
              </div>
              <ImageUploader
                value={fields.aspierLogoUrl || ''}
                onUploaded={(url) => update('aspierLogoUrl', url)}
                shape="circle"
                helperText="Square 1:1 image • PNG or WebP recommended • Max 2MB"
                maxSizeMB={2}
              />
              {fields.aspierLogoUrl && (
                <Button type="button" variant="secondary" style={{ marginTop: 8 }} onClick={() => update('aspierLogoUrl', '')}>
                  Reset to Default Logo
                </Button>
              )}
            </div>

            {/* ASPIER Academy Logo */}
            <div className="settings-image-field">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>ASPIER Academy Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <img
                  src={fields.academyLogoUrl || '/aspier-academy-logo.png'}
                  alt="ASPIER Academy Logo Preview"
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                />
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current: {fields.academyLogoUrl ? 'Custom uploaded' : 'Default asset'}</span>
                </div>
              </div>
              <ImageUploader
                value={fields.academyLogoUrl || ''}
                onUploaded={(url) => update('academyLogoUrl', url)}
                shape="circle"
                helperText="Square 1:1 image • PNG or WebP recommended • Max 2MB"
                maxSizeMB={2}
              />
              {fields.academyLogoUrl && (
                <Button type="button" variant="secondary" style={{ marginTop: 8 }} onClick={() => update('academyLogoUrl', '')}>
                  Reset to Default Logo
                </Button>
              )}
            </div>

            {/* Favicon */}
            <div className="settings-image-field">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Browser Favicon</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <img
                  src={fields.faviconUrl || '/favicon.ico'}
                  alt="Favicon Preview"
                  style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain', border: '1px solid #e2e8f0', padding: 4 }}
                />
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Browser tab icon</span>
                </div>
              </div>
              <ImageUploader
                value={fields.faviconUrl || ''}
                onUploaded={(url) => update('faviconUrl', url)}
                shape="circle"
                helperText="Square 32x32 or 64x64 • ICO or PNG • Max 1MB"
                maxSizeMB={1}
              />
              {fields.faviconUrl && (
                <Button type="button" variant="secondary" style={{ marginTop: 8 }} onClick={() => update('faviconUrl', '')}>
                  Reset Favicon
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Browser Metadata & SEO */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Titles & Browser Metadata</h2>
          <p className="muted" style={{ marginBottom: 16 }}>Controls browser tab text, search engine previews, and site branding.</p>

          <label>
            Site Display Name
            <Input
              value={String(fields.siteName || '')}
              onChange={(e) => update('siteName', e.target.value)}
              placeholder="ASPIER"
            />
          </label>

          <label>
            Browser Tab Title Prefix
            <Input
              value={String(fields.browserTabTitle || '')}
              onChange={(e) => update('browserTabTitle', e.target.value)}
              placeholder="ASPIER: Aeronautical, Spatial, Planetary Institute for Environmental Research"
            />
          </label>

          <label>
            SEO Meta Title
            <Input
              value={String(fields.seoTitle || '')}
              onChange={(e) => update('seoTitle', e.target.value)}
              placeholder="ASPIER — Aeronautical, Spatial, Planetary Institute for Environmental Research"
            />
          </label>

          <label>
            SEO Meta Description
            <textarea
              className="textarea"
              rows={3}
              value={String(fields.seoDescription || '')}
              onChange={(e) => update('seoDescription', e.target.value)}
              placeholder="Aeronautical, Spatial, Planetary Institute for Environmental Research advances discovery across Earth and space."
            />
          </label>
        </div>

        {/* Contact & Organization Details */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Contact & Organization Information</h2>
          <p className="muted" style={{ marginBottom: 16 }}>Public contact info displayed on Contact page, footer, and notices.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <label>
              Official Contact Email
              <Input
                type="email"
                value={String(fields.contactEmail || '')}
                onChange={(e) => update('contactEmail', e.target.value)}
                placeholder="contact@aspier.org"
              />
            </label>

            <label>
              Contact Phone / WhatsApp
              <Input
                value={String(fields.contactPhone || '')}
                onChange={(e) => update('contactPhone', e.target.value)}
                placeholder="+880 1603-012448"
              />
            </label>

            <label>
              Office Location / Address
              <Input
                value={String(fields.address || '')}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Rajshahi / Dhaka, Bangladesh"
              />
            </label>
          </div>

          <label style={{ marginTop: 12 }}>
            Footer Copyright Notice
            <Input
              value={String(fields.footerCopyright || '')}
              onChange={(e) => update('footerCopyright', e.target.value)}
              placeholder="ASPIER — Aeronautical, Spatial, Planetary Institute for Environmental Research · © 2026"
            />
          </label>
        </div>

        {/* Student Course Payment Accounts (Students Only) */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Student Course Payment Accounts (Students Only)</h2>
          <p className="muted" style={{ marginBottom: 16 }}>Configures bKash & Nagad merchant numbers and payment instructions strictly for Aspire Academy student course enrollments. (No fees apply to Young Scholars or Supervisors.)</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <label>
              bKash Merchant / Personal Number
              <Input
                value={String(fields.bkashNumber || '')}
                onChange={(e) => update('bkashNumber', e.target.value)}
                placeholder="01603012448"
              />
            </label>

            <label>
              Nagad Number
              <Input
                value={String(fields.nagadNumber || '')}
                onChange={(e) => update('nagadNumber', e.target.value)}
                placeholder="01603012448"
              />
            </label>
          </div>

          <label style={{ marginTop: 12 }}>
            Student Course Payment Instructions
            <textarea
              className="textarea"
              rows={3}
              value={String(fields.paymentInstructions || '')}
              onChange={(e) => update('paymentInstructions', e.target.value)}
              placeholder="Send the course fee by bKash or Nagad, then submit the exact transaction ID for verification."
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Button disabled={saving}>{saving ? 'Saving changes…' : 'Save & Publish Branding'}</Button>
        </div>
      </form>
    </div>
  );
}
