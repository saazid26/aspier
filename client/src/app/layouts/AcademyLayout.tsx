import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function AcademyLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navContainerRef = useRef<HTMLElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data
  });

  // Automatically close menu cleanly whenever route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Click-outside listener that NEVER intercepts taps inside the menu or links
  useEffect(() => {
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      if (!menuOpen) return;
      const target = event.target as Node;
      // If the touch/click originated inside the nav, links, or toggle button, do NOT close here
      if (
        (navContainerRef.current && navContainerRef.current.contains(target)) ||
        (navLinksRef.current && navLinksRef.current.contains(target)) ||
        (menuToggleRef.current && menuToggleRef.current.contains(target)) ||
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

  return (
    <div className="app-shell">
      <nav className="nav" ref={navContainerRef}>
        <div className="container nav-inner">
          <Link
            className="brand"
            to="/academy"
            aria-label="ASPIER Academy home"
            onClick={() => setMenuOpen(false)}
          >
            <img
              className="brand-logo academy-brand-logo"
              src={settings?.academyLogoUrl || '/aspier-academy-logo.png'}
              alt="ASPIER Academy"
            />
          </Link>

          <div className="header-right-controls">
            <button
              ref={menuToggleRef}
              className="menu-toggle"
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>

          <div
            ref={navLinksRef}
            className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}
            style={menuOpen ? { pointerEvents: 'auto', zIndex: 100 } : undefined}
          >
            <Link
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              to="/"
              onClick={() => setMenuOpen(false)}
            >
              ASPIER
            </Link>
            <Link
              className={`nav-link ${location.pathname === '/academy' ? 'active' : ''}`}
              to="/academy"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              className={`nav-link ${location.pathname === '/academy/register' ? 'active' : ''}`}
              to="/academy/register"
              onClick={() => setMenuOpen(false)}
            >
              Register
            </Link>
            <Link
              className={`nav-link ${location.pathname.startsWith('/academy/student') || location.pathname.startsWith('/student') || location.pathname.startsWith('/academy/portal') ? 'active' : ''}`}
              to="/academy/student"
              onClick={() => setMenuOpen(false)}
            >
              Student Portal
            </Link>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
