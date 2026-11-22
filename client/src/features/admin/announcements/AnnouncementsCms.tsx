import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';
import { RichTextContent } from '../../../components/common/RichTextContent';

export function AnnouncementsCms() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: news = [], refetch } = useQuery({
    queryKey: ['admin-announcements-list'],
    queryFn: async () => (await api.get('/admin/news')).data.data as any[]
  });

  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewContent, setPreviewContent] = useState(false);

  // Link Insertion Helper State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const insertCustomHyperlink = () => {
    if (!linkUrl.trim() || !linkText.trim()) {
      toast.error('Please enter both link URL and link display text');
      return;
    }
    const cleanUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const anchorHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #148f83; text-decoration: underline; font-weight: 500;">${linkText.trim()}</a>`;
    const currentContent = editingItem?.content || '';
    setEditingItem({
      ...editingItem,
      content: currentContent ? `${currentContent} ${anchorHtml}` : anchorHtml
    });
    setLinkUrl('');
    setLinkText('');
    toast.success('Custom hyperlink appended to content.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem._id) {
        await api.put(`/admin/news/${editingItem._id}`, editingItem);
        toast.success('Announcement / news article updated.');
      } else {
        await api.post('/admin/news', editingItem);
        toast.success('Announcement / news article created.');
      }
      setModalOpen(false);
      setEditingItem(null);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['public-news'] });
      await queryClient.invalidateQueries({ queryKey: ['home-announcements'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save notice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete notice "${title}"?`)) return;
    try {
      await api.delete(`/admin/news/${id}`);
      toast.success('Notice deleted');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['public-news'] });
      await queryClient.invalidateQueries({ queryKey: ['home-announcements'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete notice');
    }
  };

  const filtered = news.filter((item) => {
    if (filter === 'announcements') return item.isAnnouncement;
    if (filter === 'academy') return item.category === 'academy';
    return true;
  });

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>Announcements & News Manager</h1>
          <p className="muted">Create and manage public announcements with rich-text hyperlinking, cover image uploads, and dedicated detail pages.</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`button ${filter === 'all' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Items ({news.length})
          </button>
          <button
            type="button"
            className={`button ${filter === 'announcements' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setFilter('announcements')}
          >
            Announcements Only ({news.filter((n) => n.isAnnouncement).length})
          </button>
        </div>

        <Button
          onClick={() => {
            setEditingItem({
              title: '',
              slug: '',
              category: 'announcement',
              excerpt: '',
              content: '',
              isAnnouncement: true,
              publishedAt: new Date().toISOString().split('T')[0],
              coverImage: ''
            });
            setModalOpen(true);
          }}
        >
          + Create Announcement / News
        </Button>
      </div>

      <Table headers={['Cover', 'Title', 'Category', 'Type', 'Date', 'Actions']}>
        {filtered.map((item) => (
          <tr key={item._id}>
            <td style={{ width: 80 }}>
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <span className="muted" style={{ fontSize: '0.8rem' }}>None</span>
              )}
            </td>
            <td><strong>{item.title}</strong></td>
            <td>
              <Badge variant={item.category === 'announcement' ? 'green' : item.category === 'academy' ? 'blue' : 'gray'}>
                {item.category || 'news'}
              </Badge>
            </td>
            <td>
              {item.isAnnouncement ? (
                <span style={{ color: '#148f83', fontWeight: 600, fontSize: '0.85rem' }}>✓ Announcement Banner</span>
              ) : (
                <span className="muted" style={{ fontSize: '0.85rem' }}>Standard News</span>
              )}
            </td>
            <td style={{ fontSize: '0.85rem' }}>
              {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Draft'}
            </td>
            <td>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingItem({ ...item });
                    setModalOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(item._id, item.title)}
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* Create / Edit Modal */}
      {modalOpen && editingItem && (
        <Modal
          open={modalOpen}
          title={editingItem._id ? `Edit Notice: ${editingItem.title}` : 'New Announcement / News Notice'}
          onClose={() => setModalOpen(false)}
        >
          <form className="form" onSubmit={handleSave} style={{ marginTop: 12 }}>
            <label>
              Notice / Announcement Title
              <Input
                required
                value={editingItem.title || ''}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                placeholder="e.g. Higher Study Oriented Research Paper Writing Course Applications Open"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                URL Slug
                <Input
                  required
                  value={editingItem.slug || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                  placeholder="e.g. winter-research-writing-course-open"
                />
              </label>

              <label>
                Category
                <select
                  className="select"
                  value={editingItem.category || 'announcement'}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                >
                  <option value="announcement">Announcement</option>
                  <option value="academy">Academy Notice</option>
                  <option value="fellowship">Research Fellowship</option>
                  <option value="event">Event / Webinar</option>
                  <option value="press">Press Release</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Publish Date
                <Input
                  type="date"
                  value={editingItem.publishedAt ? new Date(editingItem.publishedAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, publishedAt: e.target.value })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingItem.isAnnouncement)}
                  onChange={(e) => setEditingItem({ ...editingItem, isAnnouncement: e.target.checked })}
                />
                Feature in Home Page "Announcements" section
              </label>
            </div>

            <label>
              Short Excerpt / Preview Summary
              <textarea
                className="textarea"
                rows={2}
                value={editingItem.excerpt || ''}
                onChange={(e) => setEditingItem({ ...editingItem, excerpt: e.target.value })}
                placeholder="Brief 1-2 sentence preview displayed on announcement cards..."
              />
            </label>

            {/* Custom Hyperlink Inserter Tool */}
            <div className="card" style={{ background: '#f8fafc', padding: 14, margin: '12px 0', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: '0.9rem', color: '#1b5660' }}>🔗 Insert Hyperlink / Custom Anchor Word</strong>
                <span className="muted" style={{ fontSize: '0.8rem' }}>Attaches external links to custom words</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', marginBottom: 4 }}>Clickable Word/Text</label>
                  <Input
                    placeholder="e.g. Enrollment Link"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', marginBottom: 4 }}>Target URL</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/register"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={insertCustomHyperlink}>
                  Insert Link
                </Button>
              </div>
            </div>

            <label>
              Full Body Content (Supports HTML, Paragraphs & Hyperlinks)
              <RichTextEditor
                value={editingItem.content || ''}
                onChange={(val) => setEditingItem({ ...editingItem, content: val })}
              />
            </label>

            <div style={{ margin: '8px 0' }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                onClick={() => setPreviewContent(!previewContent)}
              >
                {previewContent ? 'Hide Detail Page Preview' : '👁️ Show Detail Page Preview'}
              </button>
            </div>

            {previewContent && (
              <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, margin: '12px 0' }}>
                <span className="eyebrow" style={{ color: '#16a34a' }}>Live Detail Page Preview</span>
                <h3 style={{ margin: '8px 0' }}>{editingItem.title}</h3>
                <RichTextContent content={editingItem.content || '<p>No content entered yet.</p>'} />
              </div>
            )}

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Cover Graphic / Notice Banner (16:9)</label>
              <ImageUploader
                value={editingItem.coverImage || ''}
                onUploaded={(url) => setEditingItem({ ...editingItem, coverImage: url })}
                shape="banner"
                variant="cover"
                helperText="Recommended: 1200 × 675 px • Max 3MB"
                maxSizeMB={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={saving}>{saving ? 'Saving…' : 'Save Notice'}</Button>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
