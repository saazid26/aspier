import React from 'react';
import { useLocation } from 'react-router-dom';

interface SocialConnectFooterProps {
  variant?: 'dark' | 'light' | 'auto';
  className?: string;
  showBorder?: boolean;
}

export function SocialConnectFooter({
  variant = 'auto',
  className = '',
  showBorder = true
}: SocialConnectFooterProps) {
  const location = useLocation();
  const isAcademy = location.pathname.startsWith('/academy');

  // Detect theme context
  const isDark = variant === 'dark' || (variant === 'auto' && isAcademy);

  const facebookUrl = isAcademy
    ? 'https://www.facebook.com/aspieracademy.global'
    : 'https://www.facebook.com/aspier.global';

  const facebookLabel = isAcademy
    ? 'ASPIER Academy Official Facebook Page'
    : 'ASPIER Official Facebook Page';

  const facebookTitle = isAcademy
    ? 'ASPIER Academy Facebook'
    : 'ASPIER Facebook';

  const socialLinks = [
    {
      id: 'facebook',
      name: facebookTitle,
      label: facebookLabel,
      url: facebookUrl,
      hoverClass: 'hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white hover:shadow-blue-500/20',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      label: 'ASPIER Official LinkedIn Page',
      url: 'https://www.linkedin.com/company/aspier-global/',
      hoverClass: 'hover:bg-[#0A66C2] hover:border-[#0A66C2] hover:text-white hover:shadow-sky-500/20',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24" />
        </svg>
      )
    },
    {
      id: 'youtube',
      name: 'YouTube',
      label: 'ASPIER Official YouTube Channel',
      url: 'https://www.youtube.com/@aspier.global',
      hoverClass: 'hover:bg-[#FF0000] hover:border-[#FF0000] hover:text-white hover:shadow-red-500/20',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      )
    },
    {
      id: 'instagram',
      name: 'Instagram',
      label: 'ASPIER Official Instagram Page',
      url: 'https://www.instagram.com/aspier.global/',
      hoverClass: 'hover:bg-gradient-to-tr hover:from-[#FD1D1D] hover:via-[#E1306C] hover:to-[#405DE6] hover:border-transparent hover:text-white hover:shadow-pink-500/20',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    },
    {
      id: 'threads',
      name: 'Threads',
      label: 'ASPIER Official Threads Page',
      url: 'https://www.threads.com/@aspier.global',
      hoverClass: 'hover:bg-black hover:border-slate-500 hover:text-white hover:shadow-zinc-500/20',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.186 24C5.467 24 0 18.533 0 11.814 0 5.094 5.467 0 12.186 0c6.643 0 11.968 5.253 12.062 11.814H21.75c-.092-5.32-4.303-9.565-9.564-9.565-5.335 0-9.68 4.345-9.68 9.68 0 5.335 4.345 9.68 9.68 9.68 4.12 0 7.733-2.616 9.073-6.526l2.148.742C21.752 20.485 17.317 24 12.186 24zm4.492-12.784c-.31-3.69-2.766-5.836-6.136-5.836-3.805 0-6.69 2.92-6.69 6.786 0 3.738 2.768 6.642 6.442 6.642 2.39 0 4.275-.984 5.378-2.8l-1.89-1.127c-.742 1.258-1.956 1.843-3.488 1.843-2.355 0-4.04-1.843-4.04-4.558 0-2.637 1.76-4.664 4.37-4.664 2.216 0 3.754 1.332 3.935 3.714H12.1v2.084h6.732c-.01 1.25-.332 2.457-.96 3.522l1.83 1.22c.983-1.577 1.487-3.376 1.5-5.244l.006-.576h-4.53z" />
        </svg>
      )
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      label: 'ASPIER Official X (Twitter) Page',
      url: 'https://x.com/AspierGlobal',
      hoverClass: 'hover:bg-black hover:border-slate-500 hover:text-white hover:shadow-zinc-500/20',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    },
    {
      id: 'gmail',
      name: 'Official Email',
      label: 'Email ASPIER Official Gmail: aspier.global@gmail.com',
      url: 'mailto:aspier.global@gmail.com',
      hoverClass: 'hover:bg-[#EA4335] hover:border-[#EA4335] hover:text-white hover:shadow-red-500/20',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      )
    }
  ];

  return (
    <div
      className={`social-connect-bar ${showBorder ? (isDark ? 'border-t border-slate-800/80 pt-6 mt-6' : 'border-t border-slate-200/80 pt-6 mt-6') : ''} ${className}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Label & Subtitle */}
        <div className="text-center md:text-left space-y-0.5">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isDark ? 'bg-teal-400' : 'bg-teal-600'
              } animate-pulse`}
            />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Connect to Join
            </h4>
          </div>
          <p
            className={`text-[11px] sm:text-xs leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Follow {isAcademy ? 'ASPIER Academy' : 'ASPIER'} across our official institutional channels
          </p>
        </div>

        {/* Action Icon Buttons */}
        <div className="max-w-[220px] mx-auto flex flex-wrap items-center justify-center gap-2.5 sm:max-w-none sm:mx-0 sm:gap-3 md:flex-nowrap">
          {socialLinks.map((item) => {
            const isMail = item.url.startsWith('mailto:');
            return (
              <a
                key={item.id}
                href={item.url}
                target={isMail ? undefined : '_blank'}
                rel={isMail ? undefined : 'noopener noreferrer'}
                aria-label={item.label}
                title={item.name}
                className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                  isDark
                    ? 'bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:text-white'
                    : 'bg-white text-slate-700 border border-slate-200/90 shadow-2xs hover:text-white'
                } ${item.hoverClass}`}
              >
                {item.icon}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
