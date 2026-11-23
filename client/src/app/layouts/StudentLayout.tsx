import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NotificationBell } from '../../components/common/NotificationBell';
import { useMe } from '../../features/auth/useMe';

const studentNavLinks = [
  { to: '/academy/student', label: 'Dashboard', exact: true },
  { to: '/academy/student/courses', label: 'My Courses' },
  { to: '/academy/student/payments', label: 'Payments' },
  { to: '/academy/student/profile', label: 'Profile' },
  { to: '/academy/student/security', label: 'Security' }
];

export function StudentLayout() {
  const { me } = useMe();
  const location = useLocation();
  const avatarUrl = me?.avatarUrl || me?.avatar;

  const isLinkActive = (to: string, exact?: boolean) => {
    if (exact) {
      return (
        location.pathname === '/academy/student' ||
        location.pathname === '/academy/student/' ||
        location.pathname === '/academy/student/dashboard' ||
        location.pathname === '/student' ||
        location.pathname === '/student/' ||
        location.pathname === '/student/dashboard'
      );
    }
    const legacyPath = to.replace('/academy/student', '/student');
    return location.pathname.startsWith(to) || location.pathname.startsWith(legacyPath);
  };

  return (
    <div className="member-layout">
      <header className="member-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link to="/academy/student" className="font-bold text-slate-900 text-sm sm:text-base hover:text-teal-800 transition">
            Student Portal
          </Link>
          {me?.name && (
            <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
              | Welcome, <strong className="text-teal-900">{me.name}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/academy/student/profile" className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-teal-800 transition">
            {avatarUrl ? (
              <img src={avatarUrl} alt={me?.name || 'Student'} className="w-8 h-8 rounded-full object-cover border border-teal-600/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-600/30 text-teal-800 flex items-center justify-center font-bold text-xs">
                {me?.name ? me.name[0].toUpperCase() : 'S'}
              </div>
            )}
            <span className="hidden md:inline font-medium">{me?.name || 'Profile'}</span>
          </Link>
          <NotificationBell audience="member" />
        </div>
      </header>

      {/* Responsive Horizontal Mobile Tabs for screens < 900px */}
      <nav aria-label="Student Navigation" className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 bg-slate-50 border-b border-slate-200 scrollbar-none">
        {studentNavLinks.map(({ to, label, exact }) => {
          const active = isLinkActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={`shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
                active
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-teal-800 border border-slate-200'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="layout">
        <aside className="sidebar">
          {studentNavLinks.map(({ to, label, exact }) => {
            const active = isLinkActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={active ? 'active' : ''}
              >
                {label === 'Security' ? 'Security settings' : label}
              </Link>
            );
          })}
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
