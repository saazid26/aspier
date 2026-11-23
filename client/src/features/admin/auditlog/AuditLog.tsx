import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  User,
  Clock,
  Globe,
  Activity,
  CheckCircle2,
  XCircle,
  Filter,
  Check,
  Loader2
} from 'lucide-react';
import { api } from '../../../lib/api';

type AuditEntry = {
  _id: string;
  actorId?: {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  description?: string;
  resource: string;
  resourceId?: string;
  route?: string;
  status?: 'success' | 'failure';
  ip?: string;
  ipAddress?: string;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop';
  os?: string;
  browser?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
};

function formatRelativeTime(dateString: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatExactDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
}

export function AuditLog() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, isFetching, refetch } = useQuery<AuditEntry[]>({
    queryKey: ['admin-audit-logs', roleFilter, statusFilter, resourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (resourceFilter !== 'all') params.set('resource', resourceFilter);
      params.set('limit', '300');
      const res = await api.get(`/admin/audit?${params.toString()}`);
      return res.data.data || [];
    },
    refetchInterval: autoRefresh ? 15000 : false
  });

  const logs = data || [];

  // Client-side search filtering across actor, action, description, IP, device
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const term = search.toLowerCase().trim();
    return logs.filter((log) => {
      const name = (log.actorName || log.actorId?.name || '').toLowerCase();
      const email = (log.actorEmail || log.actorId?.email || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const desc = (log.description || '').toLowerCase();
      const resource = (log.resource || '').toLowerCase();
      const ip = (log.ipAddress || log.ip || '').toLowerCase();
      const os = (log.os || '').toLowerCase();
      const browser = (log.browser || '').toLowerCase();
      const device = (log.deviceType || '').toLowerCase();

      return (
        name.includes(term) ||
        email.includes(term) ||
        action.includes(term) ||
        desc.includes(term) ||
        resource.includes(term) ||
        ip.includes(term) ||
        os.includes(term) ||
        browser.includes(term) ||
        device.includes(term)
      );
    });
  }, [logs, search]);

  // Unique resources for dropdown filter
  const resourceOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.resource) set.add(log.resource);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Device Icon Selector
  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'Mobile':
        return <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
      case 'Tablet':
        return <Tablet className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
      default:
        return <Monitor className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  // Role Pill Styler
  const getRoleBadge = (role?: string) => {
    const r = (role || 'guest').toLowerCase();
    switch (r) {
      case 'admin':
      case 'superadmin':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'student':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'supervisor':
      case 'youngscholar':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'applicant':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-teal-700" />
            <span>Audit &amp; Telemetry Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time device-tracked activity, authentication events, and administrative mutations.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>Auto-refresh (15s): {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar Card */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, action, IP, device…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[40px] pl-9 pr-3 text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full min-h-[40px] px-3 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin / Superadmin</option>
              <option value="student">Student</option>
              <option value="supervisor">Supervisor</option>
              <option value="youngScholar">Young Scholar</option>
              <option value="applicant">Applicant</option>
              <option value="guest">Guest / Anonymous</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full min-h-[40px] px-3 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure / Blocked</option>
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full min-h-[40px] px-3 text-xs rounded-xl border border-slate-300 bg-white text-slate-700 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border"
            >
              <option value="all">All Resources</option>
              {resourceOptions.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter & Active filter badges */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong>{filteredLogs.length}</strong> of {logs.length} audit records
          </span>
          {(search || roleFilter !== 'all' || statusFilter !== 'all' || resourceFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
                setResourceFilter('all');
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Content Container */}
      {isLoading ? (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-12 text-center text-slate-500">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold">Loading real-time audit logs…</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-12 text-center text-slate-500">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700">No audit logs found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or role/status filters.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: FULL STRUCTURED TABLE */}
          <div className="hidden lg:block rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden box-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Actor / User</th>
                    <th className="py-3 px-4">Activity &amp; Description</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Device / Browser / IP</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const actorName = log.actorName || log.actorId?.name || 'Anonymous';
                    const actorEmail = log.actorEmail || log.actorId?.email || '';
                    const actorRole = log.actorRole || log.actorId?.role || 'guest';
                    const isSuccess = log.status !== 'failure';
                    const ip = log.ipAddress || log.ip || '127.0.0.1';
                    const deviceString = `${log.deviceType || 'Desktop'} • ${log.os || 'OS'} • ${log.browser || 'Browser'}`;

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Who: Actor */}
                        <td className="py-3 px-4 align-top">
                          <div className="font-bold text-slate-900 truncate max-w-[180px]">
                            {actorName}
                          </div>
                          {actorEmail && (
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                              {actorEmail}
                            </div>
                          )}
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadge(
                              actorRole
                            )}`}
                          >
                            {actorRole}
                          </span>
                        </td>

                        {/* 2. What: Activity & Description */}
                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {log.description || log.action}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            action: <span className="text-slate-600 font-semibold">{log.action}</span>
                            {log.route && ` • ${log.route}`}
                          </div>
                        </td>

                        {/* 3. Resource Badge */}
                        <td className="py-3 px-4 align-top">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.resource}
                          </span>
                          {log.resourceId && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[120px]">
                              #{log.resourceId}
                            </div>
                          )}
                        </td>

                        {/* 4. Status Pill */}
                        <td className="py-3 px-4 align-top">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>

                        {/* 5. Device, OS, Browser & IP */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            {getDeviceIcon(log.deviceType)}
                            <span className="truncate max-w-[190px]">{deviceString}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{ip}</span>
                          </div>
                        </td>

                        {/* 6. Timestamp */}
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {formatRelativeTime(log.createdAt)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {formatExactDateTime(log.createdAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE & TABLET VIEW: STRUCTURED STACKED CARDS */}
          <div className="lg:hidden space-y-3">
            {filteredLogs.map((log) => {
              const actorName = log.actorName || log.actorId?.name || 'Anonymous';
              const actorEmail = log.actorEmail || log.actorId?.email || '';
              const actorRole = log.actorRole || log.actorId?.role || 'guest';
              const isSuccess = log.status !== 'failure';
              const ip = log.ipAddress || log.ip || '127.0.0.1';
              const deviceString = `${log.deviceType || 'Desktop'} • ${log.os || 'OS'} • ${log.browser || 'Browser'}`;

              return (
                <div
                  key={log._id}
                  className="rounded-2xl bg-white border border-slate-200 shadow-xs p-3.5 sm:p-4 space-y-3 box-border"
                >
                  {/* Top Row: Actor & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{actorName}</div>
                      {actorEmail && (
                        <div className="text-xs text-slate-500 font-mono">{actorEmail}</div>
                      )}
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadge(
                          actorRole
                        )}`}
                      >
                        {actorRole}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isSuccess ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Failed</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Description & Resource */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <p className="font-semibold text-slate-900 leading-snug m-0">
                      {log.description || log.action}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-white text-slate-700 font-semibold border border-slate-200">
                        {log.resource}
                      </span>
                      {log.resourceId && (
                        <span className="font-mono text-slate-400 text-[10px]">
                          #{log.resourceId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Device, Browser & IP */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      {getDeviceIcon(log.deviceType)}
                      <span className="text-[11px]">{deviceString}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span>{ip}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
