import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../../../lib/api';
import { Tabs } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { RichTextEditor } from '../../../components/forms/RichTextEditor';
import { TagInputField } from '../../../components/forms/TagInputField';
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

  // Supervisors Query
  const { data: supervisorsData, refetch: refetchSupervisors } = useQuery({
    queryKey: ['admin-supervisors'],
    queryFn: async () => (await api.get('/admin/supervisors')).data.data as any[]
  });

  // Young Scholars Query
  const { data: scholarsData, refetch: refetchScholars } = useQuery({
    queryKey: ['admin-scholars'],
    queryFn: async () => (await api.get('/admin/scholars')).data.data as any[]
  });

  const [localFoundingMembers, setLocalFoundingMembers] = useState<any[]>([]);
  const [localSupervisors, setLocalSupervisors] = useState<any[]>([]);
  const [localScholars, setLocalScholars] = useState<any[]>([]);

  useEffect(() => {
    if (foundingMembersData && foundingMembersData.length > 0) {
      setLocalFoundingMembers(foundingMembersData);
    } else if (staticFoundingMembers) {
      setLocalFoundingMembers(staticFoundingMembers);
    }
  }, [foundingMembersData]);

  useEffect(() => {
    if (supervisorsData && supervisorsData.length > 0) {
      setLocalSupervisors(supervisorsData);
    } else if (staticSupervisors) {
      setLocalSupervisors(staticSupervisors);
    }
  }, [supervisorsData]);

  useEffect(() => {
    if (scholarsData && scholarsData.length > 0) {
      setLocalScholars(scholarsData);
    } else if (staticScholars) {
      setLocalScholars(staticScholars);
    }
  }, [scholarsData]);

  const foundingMembers = localFoundingMembers.length > 0 ? localFoundingMembers : (foundingMembersData || staticFoundingMembers || []);
  const supervisors = localSupervisors.length > 0 ? localSupervisors : (supervisorsData || staticSupervisors || []);
  const scholars = localScholars.length > 0 ? localScholars : (scholarsData || staticScholars || []);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragCategory, setDragCategory] = useState<'founding' | 'supervisor' | 'scholar' | null>(null);

  const handleReorder = async (category: 'founding' | 'supervisor' | 'scholar', fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    let currentList: any[] = [];
    let setList: React.Dispatch<React.SetStateAction<any[]>> = () => {};

    if (category === 'founding') {
      currentList = [...foundingMembers];
      setList = setLocalFoundingMembers;
    } else if (category === 'supervisor') {
      currentList = [...supervisors];
      setList = setLocalSupervisors;
    } else {
      currentList = [...scholars];
      setList = setLocalScholars;
    }

    if (fromIndex < 0 || fromIndex >= currentList.length || toIndex < 0 || toIndex >= currentList.length) return;

    const updated = [...currentList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Optimistic UI update immediately (zero flicker)
    setList(updated);

    const orderedIds = updated.map((item) => String(item._id || item.id || item.slug));

    try {
      await api.put('/admin/team/reorder', { category, orderedIds });
      toast.success('Order saved');

      if (category === 'founding') {
        await queryClient.invalidateQueries({ queryKey: ['admin-founding-members'] });
        await queryClient.invalidateQueries({ queryKey: ['team-founding-members'] });
      } else if (category === 'supervisor') {
        await queryClient.invalidateQueries({ queryKey: ['admin-supervisors'] });
        await queryClient.invalidateQueries({ queryKey: ['team-supervisors'] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['admin-scholars'] });
        await queryClient.invalidateQueries({ queryKey: ['team-scholars'] });
      }
    } catch (err: any) {
      setList(currentList);
      toast.error(err.response?.data?.message || 'Could not save new order');
    }
  };

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

  const cleanTags = (val: any): string[] => {
    if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const handleSaveFounder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFounder(true);
    try {
      const payload = {
        ...founder,
        founderResearchDomains: cleanTags(founder.founderResearchDomains)
      };
      await api.put('/admin/settings', payload);
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

  const handlePreventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit') {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  const handleSaveFoundingMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFoundingMember(true);
    try {
      const payload = {
        ...editingFoundingMember,
        researchInterests: cleanTags(editingFoundingMember.researchInterests)
      };
      const targetId = editingFoundingMember._id || editingFoundingMember.slug;
      if (targetId) {
        await api.put(`/admin/founding-members/${targetId}`, payload);
        toast.success('Founding member updated successfully.');
      } else {
        await api.post('/admin/founding-members', payload);
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
      const eduValue = (editingSupervisor.education || editingSupervisor.educationalBackground || '').trim();
      const payload = {
        ...editingSupervisor,
        education: eduValue,
        educationalBackground: eduValue,
        researchInterests: cleanTags(editingSupervisor.researchInterests)
      };
      const targetId = editingSupervisor._id || editingSupervisor.slug;
      if (targetId) {
        await api.put(`/admin/supervisors/${targetId}`, payload);
        toast.success('Supervisor updated successfully.');
      } else {
        await api.post('/admin/supervisors', payload);
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
      const payload = {
        ...editingScholar,
        researchTopics: cleanTags(editingScholar.researchTopics)
      };
      const targetId = editingScholar._id || editingScholar.slug;
      if (targetId) {
        await api.put(`/admin/scholars/${targetId}`, payload);
        toast.success('Young Scholar updated successfully.');
      } else {
        await api.post('/admin/scholars', payload);
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

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Research Domains (comma-separated tags)
              </label>
              <TagInputField
                value={Array.isArray(founder.founderResearchDomains) ? founder.founderResearchDomains : []}
                onChange={(tags) => updateFounder('founderResearchDomains', tags)}
                placeholder="Aeronautical Systems, Environmental Research, Remote Sensing"
              />
            </div>

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

          <Table headers={['Order', 'Photo', 'Name', 'Role / Title', 'Affiliation', 'Focus Domains', 'Actions']}>
            {foundingMembers.map((fm, index) => {
              const isDragging = dragCategory === 'founding' && draggedIndex === index;
              const isOver = dragCategory === 'founding' && dragOverIndex === index;
              return (
                <tr
                  key={fm._id || fm.slug || index}
                  draggable
                  onDragStart={(e) => {
                    setDragCategory('founding');
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragCategory === 'founding' && draggedIndex !== null && draggedIndex !== index) {
                      handleReorder('founding', draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setDragCategory(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setDragCategory(null);
                  }}
                  style={{
                    cursor: 'grab',
                    opacity: isDragging ? 0.45 : 1,
                    background: isOver ? 'rgba(16, 185, 129, 0.08)' : undefined,
                    borderTop: isOver && draggedIndex !== null && draggedIndex > index ? '2px solid #10b981' : undefined,
                    borderBottom: isOver && draggedIndex !== null && draggedIndex < index ? '2px solid #10b981' : undefined,
                    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
                    transition: 'background 0.15s ease, opacity 0.15s ease'
                  }}
                >
                  <td style={{ width: 85, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#64748b', cursor: 'grab', display: 'inline-flex' }} title="Drag to reorder">
                        <GripVertical size={16} />
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                        #{index + 1}
                      </span>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('founding', index, index - 1);
                          }}
                          title="Move up"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.25 : 0.7,
                            lineHeight: 1
                          }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={index === foundingMembers.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('founding', index, index + 1);
                          }}
                          title="Move down"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: index === foundingMembers.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === foundingMembers.length - 1 ? 0.25 : 0.7,
                            lineHeight: 1
                          }}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  </td>
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
              );
            })}
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
                  education: '',
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

          <Table headers={['Order', 'Photo', 'Name', 'Designation', 'Affiliation', 'Interests', 'Actions']}>
            {supervisors.map((sup, index) => {
              const isDragging = dragCategory === 'supervisor' && draggedIndex === index;
              const isOver = dragCategory === 'supervisor' && dragOverIndex === index;
              return (
                <tr
                  key={sup._id || sup.slug || index}
                  draggable
                  onDragStart={(e) => {
                    setDragCategory('supervisor');
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragCategory === 'supervisor' && draggedIndex !== null && draggedIndex !== index) {
                      handleReorder('supervisor', draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setDragCategory(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setDragCategory(null);
                  }}
                  style={{
                    cursor: 'grab',
                    opacity: isDragging ? 0.45 : 1,
                    background: isOver ? 'rgba(16, 185, 129, 0.08)' : undefined,
                    borderTop: isOver && draggedIndex !== null && draggedIndex > index ? '2px solid #10b981' : undefined,
                    borderBottom: isOver && draggedIndex !== null && draggedIndex < index ? '2px solid #10b981' : undefined,
                    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
                    transition: 'background 0.15s ease, opacity 0.15s ease'
                  }}
                >
                  <td style={{ width: 85, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#64748b', cursor: 'grab', display: 'inline-flex' }} title="Drag to reorder">
                        <GripVertical size={16} />
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                        #{index + 1}
                      </span>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('supervisor', index, index - 1);
                          }}
                          title="Move up"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.25 : 0.7,
                            lineHeight: 1
                          }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={index === supervisors.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('supervisor', index, index + 1);
                          }}
                          title="Move down"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: index === supervisors.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === supervisors.length - 1 ? 0.25 : 0.7,
                            lineHeight: 1
                          }}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  </td>
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
                          setEditingSupervisor({
                            ...sup,
                            education: sup.education || sup.educationalBackground || '',
                            educationalBackground: sup.educationalBackground || sup.education || ''
                          });
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
              );
            })}
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

          <Table headers={['Order', 'Photo', 'Name', 'Cohort', 'Designation', 'Topics', 'Actions']}>
            {scholars.map((sch, index) => {
              const isDragging = dragCategory === 'scholar' && draggedIndex === index;
              const isOver = dragCategory === 'scholar' && dragOverIndex === index;
              return (
                <tr
                  key={sch._id || sch.slug || index}
                  draggable
                  onDragStart={(e) => {
                    setDragCategory('scholar');
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragCategory === 'scholar' && draggedIndex !== null && draggedIndex !== index) {
                      handleReorder('scholar', draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setDragCategory(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                    setDragCategory(null);
                  }}
                  style={{
                    cursor: 'grab',
                    opacity: isDragging ? 0.45 : 1,
                    background: isOver ? 'rgba(16, 185, 129, 0.08)' : undefined,
                    borderTop: isOver && draggedIndex !== null && draggedIndex > index ? '2px solid #10b981' : undefined,
                    borderBottom: isOver && draggedIndex !== null && draggedIndex < index ? '2px solid #10b981' : undefined,
                    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
                    transition: 'background 0.15s ease, opacity 0.15s ease'
                  }}
                >
                  <td style={{ width: 85, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#64748b', cursor: 'grab', display: 'inline-flex' }} title="Drag to reorder">
                        <GripVertical size={16} />
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                        #{index + 1}
                      </span>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('scholar', index, index - 1);
                          }}
                          title="Move up"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.25 : 0.7,
                            lineHeight: 1
                          }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={index === scholars.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('scholar', index, index + 1);
                          }}
                          title="Move down"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: index === scholars.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === scholars.length - 1 ? 0.25 : 0.7,
                            lineHeight: 1
                          }}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  </td>
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
              );
            })}
          </Table>
        </div>
      )}

      {/* Supervisor Edit/Create Modal */}
      {supervisorModalOpen && editingSupervisor && (
        <Modal open={supervisorModalOpen} title={editingSupervisor._id ? `Edit: ${editingSupervisor.name}` : 'New Research Supervisor'} onClose={() => setSupervisorModalOpen(false)}>
          <form className="form" onSubmit={handleSaveSupervisor} onKeyDown={handlePreventEnterSubmit} style={{ marginTop: 12 }}>
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

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Research Interests (comma-separated tags)
              </label>
              <TagInputField
                value={Array.isArray(editingSupervisor.researchInterests) ? editingSupervisor.researchInterests : []}
                onChange={(tags) => setEditingSupervisor({
                  ...editingSupervisor,
                  researchInterests: tags
                })}
                placeholder="Hydrology, Groundwater, Climate Change, Earth Systems"
              />
            </div>

            <label style={{ display: 'block', marginTop: 12 }}>
              Education
              <Input
                value={editingSupervisor.education || editingSupervisor.educationalBackground || ''}
                onChange={(e) => setEditingSupervisor({
                  ...editingSupervisor,
                  education: e.target.value,
                  educationalBackground: e.target.value
                })}
                placeholder="e.g., Ph.D. in Environmental Engineering, M.Sc. in Water Resources Engineering"
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
          <form className="form" onSubmit={handleSaveScholar} onKeyDown={handlePreventEnterSubmit} style={{ marginTop: 12 }}>
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

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Research Topics (comma-separated tags)
              </label>
              <TagInputField
                value={Array.isArray(editingScholar.researchTopics) ? editingScholar.researchTopics : []}
                onChange={(tags) => setEditingScholar({
                  ...editingScholar,
                  researchTopics: tags
                })}
                placeholder="Machine Learning, Remote Sensing, Atmospheric Modeling"
              />
            </div>

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
          <form className="form" onSubmit={handleSaveFoundingMember} onKeyDown={handlePreventEnterSubmit} style={{ marginTop: 12 }}>
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

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Academic Focus / Research Domains (comma-separated tags)
              </label>
              <TagInputField
                value={Array.isArray(editingFoundingMember.researchInterests) ? editingFoundingMember.researchInterests : []}
                onChange={(tags) => setEditingFoundingMember({
                  ...editingFoundingMember,
                  researchInterests: tags
                })}
                placeholder="UAV Architecture, Aerodynamics, Embedded Avionics"
              />
            </div>

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
