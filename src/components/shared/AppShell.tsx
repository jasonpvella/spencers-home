import { useRef, useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useCurrentUser } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { markNotificationRead } from '@/services/notifications';
import { getStateConfig } from '@/services/stateConfig';
import type { ReactNode } from 'react';

function applyBrandColor(hex: string) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const mix = (base: number, amt: number) => Math.min(255, Math.round(base + (255 - base) * amt));
  const dark = (base: number, amt: number) => Math.max(0, Math.round(base * (1 - amt)));
  const root = document.documentElement;
  root.style.setProperty('--brand-50',  [mix(r,0.95), mix(g,0.95), mix(b,0.95)].join(' '));
  root.style.setProperty('--brand-100', [mix(r,0.88), mix(g,0.88), mix(b,0.88)].join(' '));
  root.style.setProperty('--brand-500', [mix(r,0.15), mix(g,0.15), mix(b,0.15)].join(' '));
  root.style.setProperty('--brand-600', [r, g, b].join(' '));
  root.style.setProperty('--brand-700', [dark(r,0.15), dark(g,0.15), dark(b,0.15)].join(' '));
  root.style.setProperty('--brand-900', [dark(r,0.55), dark(g,0.55), dark(b,0.55)].join(' '));
}

const ADMIN_ROLES = ['state_admin', 'agency_admin', 'platform_admin'] as const;

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    if (!user?.stateId) return;
    getStateConfig(user.stateId).then((config) => {
      if (config?.branding?.primaryColor) applyBrandColor(config.branding.primaryColor);
      if (config?.branding?.logoUrl) setLogoUrl(config.branding.logoUrl);
    }).catch(() => { /* branding is non-critical */ });
  }, [user?.stateId]);

  // Close bell dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen]);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  async function handleSignOut() {
    await signOut(auth);
    navigate('/login');
  }

  async function handleNotificationClick(notifId: string, notif: { type?: string; childId?: string }) {
    if (!user?.stateId) return;
    setBellOpen(false);
    await markNotificationRead(user.stateId, notifId);
    if (notif.type === 'registration') {
      navigate('/admin/users');
    } else if (notif.childId) {
      navigate(`/profile/${notif.childId}`);
    }
  }

  const isAdmin = ADMIN_ROLES.includes(user?.role as typeof ADMIN_ROLES[number]);
  const unreadCount = notifications.length;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-3 py-1.5 rounded-md transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-medium'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-sm border-b border-gray-100 transition-colors ${
      isActive ? 'text-brand-700 font-medium bg-brand-50' : 'text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Left: logo + desktop nav links */}
          <div className="flex items-center gap-6">
            <Link to="/">
              {logoUrl ? (
                <img src={logoUrl} alt="Agency logo" className="h-7 w-auto max-w-[140px] object-contain" />
              ) : (
                <span className="font-semibold text-gray-900 text-sm hover:text-brand-700 transition-colors">Spencer's Home</span>
              )}
            </Link>
            {/* Desktop nav — hidden on mobile */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/gallery" className={navLinkClass}>Gallery</NavLink>
              {user && isAdmin && (
                <>
                  <NavLink to="/admin/users" className={navLinkClass}>Users</NavLink>
                  {(user.role === 'state_admin' || user.role === 'platform_admin') && (
                    <NavLink to="/admin/state-config" className={navLinkClass}>State Config</NavLink>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: user info + bell + sign out (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            {/* Username — desktop only */}
            {user && (
              <NavLink
                to="/settings"
                className="text-xs text-gray-400 hover:text-gray-700 hidden md:block transition-colors"
              >
                {user.displayName} · {user.role.replace(/_/g, ' ')}
              </NavLink>
            )}

            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((o) => !o)}
                aria-label="Notifications"
                className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-6 text-center">No new notifications</p>
                  ) : (
                    <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(n.id, { type: n.type, childId: n.childId })}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            {n.type === 'registration' ? (
                              <p className="text-sm text-gray-900">{n.message}</p>
                            ) : (
                              <>
                                <p className="text-sm text-gray-900">
                                  New inquiry for <span className="font-medium">{n.childFirstName}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">From {n.inquirerName}</p>
                              </>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Sign out — desktop only */}
            <button
              onClick={handleSignOut}
              className="hidden md:block text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded"
            >
              Sign out
            </button>

            {/* Hamburger — mobile only */}
            <div ref={menuRef} className="relative md:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu"
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
              >
                {menuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20">
                  <NavLink to="/dashboard" className={mobileNavLinkClass} onClick={closeMenu}>Dashboard</NavLink>
                  <NavLink to="/gallery" className={mobileNavLinkClass} onClick={closeMenu}>Gallery</NavLink>
                  {user && isAdmin && (
                    <>
                      <NavLink to="/admin/users" className={mobileNavLinkClass} onClick={closeMenu}>Users</NavLink>
                      {(user.role === 'state_admin' || user.role === 'platform_admin') && (
                        <NavLink to="/admin/state-config" className={mobileNavLinkClass} onClick={closeMenu}>State Config</NavLink>
                      )}
                    </>
                  )}
                  {user && (
                    <NavLink to="/settings" className={mobileNavLinkClass} onClick={closeMenu}>
                      <span className="block">{user.displayName}</span>
                      <span className="text-xs text-gray-400">{user.role.replace(/_/g, ' ')}</span>
                    </NavLink>
                  )}
                  <button
                    onClick={() => { closeMenu(); handleSignOut(); }}
                    className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
