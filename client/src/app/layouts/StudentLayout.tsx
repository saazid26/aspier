import { Link, Outlet } from 'react-router-dom';
import { NotificationBell } from '../../components/common/NotificationBell';
import { useMe } from '../../features/auth/useMe';

export function StudentLayout() {
  const { me } = useMe();
  const avatarUrl = me?.avatarUrl || me?.avatar;

  return (
    <div className="member-layout">
      <header className="member-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link to="/student/dashboard" className="font-bold text-slate-900 text-sm sm:text-base hover:text-teal-800 transition">
            Student Portal
          </Link>
          {me?.name && (
            <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
              | Welcome, <strong className="text-teal-900">{me.name}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/student/profile" className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-teal-800 transition">
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
      <div className="layout">
        <aside className="sidebar">
          <Link to="/student/dashboard">Dashboard</Link>
          <Link to="/student/courses">My Courses</Link>
          <Link to="/student/payments">Payments</Link>
          <Link to="/student/profile">Profile</Link>
          <Link to="/student/security">Security settings</Link>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
