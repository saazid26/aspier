import { useLocation, Navigate } from 'react-router-dom';

/**
 * Consolidated Check Application Portal
 * Automatically redirects legacy /join/portal or /check-application links to the unified
 * Notification Bar (PublicApplicantBell) with the Check Application gate triggered.
 */
export function MembershipPortal() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  searchParams.set('checkApplication', 'true');
  return <Navigate to={`/?${searchParams.toString()}`} replace />;
}
