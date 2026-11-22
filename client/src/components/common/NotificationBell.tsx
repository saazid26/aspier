import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, ArrowLeft, CheckCheck, ExternalLink } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  const bellWrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Media query listener for mobile viewport (< 768px)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Escape key and click-outside listener
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (isMobile) {
        return;
      }
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        bellWrapRef.current &&
        !bellWrapRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open, isMobile]);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (open && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open, isMobile]);

  // Reset selected item when closing
  useEffect(() => {
    if (!open) {
      setSelected(null);
    }
  }, [open]);

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
  const unreadCount = query.data?.unreadCount || 0;

  const read = async (notice: Notice) => {
    setSelected(notice);
    if (!notice.readAt) {
      const path = audience === 'admin' ? `/admin/notifications/${notice._id}/read` : `/auth/notifications/${notice._id}/read`;
      try {
        await api.patch(path);
        await queryClient.invalidateQueries({ queryKey: ['notifications', audience] });
      } catch (error: any) {
        console.warn('Could not mark notification as read', error);
      }
    }
  };

  const markAllRead = async () => {
    const path = audience === 'admin' ? '/admin/notifications/read-all' : '/auth/notifications/read-all';
    try {
      await api.patch(path);
      await queryClient.invalidateQueries({ queryKey: ['notifications', audience] });
      toast.success('All notifications marked as read');
    } catch {
      // Fallback: update individual unread notices
      try {
        const unreadNotices = notices.filter((n) => !n.readAt);
        await Promise.all(
          unreadNotices.map((n) =>
            api.patch(audience === 'admin' ? `/admin/notifications/${n._id}/read` : `/auth/notifications/${n._id}/read`)
          )
        );
        await queryClient.invalidateQueries({ queryKey: ['notifications', audience] });
        toast.success('All notifications marked as read');
      } catch {
        toast.error('Could not mark notifications as read');
      }
    }
  };

  const popoverContent = (
    <>
      {isMobile && (
        <button
          type="button"
          className="notification-mobile-backdrop"
          aria-label="Close notifications backdrop"
          onClick={() => setOpen(false)}
          tabIndex={-1}
        />
      )}
      <div
        ref={popoverRef}
        className={`notification-popover ${isMobile ? 'notification-popover-mobile' : ''}`}
        role="dialog"
        aria-modal={isMobile ? 'true' : undefined}
        aria-label={audience === 'admin' ? 'Admin Notifications' : 'Notifications'}
      >
        <div className="notification-popover-head">
          <div className="notification-title">
            <strong>{audience === 'admin' ? 'Admin Notifications' : 'Notifications'}</strong>
            {unreadCount > 0 && (
              <span className="notification-header-count" aria-label={`${unreadCount} unread`}>
                {unreadCount}
              </span>
            )}
          </div>
          <div className="notification-head-actions">
            {unreadCount > 0 && !selected && (
              <button
                type="button"
                className="notification-mark-all-btn"
                title="Mark all notifications as read"
                onClick={markAllRead}
              >
                <CheckCheck size={15} />
                <span>Read all</span>
              </button>
            )}
            <button
              type="button"
              className="notification-close-btn"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {query.isLoading && (
          <div className="notification-empty-state">
            <p className="muted">Loading notifications…</p>
          </div>
        )}

        {query.isError && (
          <div className="notification-empty-state">
            <p className="notification-error" role="alert">Could not load notifications. Please try again.</p>
          </div>
        )}

        {!query.isLoading && !query.isError && notices.length === 0 && (
          <div className="notification-empty-state">
            <Bell size={30} className="muted-icon" />
            <p className="muted">You’re all caught up!</p>
            <small>No notifications at this time.</small>
          </div>
        )}

        {!query.isLoading && notices.length > 0 && (
          selected ? (
            <article className="notification-detail-view">
              <div className="notification-detail-header">
                <button
                  type="button"
                  className="notification-back-button"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={15} />
                  <span>Back to list</span>
                </button>
                <span className="notification-detail-timestamp">
                  {new Date(selected.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="notification-detail-body-wrap">
                <h4 className="notification-detail-title">{selected.title}</h4>
                {selected.category && (
                  <span className="badge badge-teal notification-category-badge">
                    {selected.category}
                  </span>
                )}
                <p className="notification-detail-text">{selected.body}</p>
                <div className="notification-detail-actions">
                  {selected.link && (
                    <Link
                      className="button button-primary notification-action-link"
                      to={selected.link}
                      onClick={() => setOpen(false)}
                    >
                      <span>Open Related Page</span>
                      <ExternalLink size={14} style={{ marginLeft: 6 }} />
                    </Link>
                  )}
                  <button
                    type="button"
                    className="button button-secondary notification-action-close"
                    onClick={() => setSelected(null)}
                  >
                    Back to Notification List
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div className="notification-list">
              {notices.map((notice) => (
                <button
                  type="button"
                  key={notice._id}
                  className={`notification-item ${notice.readAt ? '' : 'unread'}`}
                  onClick={() => void read(notice)}
                >
                  <span className="notification-unread-dot" aria-hidden="true" />
                  <div className="notification-item-content">
                    <div className="notification-item-header">
                      <strong className="notification-item-title">{notice.title}</strong>
                      {!notice.readAt && <span className="notification-new-badge">New</span>}
                    </div>
                    <p className="notification-item-snippet">{notice.body}</p>
                    <div className="notification-item-footer">
                      <small className="notification-item-time">
                        {new Date(notice.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </small>
                      <span className="notification-item-action-hint">View details →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );

  return (
    <div className="notification-bell-wrap" ref={bellWrapRef}>
      <button
        className="notification-bell"
        type="button"
        aria-label={`${unreadCount} unread notifications`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>
      {open && (isMobile ? createPortal(popoverContent, document.body) : popoverContent)}
    </div>
  );
}
