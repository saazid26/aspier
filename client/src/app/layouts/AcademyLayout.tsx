import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
export function AcademyLayout(){
  const [menuOpen,setMenuOpen]=useState(false);
  const location=useLocation();
  const navControlsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{setMenuOpen(false)},[location.pathname]);
  useEffect(()=>{
    const closeOutside=(event:MouseEvent|TouchEvent)=>{if(menuOpen&&navControlsRef.current&&!navControlsRef.current.contains(event.target as Node))setMenuOpen(false)};
    const closeEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false)};
    document.addEventListener('mousedown',closeOutside);document.addEventListener('touchstart',closeOutside);document.addEventListener('keydown',closeEscape);
    return()=>{document.removeEventListener('mousedown',closeOutside);document.removeEventListener('touchstart',closeOutside);document.removeEventListener('keydown',closeEscape)};
  },[menuOpen]);
  return <div><nav className="nav"><div className="container nav-inner">
    <Link className="brand" to="/" onClick={()=>setMenuOpen(false)}><img className="brand-logo academy-brand-logo" src="/aspier-academy-logo.png" alt="ASPIER Academy"/></Link>
    <div className="header-right-controls" ref={navControlsRef}>
      <button className="menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={23}/>:<Menu size={23}/>}</button>
    </div>
    <div className={`nav-links ${menuOpen?'nav-links-open':''}`}>
      <Link className="nav-link" to="/" onClick={()=>setMenuOpen(false)}>Home</Link>
      <Link className="nav-link" to="/register" onClick={()=>setMenuOpen(false)}>Register</Link>
      <Link className="nav-link" to="/student/dashboard" onClick={()=>setMenuOpen(false)}>Student Portal</Link>
    </div>
  </div></nav><Outlet/></div>
}
