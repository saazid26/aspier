import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCsrf } from '../../hooks/useCsrf';
import { prefetchRoute } from '../../lib/prefetch';
import { PublicApplicantBell } from '../../components/common/PublicApplicantBell';
const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/wings', label: 'Wings' },
  { to: '/team', label: 'Team' },
  { to: '/academy', label: 'Academy' },
  { to: '/news', label: 'News' },
  { to: '/contact', label: 'Contact' }
];
export function PublicLayout() {
  useCsrf();
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navControlsRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      if (!menuOpen) return;
      const target = event.target as Node;
      if (
        (navControlsRef.current && navControlsRef.current.contains(target)) ||
        (navLinksRef.current && navLinksRef.current.contains(target)) ||
        (target as Element)?.closest?.('.nav-links') ||
        (target as Element)?.closest?.('.menu-toggle')
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside, { passive: true });
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [menuOpen]);
  return <div className="app-shell">
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="ASPIER home" onClick={() => setMenuOpen(false)}>
          <img
            className="brand-logo"
            src={settings?.aspierLogoUrl || '/aspier-logo.png'}
            alt="ASPIER — Aeronautical, Spatial, Planetary Institution for Environmental Research"
            width="160"
            height="48"
            decoding="async"
            fetchPriority="high"
          />
        </Link>
        <div className="header-right-controls" ref={navControlsRef}>
          <PublicApplicantBell onOpenChange={(open) => { if (open) setMenuOpen(false); }}/>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => {
            window.dispatchEvent(new Event('aspier-notifications-close'));
            setMenuOpen((open) => !open);
          }}>
            {menuOpen ? <X size={23}/> : <Menu size={23}/>}
          </button>
        </div>
        <div ref={navLinksRef} className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          {links.map(({to,label,end}) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}
              onClick={() => setMenuOpen(false)}
              onMouseEnter={() => prefetchRoute(to)}
              onFocus={() => prefetchRoute(to)}
            >
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/join"
            className={({isActive}) => isActive ? 'nav-link nav-apply active' : 'nav-link nav-apply'}
            onClick={() => setMenuOpen(false)}
            onMouseEnter={() => prefetchRoute('/join')}
            onFocus={() => prefetchRoute('/join')}
          >
            Apply
          </NavLink>
          <NavLink
            to="/login"
            className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={() => setMenuOpen(false)}
            onMouseEnter={() => prefetchRoute('/login')}
            onFocus={() => prefetchRoute('/login')}
          >
            Login
          </NavLink>
        </div>
      </div>
    </nav>
    <main key={location.pathname}><Outlet/></main>
    <footer className="footer"><div className="container">{settings?.footerCopyright || <><strong>ASPIER</strong> — Aeronautical, Spatial, Planetary Institute for Environmental Research · © {new Date().getFullYear()}</>}</div></footer>
  </div>;
}
