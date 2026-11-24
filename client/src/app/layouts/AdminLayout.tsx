import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { NotificationBell } from '../../components/common/NotificationBell';

const adminLinks = [
  ['/admin', 'Dashboard'],
  ['/admin/branding', 'General & Branding'],
  ['/admin/home-cms', 'Home Page CMS'],
  ['/admin/wings-research', 'Wings & Research'],
  ['/admin/team-manager', 'Team Manager'],
  ['/admin/membership-applications', 'Applications / Inquiries'],
  ['/admin/research-applications', 'Research Mate Apps'],
  ['/admin/announcements-cms', 'Announcements & News'],
  ['/admin/academy-cms', 'ASPIER Academy CMS'],
  ['/admin/inbox', 'Messages & Inbox'],
  ['/admin/media', 'Media Library'],
  ['/admin/security', 'Security & Authentication'],
  ['/admin/audit', 'Audit Log']
];

export function AdminLayout(){
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-shell">
      <header className="admin-mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/admin" aria-label="Admin dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/aspier-logo.png" alt="ASPIER" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}/>
            <span style={{ color: '#0F5132', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', textTransform: 'none' }}>ASPIER</span>
          </Link>
          <strong style={{ color: '#475569', fontSize: '0.85rem' }}>Control Panel</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationBell audience="admin"/>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close admin menu' : 'Open admin menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23}/> : <Menu size={23}/>}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[43] md:hidden"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="layout">
        <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 12px 18px', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
            <img src="/aspier-logo.png" alt="ASPIER" style={{ height: 42, width: 42, objectFit: 'cover', borderRadius: '50%' }}/>
            <span style={{ color: '#0F5132', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', textTransform: 'none' }}>ASPIER</span>
          </Link>
          {adminLinks.map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
        </aside>
        <main className="content">
          <div className="admin-notification-bar">
            <NotificationBell audience="admin"/>
          </div>
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
