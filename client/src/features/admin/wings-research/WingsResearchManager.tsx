import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Tabs } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';

export function WingsResearchManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Academic Wings');

  // Wings Query
  const { data: wings = [], refetch: refetchWings } = useQuery({
    queryKey: ['admin-wings'],
    queryFn: async () => (await api.get('/admin/wings')).data.data as any[]
  });

  // Research Query
  const { data: research = [], refetch: refetchResearch } = useQuery({
    queryKey: ['admin-research'],
    queryFn: async () => (await api.get('/admin/research')).data.data as any[]
  });

  // Research Applications Query
  const { data: applications = [], refetch: refetchApps } = useQuery({
    queryKey: ['admin-research-apps'],
    queryFn: async () => (await api.get('/admin/research-applications')).data.data as any[]
  });

  // Team queries for linking members to research
  const { data: teamFoundingMembers = [] } = useQuery({
    queryKey: ['team-founding-members'],
    queryFn: async () => (await api.get('/public/founding-members')).data.data as any[]
  });
  const { data: teamSupervisors = [] } = useQuery({
    queryKey: ['team-supervisors'],
    queryFn: async () => (await api.get('/public/supervisors')).data.data as any[]
  });
  const { data: teamScholars = [] } = useQuery({
    queryKey: ['team-scholars'],
    queryFn: async () => (await api.get('/public/scholars')).data.data as any[]
  });
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data as any
  });

  const founderMember = {
    _id: 'founder-saazid',
    name: settings?.founderName || 'Md Saazid Bin Saif',
    role: 'founder',
    roleTitle: settings?.founderTitle || 'Founder, ASPIER',
    designation: settings?.founderTitle || 'Founder & Executive Director, ASPIER',
    photo: settings?.founderPhoto,
    bio: settings?.founderBio,
    researchInterests: settings?.founderResearchDomains || [],
    researchGate: settings?.founderResearchGate,
    googleScholar: settings?.founderGoogleScholar,
    linkedin: settings?.founderLinkedin,
    orcid: settings?.founderOrcid,
    twitter: settings?.founderTwitter,
    github: settings?.founderGithub,
    facebook: settings?.founderFacebook
  };
  const allTeamMembers = [
    founderMember,
    ...teamFoundingMembers.map((fm: any) => ({ ...fm, role: 'foundingMember', roleTitle: fm.role || fm.designation || 'Founding Member' })),
    ...teamSupervisors.map((s: any) => ({ ...s, role: 'supervisor', roleTitle: s.designation || 'Research Supervisor' })),
    ...teamScholars.map((sc: any) => ({ ...sc, role: 'scholar', roleTitle: sc.designation || 'Young Scholar' }))
  ];

  // Wing Modal State
  const [editingWing, setEditingWing] = useState<any | null>(null);
  const [wingModalOpen, setWingModalOpen] = useState(false);
  const [savingWing, setSavingWing] = useState(false);

  // Research Modal State
  const [editingResearch, setEditingResearch] = useState<any | null>(null);
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);

  // Handle Wing Save
  const saveWing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWing(true);
    try {
      if (editingWing._id) {
        await api.put(`/admin/wings/${editingWing._id}`, editingWing);
        toast.success('Wing updated successfully.');
      } else {
        await api.post('/admin/wings', editingWing);
        toast.success('Wing created successfully.');
      }
      setWingModalOpen(false);
      setEditingWing(null);
      await refetchWings();
      await queryClient.invalidateQueries({ queryKey: ['public-wings'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save wing');
    } finally {
      setSavingWing(false);
    }
  };

  // Handle Wing Delete
  const deleteWing = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/admin/wings/${id}`);
      toast.success('Wing deleted');
      await refetchWings();
      await queryClient.invalidateQueries({ queryKey: ['public-wings'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete wing');
    }
  };

  // Handle Research Save
  const saveResearchItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingResearch(true);
    try {
      const payload = {
        ...editingResearch,
        showReadPaperButton: editingResearch.showReadPaperButton !== false
      };
      if (editingResearch._id) {
        await api.put(`/admin/research/${editingResearch._id}`, payload);
        toast.success('Research project updated successfully.');
      } else {
        await api.post('/admin/research', payload);
        toast.success('Research project created successfully.');
      }
      setResearchModalOpen(false);
      setEditingResearch(null);
      await refetchResearch();
      await queryClient.invalidateQueries({ queryKey: ['public-research'] });
      await queryClient.invalidateQueries({ queryKey: ['wing'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save research');
    } finally {
      setSavingResearch(false);
    }
  };

  // Handle Research Delete
  const deleteResearchItem = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/admin/research/${id}`);
      toast.success('Research project deleted');
      await refetchResearch();
      await queryClient.invalidateQueries({ queryKey: ['public-research'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete research');
    }
  };

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>Wings & Research Manager</h1>
          <p className="muted">Full CRUD management for all ten Academic Wings, research publications, and research proposals.</p>
        </div>
      </div>

      <Tabs
        tabs={['Academic Wings', 'Research Projects & Publications', 'Research Applications']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Academic Wings */}
      {activeTab === 'Academic Wings' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Total Academic Wings: <strong>{wings.length}</strong></p>
            <Button
              onClick={() => {
                setEditingWing({
                  name: '',
                  slug: '',
                  shortDescription: '',
                  description: '',
                  disciplines: [],
                  objectives: [],
                  order: wings.length + 1,
                  isActive: true,
                  coverImage: ''
                });
                setWingModalOpen(true);
              }}
            >
              + Add Academic Wing
            </Button>
          </div>

          <Table headers={['Cover', 'Wing Name', 'Slug', 'Disciplines', 'Order', 'Status', 'Actions']}>
            {wings.map((wing) => (
              <tr key={wing._id}>
                <td style={{ width: 80 }}>
                  {wing.coverImage ? (
                    <img src={wing.coverImage} alt={wing.name} style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <span className="muted" style={{ fontSize: '0.8rem' }}>Default</span>
                  )}
                </td>
                <td><strong>{wing.name}</strong></td>
                <td><code style={{ fontSize: '0.85rem' }}>{wing.slug}</code></td>
                <td>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    {Array.isArray(wing.disciplines) ? wing.disciplines.slice(0, 3).join(', ') : ''}
                  </span>
                </td>
                <td>{wing.order || 1}</td>
                <td>
                  <Badge variant={wing.isActive !== false ? 'green' : 'amber'}>
                    {wing.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingWing({ ...wing });
                        setWingModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => deleteWing(wing._id, wing.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {/* Tab 2: Research Projects */}
      {activeTab === 'Research Projects & Publications' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Total Research Projects: <strong>{research.length}</strong></p>
            <Button
              onClick={() => {
                setEditingResearch({
                  title: '',
                  slug: '',
                  wingId: wings[0]?._id || '',
                  abstract: '',
                  content: '',
                  authors: [],
                  category: 'present',
                  status: 'published',
                  publicationUrl: '',
                  doiUrl: '',
                  showReadPaperButton: true,
                  coverImage: ''
                });
                setResearchModalOpen(true);
              }}
            >
              + Create Research Project
            </Button>
          </div>

          <Table headers={['Cover', 'Title', 'Wing', 'Category', 'Read Paper (DOI)', 'Status', 'Actions']}>
            {research.map((item) => {
              const isPast = item.category === 'past';
              const hasPaperUrl = Boolean(item.publicationUrl || item.doiUrl);
              const readPaperActive = isPast && hasPaperUrl && item.showReadPaperButton !== false;
              return (
                <tr key={item._id}>
                  <td style={{ width: 80 }}>
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                  <td>
                    <strong>{item.title}</strong>
                    {item.slug && <span className="muted" style={{ display: 'block', fontSize: '0.78rem' }}>slug: {item.slug}</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>
                      {typeof item.wingId === 'object' ? item.wingId?.name : (wings.find((w) => w._id === item.wingId)?.name || 'General')}
                    </span>
                  </td>
                  <td>
                    <Badge variant={item.category === 'past' ? 'gray' : item.category === 'future' ? 'blue' : 'green'}>
                      {item.category === 'past' ? 'Past Research' : item.category === 'future' ? 'Future Research' : 'Present Research'}
                    </Badge>
                  </td>
                  <td>
                    {isPast ? (
                      readPaperActive ? (
                        <Badge variant="green">Enabled (Visible)</Badge>
                      ) : (
                        <Badge variant="amber">{hasPaperUrl ? 'Disabled (Hidden)' : 'No Link'}</Badge>
                      )
                    ) : (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={item.status === 'published' ? 'green' : item.status === 'ongoing' ? 'blue' : 'amber'}>
                      {item.status || 'published'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingResearch({
                            ...item,
                            wingId: typeof item.wingId === 'object' ? item.wingId?._id : item.wingId,
                            showReadPaperButton: item.showReadPaperButton !== false
                          });
                          setResearchModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteResearchItem(item._id, item.title)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      {/* Tab 3: Research Applications */}
      {activeTab === 'Research Applications' && (
        <div style={{ marginTop: 20 }}>
          <p className="muted" style={{ marginBottom: 16 }}>Submitted proposals and fellow applications: <strong>{applications.length}</strong></p>
          <Table headers={['Date', 'Applicant Name', 'Email', 'Proposed Title', 'Wing Interest', 'Status']}>
            {applications.map((app) => (
              <tr key={app._id}>
                <td style={{ fontSize: '0.85rem' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                <td><strong>{app.name || app.applicantName}</strong></td>
                <td><a href={`mailto:${app.email}`}>{app.email}</a></td>
                <td>{app.proposedTitle || app.title || 'Research Proposal'}</td>
                <td>{app.wingInterest || 'Interdisciplinary'}</td>
                <td>
                  <Badge variant={app.status === 'approved' ? 'green' : app.status === 'rejected' ? 'red' : 'blue'}>
                    {app.status || 'pending'}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {/* Wing Edit/Create Modal */}
      {wingModalOpen && editingWing && (
        <Modal open={wingModalOpen} title={editingWing._id ? `Edit: ${editingWing.name}` : 'New Academic Wing'} onClose={() => setWingModalOpen(false)}>
          <form className="form" onSubmit={saveWing} style={{ marginTop: 12 }}>
            <label>
              Wing Name
              <Input
                required
                value={editingWing.name || ''}
                onChange={(e) => setEditingWing({ ...editingWing, name: e.target.value })}
                placeholder="e.g. Wings of Aeronautical Engineering & UAV Systems"
              />
            </label>

            <label>
              URL Slug
              <Input
                required
                value={editingWing.slug || ''}
                onChange={(e) => setEditingWing({ ...editingWing, slug: e.target.value })}
                placeholder="e.g. aeronautical-engineering-uav-systems"
              />
            </label>

            <label>
              Short Summary
              <Input
                value={editingWing.shortDescription || ''}
                onChange={(e) => setEditingWing({ ...editingWing, shortDescription: e.target.value })}
              />
            </label>

            <label>
              Comprehensive Wing Overview
              <RichTextEditor
                value={editingWing.description || ''}
                onChange={(val) => setEditingWing({ ...editingWing, description: val })}
              />
            </label>

            <label>
              Associated Disciplines (comma-separated)
              <Input
                value={Array.isArray(editingWing.disciplines) ? editingWing.disciplines.join(', ') : ''}
                onChange={(e) => setEditingWing({
                  ...editingWing,
                  disciplines: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                })}
                placeholder="Aerospace Engineering, Mechanical Engineering, Robotics"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Display Order
                <Input
                  type="number"
                  value={editingWing.order || 1}
                  onChange={(e) => setEditingWing({ ...editingWing, order: Number(e.target.value) })}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                <input
                  type="checkbox"
                  checked={editingWing.isActive !== false}
                  onChange={(e) => setEditingWing({ ...editingWing, isActive: e.target.checked })}
                />
                Active & Visible on Site
              </label>
            </div>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Wing Cover Banner (16:9)</label>
              <ImageUploader
                value={editingWing.coverImage || ''}
                onUploaded={(url) => setEditingWing({ ...editingWing, coverImage: url })}
                shape="banner"
                variant="cover"
                helperText="Recommended: 1200 × 675 px • Max 3MB"
                maxSizeMB={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingWing}>{savingWing ? 'Saving…' : 'Save Wing'}</Button>
              <Button type="button" variant="secondary" onClick={() => setWingModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Research Edit/Create Modal */}
      {researchModalOpen && editingResearch && (
        <Modal open={researchModalOpen} title={editingResearch._id ? `Edit Project: ${editingResearch.title}` : 'New Research Project'} onClose={() => setResearchModalOpen(false)}>
          <form className="form" onSubmit={saveResearchItem} style={{ marginTop: 12 }}>
            <label>
              Project Title
              <Input
                required
                value={editingResearch.title || ''}
                onChange={(e) => setEditingResearch({ ...editingResearch, title: e.target.value })}
              />
            </label>

            <label>
              URL Slug
              <Input
                required
                value={editingResearch.slug || ''}
                onChange={(e) => setEditingResearch({ ...editingResearch, slug: e.target.value })}
              />
            </label>

            <label>
              Academic Wing
              <select
                className="select"
                value={editingResearch.wingId || ''}
                onChange={(e) => setEditingResearch({ ...editingResearch, wingId: e.target.value })}
              >
                <option value="">Select Wing</option>
                {wings.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </label>

            <label>
              Abstract
              <textarea
                className="textarea"
                rows={3}
                value={editingResearch.abstract || ''}
                onChange={(e) => setEditingResearch({ ...editingResearch, abstract: e.target.value })}
              />
            </label>

            <label>
              Full Research Content / Methodology
              <RichTextEditor
                value={editingResearch.content || ''}
                onChange={(val) => setEditingResearch({ ...editingResearch, content: val })}
              />
            </label>

            <label>
              Research Category / Timeline
              <select
                className="select"
                value={editingResearch.category || 'ongoing'}
                onChange={(e) => setEditingResearch({ ...editingResearch, category: e.target.value })}
              >
                <option value="ongoing">Present Research (Ongoing)</option>
                <option value="past">Past Research (Completed / Published)</option>
                <option value="future">Future Research (Proposed / Planned)</option>
              </select>
            </label>

            <div style={{ marginTop: 12, padding: 14, background: editingResearch.category === 'past' ? '#f0fdf4' : '#f8fafc', border: `1px solid ${editingResearch.category === 'past' ? '#86efac' : '#e2e8f0'}`, borderRadius: 8 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Published Paper / DOI Link
                <Input
                  value={editingResearch.publicationUrl || editingResearch.doiUrl || ''}
                  onChange={(e) => setEditingResearch({
                    ...editingResearch,
                    publicationUrl: e.target.value,
                    doiUrl: e.target.value
                  })}
                  placeholder="https://doi.org/10.1016/... or https://journal.org/paper-123"
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', color: 'var(--text, #1e293b)' }}>
                    Show &apos;Read Paper&apos; Link / Button on Frontend
                  </span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    Toggle whether the &quot;Read Paper&quot; action button appears on the wing cards and research detail page.
                  </span>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={editingResearch.showReadPaperButton !== false}
                    onChange={(e) => setEditingResearch({ ...editingResearch, showReadPaperButton: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: '#0f766e', cursor: 'pointer' }}
                  />
                  <span style={{ color: editingResearch.showReadPaperButton !== false ? '#0f766e' : '#64748b' }}>
                    {editingResearch.showReadPaperButton !== false ? 'ON (Visible)' : 'OFF (Hidden)'}
                  </span>
                </label>
              </div>

              {editingResearch.category === 'past' && (
                <div style={{ marginTop: 8, fontSize: '0.82rem', color: editingResearch.showReadPaperButton !== false && (editingResearch.publicationUrl || editingResearch.doiUrl) ? '#15803d' : '#b45309' }}>
                  {editingResearch.showReadPaperButton !== false && (editingResearch.publicationUrl || editingResearch.doiUrl)
                    ? '✓ "Read Paper" button is ACTIVE and will be shown on the live site.'
                    : '⚠ "Read Paper" button is INACTIVE and hidden on the frontend.'}
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Link Team Members / Contributors (Founder, Supervisors, Scholars)
              </label>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allTeamMembers.map((member: any) => {
                  const isChecked = Array.isArray(editingResearch.linkedTeamMembers) && editingResearch.linkedTeamMembers.some((m: any) => (m._id || m.name) === (member._id || member.name));
                  return (
                    <label key={member._id || member.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const list = Array.isArray(editingResearch.linkedTeamMembers) ? [...editingResearch.linkedTeamMembers] : [];
                          if (e.target.checked) {
                            list.push(member);
                          } else {
                            const idx = list.findIndex((m: any) => (m._id || m.name) === (member._id || member.name));
                            if (idx >= 0) list.splice(idx, 1);
                          }
                          setEditingResearch({ ...editingResearch, linkedTeamMembers: list });
                        }}
                      />
                      <span><strong>{member.name}</strong> ({member.roleTitle || member.role})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label>
              Authors (comma-separated)
              <Input
                value={Array.isArray(editingResearch.authors) ? editingResearch.authors.join(', ') : ''}
                onChange={(e) => setEditingResearch({
                  ...editingResearch,
                  authors: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                })}
                placeholder="Dr. Researcher, Scholar Name"
              />
            </label>

            <label>
              Status
              <select
                className="select"
                value={editingResearch.status || 'ongoing'}
                onChange={(e) => setEditingResearch({ ...editingResearch, status: e.target.value })}
              >
                <option value="ongoing">Ongoing</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Research Cover Graphic (16:9)</label>
              <ImageUploader
                value={editingResearch.coverImage || ''}
                onUploaded={(url) => setEditingResearch({ ...editingResearch, coverImage: url })}
                shape="banner"
                variant="cover"
                helperText="Recommended: 1200 × 675 px • Max 3MB"
                maxSizeMB={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingResearch}>{savingResearch ? 'Saving…' : 'Save Project'}</Button>
              <Button type="button" variant="secondary" onClick={() => setResearchModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
