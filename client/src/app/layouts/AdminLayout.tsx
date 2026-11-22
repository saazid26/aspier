import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
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
  const [menuOpen,setMenuOpen]=useState(false);
  return <div className="admin-shell">
    <header className="admin-mobile-bar">
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <Link to="/admin" aria-label="Admin dashboard"><img src="/aspier-logo.png" alt="ASPIER"/></Link>
        <strong>Control Panel</strong>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <NotificationBell audience="admin"/>
        <button className="menu-toggle" type="button" aria-label={menuOpen?'Close admin menu':'Open admin menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={23}/>:<Menu size={23}/>}</button>
      </div>
    </header>
    <div className="layout">
      <aside className={`sidebar ${menuOpen?'sidebar-open':''}`}><Link to="/" style={{display:'block',padding:'8px 12px 18px'}} onClick={()=>setMenuOpen(false)}><img src="/aspier-logo.png" alt="ASPIER" style={{height:42,width:42,objectFit:'cover',borderRadius:'50%'}}/></Link>{adminLinks.map(([to,label])=><Link key={to} to={to} onClick={()=>setMenuOpen(false)}>{label}</Link>)}</aside>
      <main className="content"><div className="admin-notification-bar"><NotificationBell audience="admin"/></div><Outlet/></main>
    </div>
  </div>
}
