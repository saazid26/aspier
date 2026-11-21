import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

type Notice = {
  _id: string;
  title: string;
  body: string;
  category: string;
  link?: string;
  readAt?: string;
  createdAt: string;
};

export function NotificationBell({ audience }: { audience: 'admin' | 'member' }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Notice | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', audience],
    queryFn: async () => {
      const path = audience === 'admin' ? '/admin/notifications' : '/auth/notifications';
      return (await api.get(path)).data.data as { items: Notice[]; unreadCount: number };
    },
    refetchInterval: 15000,
    staleTime: 5000
  });
  const notices = query.data?.items || [];
  const read = async (notice: Notice) => {
    setSelected(notice);
    if (!notice.readAt) {
      const path = audience === 'admin' ? `/admin/notifications/${notice._id}/read` : `/auth/notifications/${notice._id}/read`;
      try {
        await api.patch(path);
        await queryClient.invalidateQueries({ queryKey: ['notifications', audience] });
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Could not mark notification as read');
      }
    }
  };

  return <div className="notification-bell-wrap">
    <button className="notification-bell" type="button" aria-label={`${query.data?.unreadCount || 0} unread notifications`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell size={20}/>
      {!!query.data?.unreadCount && <span className="notification-count">{query.data.unreadCount}</span>}
    </button>
    {open && <div className="notification-popover" role="dialog" aria-label="Notifications">
      <div className="notification-popover-head"><strong>Notifications</strong><button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={18}/></button></div>
      {query.isLoading && <p className="muted">Loading notifications…</p>}
      {query.isError && <p className="notification-error" role="alert">Could not load notifications. Please try again.</p>}
      {!query.isLoading && !query.isError && notices.length === 0 && <p className="muted">You’re all caught up.</p>}
      <div className="notification-list">{notices.map((notice) => <button type="button" key={notice._id} className={`notification-item ${notice.readAt ? '' : 'unread'}`} onClick={() => void read(notice)}>
        <span className="notification-unread-dot" aria-hidden="true"/>
        <span><strong>{notice.title}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></span>
      </button>)}</div>
      {selected && <article className="notification-detail">
        <strong>{selected.title}</strong><p>{selected.body}</p><small>{new Date(selected.createdAt).toLocaleString()}</small>
        {selected.link && <Link className="button button-secondary" to={selected.link} onClick={() => setOpen(false)}>Open related page</Link>}
      </article>}
    </div>}
  </div>;
}
