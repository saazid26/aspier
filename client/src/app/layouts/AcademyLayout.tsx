import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { prefetchRoute } from '../../lib/prefetch';
import { SocialConnectFooter } from '../../components/SocialConnectFooter';

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
            className="brand inline-flex items-center gap-2.5 sm:gap-3 shrink-0"
            to="/academy"
            aria-label="ASPIER Academy home"
            onClick={() => setMenuOpen(false)}
          >
            <img
              className="brand-logo academy-brand-logo"
              src={settings?.academyLogoUrl || '/aspier-academy-logo.png'}
              alt="ASPIER Academy — Research Training & Technical Courses"
              width="42"
              height="42"
              decoding="async"
              fetchPriority="high"
            />
            <span
              className="brand-wordmark brand-wordmark-academy normal-case inline-flex items-baseline gap-1.5 leading-none"
              style={{
                fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                textTransform: 'none'
              }}
            >
              <span
                className="word-aspier font-extrabold tracking-[0.04em] text-lg sm:text-[21px] leading-none normal-case"
                style={{
                  color: '#15803D',
                  fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'none'
                }}
              >
                ASPIER
              </span>
              <span
                className="word-academy font-normal tracking-[0.01em] text-lg sm:text-[21px] leading-none normal-case"
                style={{
                  color: '#15803D',
                  fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: 400,
                  letterSpacing: '0.01em',
                  textTransform: 'none'
                }}
              >
                Academy
              </span>
            </span>
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
              onMouseEnter={() => prefetchRoute('/')}
              onFocus={() => prefetchRoute('/')}
            >
              ASPIER
            </Link>
            <Link
              className={`nav-link ${location.pathname === '/academy' ? 'active' : ''}`}
              to="/academy"
              onClick={() => setMenuOpen(false)}
              onMouseEnter={() => prefetchRoute('/academy')}
              onFocus={() => prefetchRoute('/academy')}
            >
              Courses
            </Link>
            <Link
              className={`nav-link ${location.pathname === '/academy/register' ? 'active' : ''}`}
              to="/academy/register"
              onClick={() => setMenuOpen(false)}
              onMouseEnter={() => prefetchRoute('/academy/register')}
              onFocus={() => prefetchRoute('/academy/register')}
            >
              Register
            </Link>
            <Link
              className={`nav-link ${
                location.pathname.startsWith('/academy/student') ||
                location.pathname.startsWith('/academy/student-portal') ||
                location.pathname.startsWith('/student') ||
                location.pathname.startsWith('/academy/portal')
                  ? 'active'
                  : ''
              }`}
              to="/academy/student"
              onClick={() => setMenuOpen(false)}
              onMouseEnter={() => prefetchRoute('/academy/student')}
              onFocus={() => prefetchRoute('/academy/student')}
            >
              Student Portal
            </Link>
            <Link
              className={`nav-link ${location.pathname === '/academy/verify-certificate' ? 'active' : ''}`}
              to="/academy/verify-certificate"
              onClick={() => setMenuOpen(false)}
              onMouseEnter={() => prefetchRoute('/academy/verify-certificate')}
              onFocus={() => prefetchRoute('/academy/verify-certificate')}
            >
              Verify Certificate
            </Link>
          </div>
        </div>
      </nav>
      <Outlet />
      <footer className="footer bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-sm">
        <div className="container mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <Link
              to="/academy"
              className="brand inline-flex items-center gap-2.5 sm:gap-3 shrink-0 group"
              aria-label="ASPIER Academy home"
            >
              <img
                className="brand-logo academy-brand-logo"
                src={settings?.academyLogoUrl || '/aspier-academy-logo.png'}
                alt="ASPIER Academy logo"
                width="38"
                height="38"
                style={{ width: 38, height: 38, minWidth: 38, minHeight: 38 }}
              />
              <span
                className="brand-wordmark brand-wordmark-academy normal-case inline-flex items-baseline gap-1.5 leading-none text-lg sm:text-[21px]"
                style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", textTransform: 'none' }}
              >
                <span
                  className="word-aspier font-extrabold tracking-[0.04em] leading-none normal-case"
                  style={{ color: '#34d399', fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '0.04em', textTransform: 'none' }}
                >
                  ASPIER
                </span>
                <span
                  className="word-academy font-normal tracking-[0.01em] leading-none normal-case"
                  style={{ color: '#34d399', fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", fontWeight: 400, letterSpacing: '0.01em', textTransform: 'none' }}
                >
                  Academy
                </span>
              </span>
            </Link>
          </div>
          <SocialConnectFooter variant="dark" showBorder={false} />
          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium">
              <Link to="/academy" className="hover:text-white transition">Courses</Link>
              <Link to="/academy/student" className="hover:text-white transition">Student Portal</Link>
              <Link to="/academy/verify-certificate" className="hover:text-white transition text-teal-400">Verify Certificate</Link>
              <Link to="/" className="hover:text-white transition">ASPIER Main</Link>
            </div>
            <div className="text-xs text-slate-500 text-center sm:text-right">
              © {new Date().getFullYear()} ASPIER Academy — Aeronautical, Spatial, Planetary Institution for Environmental Research
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
