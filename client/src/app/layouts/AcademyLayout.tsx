import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
export function AcademyLayout(){
  const [menuOpen,setMenuOpen]=useState(false);
  const location=useLocation();
  const navControlsRef=useRef<HTMLDivElement>(null);
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data
  });
  useEffect(()=>{setMenuOpen(false)},[location.pathname]);
  useEffect(()=>{
    const closeOutside=(event:MouseEvent|TouchEvent)=>{if(menuOpen&&navControlsRef.current&&!navControlsRef.current.contains(event.target as Node))setMenuOpen(false)};
    const closeEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false)};
    document.addEventListener('mousedown',closeOutside);document.addEventListener('touchstart',closeOutside);document.addEventListener('keydown',closeEscape);
    return()=>{document.removeEventListener('mousedown',closeOutside);document.removeEventListener('touchstart',closeOutside);document.removeEventListener('keydown',closeEscape)};
  },[menuOpen]);
  return <div className="app-shell"><nav className="nav"><div className="container nav-inner">
    <Link className="brand" to="/academy" aria-label="ASPIER Academy home" onClick={()=>setMenuOpen(false)}><img className="brand-logo academy-brand-logo" src={settings?.academyLogoUrl || '/aspier-academy-logo.png'} alt="ASPIER Academy"/></Link>
    <div className="header-right-controls" ref={navControlsRef}>
      <button className="menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={23}/>:<Menu size={23}/>}</button>
    </div>
    <div className={`nav-links ${menuOpen?'nav-links-open':''}`}>
      <Link className="nav-link" to="/" onClick={()=>setMenuOpen(false)}>ASPIER</Link>
      <Link className="nav-link" to="/academy" onClick={()=>setMenuOpen(false)}>Home</Link>
      <Link className="nav-link" to="/academy/register" onClick={()=>setMenuOpen(false)}>Register</Link>
      <Link className="nav-link" to="/academy/portal" onClick={()=>setMenuOpen(false)}>Student Portal</Link>
    </div>
  </div></nav><Outlet/></div>;
}
