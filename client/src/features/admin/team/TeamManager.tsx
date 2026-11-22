import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Tabs } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';
import { staticFoundingMembers, staticSupervisors, staticScholars } from '../../../lib/staticData';

export function TeamManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Founder Profile');

  // Founder Query (via site settings)
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['admin-team-founder-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data.data as Record<string, any>
  });

  // Founding Members Query
  const { data: foundingMembersData, refetch: refetchFoundingMembers } = useQuery({
    queryKey: ['admin-founding-members'],
    queryFn: async () => (await api.get('/admin/founding-members')).data.data as any[]
  });
  const foundingMembers = foundingMembersData && foundingMembersData.length > 0 ? foundingMembersData : staticFoundingMembers;

  // Supervisors Query
  const { data: supervisorsData, refetch: refetchSupervisors } = useQuery({
    queryKey: ['admin-supervisors'],
    queryFn: async () => (await api.get('/admin/supervisors')).data.data as any[]
  });
  const supervisors = supervisorsData && supervisorsData.length > 0 ? supervisorsData : staticSupervisors;

  // Young Scholars Query
  const { data: scholarsData, refetch: refetchScholars } = useQuery({
    queryKey: ['admin-scholars'],
    queryFn: async () => (await api.get('/admin/scholars')).data.data as any[]
  });
  const scholars = scholarsData && scholarsData.length > 0 ? scholarsData : staticScholars;

  // Founder Form State
  const [founderForm, setFounderForm] = useState<Record<string, any> | null>(null);
  const founder = founderForm || settingsData || {};
  const [savingFounder, setSavingFounder] = useState(false);

  const updateFounder = (key: string, value: any) => {
    setFounderForm({
      ...founder,
      [key]: value,
      ...(key === 'founderPhoto' ? { founderPhotoIsPlaceholder: !value } : {})
    });
  };

  const handleSaveFounder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFounder(true);
    try {
      await api.put('/admin/settings', founder);
      await refetchSettings();
      await queryClient.invalidateQueries({ queryKey: ['team-founder'] });
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      toast.success('Founder profile updated and published to Team page.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save founder profile');
    } finally {
      setSavingFounder(false);
    }
  };

  // Founding Member Modal & State
  const [editingFoundingMember, setEditingFoundingMember] = useState<any | null>(null);
  const [foundingMemberModalOpen, setFoundingMemberModalOpen] = useState(false);
  const [savingFoundingMember, setSavingFoundingMember] = useState(false);

  const handleSaveFoundingMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFoundingMember(true);
    try {
      if (editingFoundingMember._id) {
        await api.put(`/admin/founding-members/${editingFoundingMember._id}`, editingFoundingMember);
        toast.success('Founding member updated successfully.');
      } else {
        await api.post('/admin/founding-members', editingFoundingMember);
        toast.success('Founding member created successfully.');
      }
      setFoundingMemberModalOpen(false);
      setEditingFoundingMember(null);
      await refetchFoundingMembers();
      await queryClient.invalidateQueries({ queryKey: ['public-founding-members'] });
      await queryClient.invalidateQueries({ queryKey: ['team-founding-members'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save founding member');
    } finally {
      setSavingFoundingMember(false);
    }
  };

  const handleDeleteFoundingMember = async (id: string, name: string) => {
    if (!window.confirm(`Delete founding member "${name}"?`)) return;
    try {
      await api.delete(`/admin/founding-members/${id}`);
      toast.success('Founding member deleted');
      await refetchFoundingMembers();
      await queryClient.invalidateQueries({ queryKey: ['public-founding-members'] });
      await queryClient.invalidateQueries({ queryKey: ['team-founding-members'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete founding member');
    }
  };

  // Supervisor Modal & State
  const [editingSupervisor, setEditingSupervisor] = useState<any | null>(null);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [savingSupervisor, setSavingSupervisor] = useState(false);

  const handleSaveSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSupervisor(true);
    try {
      if (editingSupervisor._id) {
        await api.put(`/admin/supervisors/${editingSupervisor._id}`, editingSupervisor);
        toast.success('Supervisor updated successfully.');
      } else {
        await api.post('/admin/supervisors', editingSupervisor);
        toast.success('Supervisor created successfully.');
      }
      setSupervisorModalOpen(false);
      setEditingSupervisor(null);
      await refetchSupervisors();
      await queryClient.invalidateQueries({ queryKey: ['public-supervisors'] });
      await queryClient.invalidateQueries({ queryKey: ['team-supervisors'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save supervisor');
    } finally {
      setSavingSupervisor(false);
    }
  };

  const handleDeleteSupervisor = async (id: string, name: string) => {
    if (!window.confirm(`Delete supervisor "${name}"?`)) return;
    try {
      await api.delete(`/admin/supervisors/${id}`);
      toast.success('Supervisor deleted');
      await refetchSupervisors();
      await queryClient.invalidateQueries({ queryKey: ['public-supervisors'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete supervisor');
    }
  };

  // Scholar Modal & State
  const [editingScholar, setEditingScholar] = useState<any | null>(null);
  const [scholarModalOpen, setScholarModalOpen] = useState(false);
  const [savingScholar, setSavingScholar] = useState(false);

  const handleSaveScholar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingScholar(true);
    try {
      if (editingScholar._id) {
        await api.put(`/admin/scholars/${editingScholar._id}`, editingScholar);
        toast.success('Young Scholar updated successfully.');
      } else {
        await api.post('/admin/scholars', editingScholar);
        toast.success('Young Scholar created successfully.');
      }
      setScholarModalOpen(false);
      setEditingScholar(null);
      await refetchScholars();
      await queryClient.invalidateQueries({ queryKey: ['public-scholars'] });
      await queryClient.invalidateQueries({ queryKey: ['team-scholars'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save scholar');
    } finally {
      setSavingScholar(false);
    }
  };

  const handleDeleteScholar = async (id: string, name: string) => {
    if (!window.confirm(`Delete young scholar "${name}"?`)) return;
    try {
      await api.delete(`/admin/scholars/${id}`);
      toast.success('Young Scholar deleted');
      await refetchScholars();
      await queryClient.invalidateQueries({ queryKey: ['public-scholars'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete scholar');
    }
  };

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>Team Manager (/team)</h1>
          <p className="muted">Full control over Founder, Research Supervisors, and Young Scholars—including photos, biographies, research tags, and conditional academic/social links.</p>
        </div>
      </div>

      <Tabs
        tabs={['Founder Profile', 'Founding Members', 'Research Supervisors', 'Young Scholars']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Founder Profile */}
      {activeTab === 'Founder Profile' && (
        <form className="form settings-form" onSubmit={handleSaveFounder} style={{ marginTop: 24 }}>
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Founder Information & Portrait</h2>
            <p className="muted" style={{ marginBottom: 16 }}>This profile is prominently featured at the top of the /team page.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <label>
                Founder Full Name
                <Input
                  required
                  value={String(founder.founderName || 'Md Saazid Bin Saif')}
                  onChange={(e) => updateFounder('founderName', e.target.value)}
                />
              </label>

              <label>
                Designation / Title
                <Input
                  required
                  value={String(founder.founderTitle || 'Founder, ASPIER')}
                  onChange={(e) => updateFounder('founderTitle', e.target.value)}
                />
              </label>
            </div>

            <label style={{ marginTop: 12 }}>
              Brief Subtitle / Role Tagline
              <Input
                value={String(founder.founderDescription || 'Founder, ASPIER')}
                onChange={(e) => updateFounder('founderDescription', e.target.value)}
              />
            </label>

            <label>
              Full Biography & Statement
              <RichTextEditor
                value={String(founder.founderBio || '')}
                onChange={(val) => updateFounder('founderBio', val)}
              />
            </label>

            <label>
              Research Domains (comma-separated tags)
              <Input
                value={Array.isArray(founder.founderResearchDomains) ? founder.founderResearchDomains.join(', ') : ''}
                onChange={(e) => updateFounder('founderResearchDomains', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="Aeronautical Systems, Environmental Research, Remote Sensing"
              />
            </label>

            <div className="settings-image-field" style={{ marginTop: 20 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Founder Portrait Photo (1:1 Square)</label>
              <ImageUploader
                value={founder.founderPhoto || ''}
                onUploaded={(url) => updateFounder('founderPhoto', url)}
                shape="circle"
                helperText="Recommended: 500 × 500 px • 1:1 Circle preview • Max 2MB"
                maxSizeMB={2}
              />
              {founder.founderPhoto && (
                <Button type="button" variant="secondary" style={{ marginTop: 8 }} onClick={() => updateFounder('founderPhoto', '')}>
                  Remove Photo (Use Initials MS)
                </Button>
              )}
            </div>
          </div>

          {/* Founder Academic & Social Profile Links */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Academic & Social Profile Links</h2>
            <p className="muted" style={{ marginBottom: 16 }}>Only enabled links with valid URLs are displayed on the public Team page. Empty or toggled-off links are automatically hidden with zero broken icons.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label>ResearchGate URL</label>
                <Input
                  type="url"
                  placeholder="https://www.researchgate.net/profile/..."
                  value={String(founder.founderResearchGate || '')}
                  onChange={(e) => updateFounder('founderResearchGate', e.target.value)}
                />
              </div>

              <div>
                <label>Google Scholar Profile URL</label>
                <Input
                  type="url"
                  placeholder="https://scholar.google.com/citations?user=..."
                  value={String(founder.founderGoogleScholar || founder.founderGoogleScholarUrl || '')}
                  onChange={(e) => {
                    updateFounder('founderGoogleScholar', e.target.value);
                    updateFounder('founderGoogleScholarUrl', e.target.value);
                  }}
                />
              </div>

              <div>
                <label>LinkedIn URL</label>
                <Input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={String(founder.founderLinkedin || '')}
                  onChange={(e) => updateFounder('founderLinkedin', e.target.value)}
                />
              </div>

              <div>
                <label>ORCID Profile / ID URL</label>
                <Input
                  type="url"
                  placeholder="https://orcid.org/0000-..."
                  value={String(founder.founderOrcid || '')}
                  onChange={(e) => updateFounder('founderOrcid', e.target.value)}
                />
              </div>

              <div>
                <label>X (Twitter) Profile URL</label>
                <Input
                  type="url"
                  placeholder="https://x.com/..."
                  value={String(founder.founderTwitter || '')}
                  onChange={(e) => updateFounder('founderTwitter', e.target.value)}
                />
              </div>

              <div>
                <label>GitHub Profile URL</label>
                <Input
                  type="url"
                  placeholder="https://github.com/..."
                  value={String(founder.founderGithub || '')}
                  onChange={(e) => updateFounder('founderGithub', e.target.value)}
                />
              </div>

              <div>
                <label>Facebook Profile URL</label>
                <Input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={String(founder.founderFacebook || '')}
                  onChange={(e) => updateFounder('founderFacebook', e.target.value)}
                />
              </div>

              <div>
                <label>Personal / Institutional Website URL</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={String(founder.founderWebsite || '')}
                  onChange={(e) => updateFounder('founderWebsite', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button disabled={savingFounder}>{savingFounder ? 'Saving…' : 'Save & Publish Founder Profile'}</Button>
        </form>
      )}

      {/* Tab 2: Founding Members */}
      {activeTab === 'Founding Members' && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Total Founding Members: <strong>{foundingMembers.length}</strong></p>
            <Button
              onClick={() => {
                setEditingFoundingMember({
                  name: '',
                  slug: '',
                  role: 'Co-Founder & Lead Researcher',
                  designation: '',
                  affiliation: 'ASPIER',
                  bio: '',
                  photo: '',
                  researchInterests: [],
                  educationalBackground: '',
                  researchGate: '',
                  googleScholar: '',
                  linkedin: '',
                  orcid: '',
                  twitter: '',
                  github: '',
                  facebook: '',
                  website: ''
                });
                setFoundingMemberModalOpen(true);
              }}
            >
              + Add Founding Member
            </Button>
          </div>

          <Table headers={['Photo', 'Name', 'Role / Title', 'Affiliation', 'Focus Domains', 'Actions']}>
            {foundingMembers.map((fm) => (
              <tr key={fm._id}>
                <td style={{ width: 60 }}>
                  {fm.photo ? (
                    <img src={fm.photo} alt={fm.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0d736e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {fm.name?.charAt(0) || 'F'}
                    </div>
                  )}
                </td>
                <td><strong>{fm.name}</strong></td>
                <td><span style={{ color: '#0d736e', fontWeight: 600 }}>{fm.role || fm.designation || 'Founding Member'}</span></td>
                <td>{fm.affiliation || 'ASPIER'}</td>
                <td>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    {Array.isArray(fm.researchInterests) ? fm.researchInterests.slice(0, 3).join(', ') : ''}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingFoundingMember({ ...fm });
                        setFoundingMemberModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteFoundingMember(fm._id, fm.name)}
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

      {/* Tab 3: Research Supervisors */}
      {activeTab === 'Research Supervisors' && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Total Research Supervisors: <strong>{supervisors.length}</strong></p>
            <Button
              onClick={() => {
                setEditingSupervisor({
                  name: '',
                  slug: '',
                  designation: '',
                  affiliation: '',
                  bio: '',
                  photo: '',
                  researchInterests: [],
                  educationalBackground: '',
                  researchGate: '',
                  googleScholar: '',
                  linkedin: '',
                  orcid: '',
                  twitter: '',
                  github: '',
                  facebook: '',
                  website: ''
                });
                setSupervisorModalOpen(true);
              }}
            >
              + Add Research Supervisor
            </Button>
          </div>

          <Table headers={['Photo', 'Name', 'Designation', 'Affiliation', 'Interests', 'Actions']}>
            {supervisors.map((sup) => (
              <tr key={sup._id}>
                <td style={{ width: 60 }}>
                  {sup.photo ? (
                    <img src={sup.photo} alt={sup.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {sup.name?.charAt(0) || 'S'}
                    </div>
                  )}
                </td>
                <td><strong>{sup.name}</strong></td>
                <td>{sup.designation || 'Supervisor'}</td>
                <td>{sup.affiliation || 'ASPIER'}</td>
                <td>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    {Array.isArray(sup.researchInterests) ? sup.researchInterests.slice(0, 3).join(', ') : ''}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingSupervisor({ ...sup });
                        setSupervisorModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteSupervisor(sup._id, sup.name)}
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

      {/* Tab 3: Young Scholars */}
      {activeTab === 'Young Scholars' && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="muted">Total Young Scholars: <strong>{scholars.length}</strong></p>
            <Button
              onClick={() => {
                setEditingScholar({
                  name: '',
                  slug: '',
                  cohort: '2026',
                  designation: 'Young Scholar',
                  affiliation: '',
                  bio: '',
                  photo: '',
                  researchTopics: [],
                  researchGate: '',
                  googleScholar: '',
                  linkedin: '',
                  orcid: '',
                  twitter: '',
                  github: '',
                  facebook: '',
                  website: ''
                });
                setScholarModalOpen(true);
              }}
            >
              + Add Young Scholar
            </Button>
          </div>

          <Table headers={['Photo', 'Name', 'Cohort', 'Designation', 'Topics', 'Actions']}>
            {scholars.map((sch) => (
              <tr key={sch._id}>
                <td style={{ width: 60 }}>
                  {sch.photo ? (
                    <img src={sch.photo} alt={sch.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {sch.name?.charAt(0) || 'Y'}
                    </div>
                  )}
                </td>
                <td><strong>{sch.name}</strong></td>
                <td>{sch.cohort || '2026'}</td>
                <td>{sch.designation || 'Scholar'}</td>
                <td>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    {Array.isArray(sch.researchTopics) ? sch.researchTopics.slice(0, 3).join(', ') : ''}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingScholar({ ...sch });
                        setScholarModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteScholar(sch._id, sch.name)}
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

      {/* Supervisor Edit/Create Modal */}
      {supervisorModalOpen && editingSupervisor && (
        <Modal open={supervisorModalOpen} title={editingSupervisor._id ? `Edit: ${editingSupervisor.name}` : 'New Research Supervisor'} onClose={() => setSupervisorModalOpen(false)}>
          <form className="form" onSubmit={handleSaveSupervisor} style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Full Name
                <Input
                  required
                  value={editingSupervisor.name || ''}
                  onChange={(e) => setEditingSupervisor({ ...editingSupervisor, name: e.target.value })}
                />
              </label>
              <label>
                Slug / Username
                <Input
                  required
                  value={editingSupervisor.slug || ''}
                  onChange={(e) => setEditingSupervisor({ ...editingSupervisor, slug: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Designation
                <Input
                  value={editingSupervisor.designation || ''}
                  onChange={(e) => setEditingSupervisor({ ...editingSupervisor, designation: e.target.value })}
                  placeholder="e.g. Associate Professor / Research Director"
                />
              </label>
              <label>
                Affiliation
                <Input
                  value={editingSupervisor.affiliation || ''}
                  onChange={(e) => setEditingSupervisor({ ...editingSupervisor, affiliation: e.target.value })}
                  placeholder="e.g. ASPIER / University Name"
                />
              </label>
            </div>

            <label>
              Biography / Statement
              <RichTextEditor
                value={editingSupervisor.bio || ''}
                onChange={(val) => setEditingSupervisor({ ...editingSupervisor, bio: val })}
              />
            </label>

            <label>
              Research Interests (comma-separated tags)
              <Input
                value={Array.isArray(editingSupervisor.researchInterests) ? editingSupervisor.researchInterests.join(', ') : ''}
                onChange={(e) => setEditingSupervisor({
                  ...editingSupervisor,
                  researchInterests: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                })}
              />
            </label>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Supervisor Photo (1:1 Circle)</label>
              <ImageUploader
                value={editingSupervisor.photo || ''}
                onUploaded={(url) => setEditingSupervisor({ ...editingSupervisor, photo: url })}
                shape="circle"
                helperText="Square 1:1 image • Max 2MB"
                maxSizeMB={2}
              />
            </div>

            <h3 style={{ fontSize: '1.05rem', margin: '20px 0 10px' }}>Academic & Social Profiles (Optional)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>ResearchGate URL<Input type="url" value={editingSupervisor.researchGate || ''} onChange={(e) => setEditingSupervisor({ ...editingSupervisor, researchGate: e.target.value })}/></label>
              <label>Google Scholar URL<Input type="url" value={editingSupervisor.googleScholar || ''} onChange={(e) => setEditingSupervisor({ ...editingSupervisor, googleScholar: e.target.value })}/></label>
              <label>LinkedIn URL<Input type="url" value={editingSupervisor.linkedin || ''} onChange={(e) => setEditingSupervisor({ ...editingSupervisor, linkedin: e.target.value })}/></label>
              <label>ORCID URL<Input type="url" value={editingSupervisor.orcid || ''} onChange={(e) => setEditingSupervisor({ ...editingSupervisor, orcid: e.target.value })}/></label>
              <label>X (Twitter) URL<Input type="url" value={editingSupervisor.twitter || ''} onChange={(e) => setEditingSupervisor({ ...editingSupervisor, twitter: e.target.value })}/></label>
              <label>Website URL<Input type="url" value={editingSupervisor.website || ''} onChange={(e) => setEditingSupervisor({ ...editingSupervisor, website: e.target.value })}/></label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingSupervisor}>{savingSupervisor ? 'Saving…' : 'Save Supervisor'}</Button>
              <Button type="button" variant="secondary" onClick={() => setSupervisorModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Scholar Edit/Create Modal */}
      {scholarModalOpen && editingScholar && (
        <Modal open={scholarModalOpen} title={editingScholar._id ? `Edit: ${editingScholar.name}` : 'New Young Scholar'} onClose={() => setScholarModalOpen(false)}>
          <form className="form" onSubmit={handleSaveScholar} style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Full Name
                <Input
                  required
                  value={editingScholar.name || ''}
                  onChange={(e) => setEditingScholar({ ...editingScholar, name: e.target.value })}
                />
              </label>
              <label>
                Slug / Username
                <Input
                  required
                  value={editingScholar.slug || ''}
                  onChange={(e) => setEditingScholar({ ...editingScholar, slug: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Cohort / Batch
                <Input
                  value={editingScholar.cohort || '2026'}
                  onChange={(e) => setEditingScholar({ ...editingScholar, cohort: e.target.value })}
                />
              </label>
              <label>
                Designation / Role
                <Input
                  value={editingScholar.designation || 'Young Scholar'}
                  onChange={(e) => setEditingScholar({ ...editingScholar, designation: e.target.value })}
                />
              </label>
            </div>

            <label>
              Biography / Research Statement
              <RichTextEditor
                value={editingScholar.bio || ''}
                onChange={(val) => setEditingScholar({ ...editingScholar, bio: val })}
              />
            </label>

            <label>
              Research Topics (comma-separated tags)
              <Input
                value={Array.isArray(editingScholar.researchTopics) ? editingScholar.researchTopics.join(', ') : ''}
                onChange={(e) => setEditingScholar({
                  ...editingScholar,
                  researchTopics: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                })}
              />
            </label>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Scholar Photo (1:1 Circle)</label>
              <ImageUploader
                value={editingScholar.photo || ''}
                onUploaded={(url) => setEditingScholar({ ...editingScholar, photo: url })}
                shape="circle"
                helperText="Square 1:1 image • Max 2MB"
                maxSizeMB={2}
              />
            </div>

            <h3 style={{ fontSize: '1.05rem', margin: '20px 0 10px' }}>Academic & Social Profiles (Optional)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>ResearchGate URL<Input type="url" value={editingScholar.researchGate || ''} onChange={(e) => setEditingScholar({ ...editingScholar, researchGate: e.target.value })}/></label>
              <label>Google Scholar URL<Input type="url" value={editingScholar.googleScholar || ''} onChange={(e) => setEditingScholar({ ...editingScholar, googleScholar: e.target.value })}/></label>
              <label>LinkedIn URL<Input type="url" value={editingScholar.linkedin || ''} onChange={(e) => setEditingScholar({ ...editingScholar, linkedin: e.target.value })}/></label>
              <label>ORCID URL<Input type="url" value={editingScholar.orcid || ''} onChange={(e) => setEditingScholar({ ...editingScholar, orcid: e.target.value })}/></label>
              <label>X (Twitter) URL<Input type="url" value={editingScholar.twitter || ''} onChange={(e) => setEditingScholar({ ...editingScholar, twitter: e.target.value })}/></label>
              <label>GitHub URL<Input type="url" value={editingScholar.github || ''} onChange={(e) => setEditingScholar({ ...editingScholar, github: e.target.value })}/></label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingScholar}>{savingScholar ? 'Saving…' : 'Save Scholar'}</Button>
              <Button type="button" variant="secondary" onClick={() => setScholarModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Founding Member Edit/Create Modal */}
      {foundingMemberModalOpen && editingFoundingMember && (
        <Modal open={foundingMemberModalOpen} title={editingFoundingMember._id ? `Edit: ${editingFoundingMember.name}` : 'New Founding Member'} onClose={() => setFoundingMemberModalOpen(false)}>
          <form className="form" onSubmit={handleSaveFoundingMember} style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Full Name
                <Input
                  required
                  value={editingFoundingMember.name || ''}
                  onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, name: e.target.value })}
                />
              </label>
              <label>
                Slug / Username
                <Input
                  required
                  value={editingFoundingMember.slug || ''}
                  onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, slug: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Role / Title
                <Input
                  value={editingFoundingMember.role || ''}
                  onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, role: e.target.value })}
                  placeholder="e.g. Co-Founder & Lead Researcher / Founding Member"
                />
              </label>
              <label>
                Affiliation / Department
                <Input
                  value={editingFoundingMember.affiliation || ''}
                  onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, affiliation: e.target.value })}
                  placeholder="e.g. ASPIER · Aeronautical & UAV Systems"
                />
              </label>
            </div>

            <label>
              Full Biography & Statement
              <RichTextEditor
                value={editingFoundingMember.bio || ''}
                onChange={(val) => setEditingFoundingMember({ ...editingFoundingMember, bio: val })}
              />
            </label>

            <label>
              Academic Focus / Research Domains (comma-separated tags)
              <Input
                value={Array.isArray(editingFoundingMember.researchInterests) ? editingFoundingMember.researchInterests.join(', ') : ''}
                onChange={(e) => setEditingFoundingMember({
                  ...editingFoundingMember,
                  researchInterests: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                })}
                placeholder="UAV Architecture, Aerodynamics, Embedded Avionics"
              />
            </label>

            <label>
              Educational Background (Optional)
              <Input
                value={editingFoundingMember.educationalBackground || ''}
                onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, educationalBackground: e.target.value })}
                placeholder="e.g. B.Sc in Aeronautical Engineering"
              />
            </label>

            <div className="settings-image-field" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Founding Member Photo (1:1 Circle)</label>
              <ImageUploader
                value={editingFoundingMember.photo || ''}
                onUploaded={(url) => setEditingFoundingMember({ ...editingFoundingMember, photo: url })}
                shape="circle"
                helperText="Square 1:1 image • Max 2MB"
                maxSizeMB={2}
              />
            </div>

            <h3 style={{ fontSize: '1.05rem', margin: '20px 0 10px' }}>Academic & Social Profiles (Optional)</h3>
            <p className="muted" style={{ fontSize: '0.86rem', marginBottom: 12 }}>Only profiles with a URL are rendered on the public Team page. Empty fields are automatically hidden with zero broken icons.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>ResearchGate URL<Input type="url" value={editingFoundingMember.researchGate || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, researchGate: e.target.value })} placeholder="https://www.researchgate.net/profile/..." /></label>
              <label>Google Scholar URL<Input type="url" value={editingFoundingMember.googleScholar || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, googleScholar: e.target.value })} placeholder="https://scholar.google.com/citations?user=..." /></label>
              <label>LinkedIn URL<Input type="url" value={editingFoundingMember.linkedin || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, linkedin: e.target.value })} placeholder="https://www.linkedin.com/in/..." /></label>
              <label>ORCID URL<Input type="url" value={editingFoundingMember.orcid || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, orcid: e.target.value })} placeholder="https://orcid.org/0000-..." /></label>
              <label>X (Twitter) URL<Input type="url" value={editingFoundingMember.twitter || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, twitter: e.target.value })} placeholder="https://x.com/..." /></label>
              <label>GitHub URL<Input type="url" value={editingFoundingMember.github || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, github: e.target.value })} placeholder="https://github.com/..." /></label>
              <label>Facebook URL<Input type="url" value={editingFoundingMember.facebook || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, facebook: e.target.value })} placeholder="https://facebook.com/..." /></label>
              <label>Personal / Institutional Website<Input type="url" value={editingFoundingMember.website || ''} onChange={(e) => setEditingFoundingMember({ ...editingFoundingMember, website: e.target.value })} placeholder="https://..." /></label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button disabled={savingFoundingMember}>{savingFoundingMember ? 'Saving…' : 'Save Founding Member'}</Button>
              <Button type="button" variant="secondary" onClick={() => setFoundingMemberModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
