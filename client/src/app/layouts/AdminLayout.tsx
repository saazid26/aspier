import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NotificationBell } from '../../components/common/NotificationBell';
const adminLinks=[['/admin','Dashboard'],['/admin/resources/wings','Wings'],['/admin/resources/research','Research'],['/admin/research-applications','Research Applications'],['/admin/resources/supervisors','Supervisors'],['/admin/resources/scholars','Scholars'],['/admin/resources/instructors','Instructors'],['/admin/resources/news','News'],['/admin/resources/courses','ASPIER Academy / Courses'],['/admin/membership-applications','Membership applications'],['/admin/resources/users','Users'],['/admin/resources/messages','Messages'],['/admin/payments','Payments'],['/admin/classes','Classes'],['/admin/courses/curriculum','Curriculum'],['/admin/media','Media library'],['/admin/settings','Site & payment settings'],['/admin/security','Security'],['/admin/audit','Audit log']];
export function AdminLayout(){
  const [menuOpen,setMenuOpen]=useState(false);
  return <div className="admin-shell">
    <header className="admin-mobile-bar"><Link to="/admin" aria-label="Admin dashboard"><img src="/aspier-logo.png" alt="ASPIER"/></Link><strong>Control Panel</strong><NotificationBell audience="admin"/><button className="menu-toggle" type="button" aria-label={menuOpen?'Close admin menu':'Open admin menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={23}/>:<Menu size={23}/>}</button></header>
    <div className="layout">
      <aside className={`sidebar ${menuOpen?'sidebar-open':''}`}><Link to="/" style={{display:'block',padding:'8px 12px 18px'}} onClick={()=>setMenuOpen(false)}><img src="/aspier-logo.png" alt="ASPIER" style={{height:42,width:42,objectFit:'cover',borderRadius:'50%'}}/></Link>{adminLinks.map(([to,label])=><Link key={to} to={to} onClick={()=>setMenuOpen(false)}>{label}</Link>)}</aside>
      <main className="content"><div className="admin-notification-bar"><NotificationBell audience="admin"/></div><Outlet/></main>
    </div>
  </div>
}
