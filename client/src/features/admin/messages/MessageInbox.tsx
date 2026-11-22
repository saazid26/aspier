import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { Tabs } from '../../../components/ui/Tabs';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';

export function MessageInbox() {
  const [activeTab, setActiveTab] = useState('All Messages');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Fetch all messages & notifications
  const { data: inboxData, refetch, isLoading } = useQuery({
    queryKey: ['admin-unified-inbox'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/inbox/all');
        return res.data.data;
      } catch {
        const fallbackRes = await api.get('/admin/messages');
        return { messages: fallbackRes.data.data || [], notifications: [], researchApps: [], membershipApps: [] };
      }
    }
  });

  const messages: any[] = inboxData?.messages || [];
  const notifications: any[] = inboxData?.notifications || [];
  const researchApps: any[] = inboxData?.researchApps || [];

  // Update Status
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/messages/${id}`, { status: newStatus });
      toast.success(`Message marked as ${newStatus}`);
      await refetch();
      if (selectedItem && selectedItem._id === id) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  };

  // Filter items
  const getFilteredItems = () => {
    let items: any[] = [];
    if (activeTab === 'All Messages') {
      items = [...messages];
    } else if (activeTab === 'Contact Inquiries') {
      items = messages.filter((m) => m.type === 'contact');
    } else if (activeTab === 'Team & Join Inquiries') {
      items = messages.filter((m) => m.type === 'join');
    } else if (activeTab === 'System Notifications') {
      items = notifications.map((n) => ({
        ...n,
        type: 'notification',
        name: 'ASPIER System',
        email: 'system@aspier.org',
        message: n.body,
        subject: n.title,
        status: n.readAt ? 'read' : 'unread'
      }));
    } else if (activeTab === 'Research Applications') {
      items = researchApps.map((r) => ({
        ...r,
        type: 'research-app',
        message: r.proposal || r.notes || 'Research application submitted',
        subject: r.proposedTitle || 'Research Fellowship Application',
        status: r.status === 'approved' ? 'read' : 'unread'
      }));
    }

    // Status filter
    if (statusFilter !== 'all') {
      items = items.filter((item) => (item.status || 'unread') === statusFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.subject || '').toLowerCase().includes(q) ||
        (item.message || '').toLowerCase().includes(q) ||
        (item.wingInterest || '').toLowerCase().includes(q)
      );
    }

    return items;
  };

  const filteredItems = getFilteredItems();
  const unreadCount = messages.filter((m) => (m.status || 'unread') === 'unread').length;

  // Export to CSV
  const exportCsv = () => {
    const rows = [
      ['Date', 'Type', 'Name', 'Email', 'Phone', 'Subject', 'Wing Interest', 'Status', 'Message'],
      ...messages.map((m) => [
        new Date(m.createdAt).toLocaleString(),
        m.type,
        `"${m.name || ''}"`,
        m.email || '',
        m.phone || '',
        `"${m.subject || ''}"`,
        `"${m.wingInterest || ''}"`,
        m.status || 'unread',
        `"${(m.message || '').replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aspier_inbox_messages_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inbox archive exported to CSV.');
  };

  return (
    <div className="admin-page-container">
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div>
          <span className="eyebrow">CMS Administration</span>
          <h1 style={{ margin: '4px 0 8px' }}>Persistent Messages & Notifications Inbox</h1>
          <p className="muted">Permanent retention archive capturing contact submissions, join requests, team inquiries, and system notifications.</p>
        </div>
      </div>

      {/* Zero Auto-Deletion Retention Notice */}
      <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <div>
            <strong style={{ color: '#166534', fontSize: '0.95rem' }}>Strict Retention Policy Active (Zero Auto-Deletion)</strong>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>
              Messages and applications are never deleted on page reload or session expiry. All records remain permanently stored in the database.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={exportCsv} style={{ fontSize: '0.85rem' }}>
          Export All to CSV
        </Button>
      </div>

      <Tabs
        tabs={['All Messages', 'Contact Inquiries', 'Team & Join Inquiries', 'System Notifications', 'Research Applications']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Filters & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 16px', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`button ${statusFilter === 'all' ? 'button-primary' : 'button-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            onClick={() => setStatusFilter('all')}
          >
            All ({messages.length})
          </button>
          <button
            type="button"
            className={`button ${statusFilter === 'unread' ? 'button-primary' : 'button-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            onClick={() => setStatusFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`button ${statusFilter === 'read' ? 'button-primary' : 'button-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            onClick={() => setStatusFilter('read')}
          >
            Read
          </button>
          <button
            type="button"
            className={`button ${statusFilter === 'archived' ? 'button-primary' : 'button-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            onClick={() => setStatusFilter('archived')}
          >
            Archived
          </button>
        </div>

        <div style={{ width: 280, maxWidth: '100%' }}>
          <Input
            placeholder="Search sender, email, keywords…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p role="status">Loading inbox messages…</p>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted" style={{ fontSize: '1.05rem', margin: 0 }}>No messages found in this view.</p>
        </div>
      ) : (
        <Table headers={['Status', 'Type', 'Sender', 'Subject / Topic', 'Date Received', 'Actions']}>
          {filteredItems.map((item) => {
            const isUnread = (item.status || 'unread') === 'unread';
            return (
              <tr key={item._id} style={{ background: isUnread ? '#f8fafc' : undefined, fontWeight: isUnread ? 600 : undefined }}>
                <td style={{ width: 90 }}>
                  <Badge variant={isUnread ? 'blue' : item.status === 'archived' ? 'gray' : 'green'}>
                    {item.status || 'unread'}
                  </Badge>
                </td>
                <td style={{ width: 110 }}>
                  <Badge variant={item.type === 'contact' ? 'amber' : item.type === 'join' ? 'green' : 'blue'}>
                    {item.type || 'message'}
                  </Badge>
                </td>
                <td>
                  <div>{item.name || 'Anonymous'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{item.email}</div>
                </td>
                <td>
                  <div>{item.subject || item.wingInterest || 'No subject'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.message}
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem', fontWeight: 400 }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      variant="secondary"
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                      onClick={() => {
                        setSelectedItem(item);
                        if (isUnread && item.type !== 'notification') {
                          void updateStatus(item._id, 'read');
                        }
                      }}
                    >
                      View
                    </Button>
                    {item.type !== 'notification' && item.type !== 'research-app' && (
                      <>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          title={isUnread ? 'Mark as Read' : 'Mark as Unread'}
                          onClick={() => updateStatus(item._id, isUnread ? 'read' : 'unread')}
                        >
                          {isUnread ? '✓ Read' : '✉ Unread'}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          title={item.status === 'archived' ? 'Unarchive' : 'Archive'}
                          onClick={() => updateStatus(item._id, item.status === 'archived' ? 'read' : 'archived')}
                        >
                          {item.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Message Details Modal */}
      {selectedItem && (
        <Modal
          open={Boolean(selectedItem)}
          title={`Message from ${selectedItem.name || 'Visitor'}`}
          onClose={() => setSelectedItem(null)}
        >
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingBottom: 16, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Sender Name</span>
                <strong>{selectedItem.name}</strong>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Email Address</span>
                <a href={`mailto:${selectedItem.email}`} style={{ color: '#148f83', fontWeight: 500 }}>{selectedItem.email}</a>
              </div>
              {selectedItem.phone && (
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Phone</span>
                  <span>{selectedItem.phone}</span>
                </div>
              )}
              {selectedItem.wingInterest && (
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Wing Interest</span>
                  <span>{selectedItem.wingInterest}</span>
                </div>
              )}
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Date Received</span>
                <span>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A'}</span>
              </div>
              <div>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block' }}>Status</span>
                <Badge variant={selectedItem.status === 'unread' ? 'blue' : selectedItem.status === 'archived' ? 'gray' : 'green'}>
                  {selectedItem.status || 'read'}
                </Badge>
              </div>
            </div>

            {selectedItem.subject && (
              <div style={{ marginBottom: 16 }}>
                <span className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Subject</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{selectedItem.subject}</div>
              </div>
            )}

            <div>
              <span className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Full Message Content</span>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {selectedItem.message}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {selectedItem.email && (
                  <a
                    href={`mailto:${selectedItem.email}?subject=Re: ${encodeURIComponent(selectedItem.subject || 'Inquiry to ASPIER')}`}
                    className="button button-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    Reply via Email
                  </a>
                )}
                {selectedItem.type !== 'notification' && selectedItem.type !== 'research-app' && (
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus(selectedItem._id, selectedItem.status === 'archived' ? 'read' : 'archived')}
                  >
                    {selectedItem.status === 'archived' ? 'Move to Inbox' : 'Archive Message'}
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
