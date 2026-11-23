import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileUp, FolderOpen, History, Settings as SettingsIcon, UserRound,
  LogOut, Menu, X, ShieldCheck, Plus, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { AVATAR_COLORS, initials } from '../lib/format.js';
import { Button, cn } from './ui.jsx';

const NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/new', label: 'New Analysis', icon: FileUp },
  { to: '/app/documents', label: 'My Documents', icon: FolderOpen },
  { to: '/app/history', label: 'Analysis History', icon: History },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
];

export function BrandMark({ size = 'md', compact = false, credit = false }) {
  const dims = size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn('grid place-items-center rounded-[11px] bg-ink-900 text-white shadow-sm', dims)}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M7 4v16M7 13l7-7M7 13l7 7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18" cy="6.5" r="1.8" fill="#9179FF" />
        </svg>
      </span>
      {!compact ? (
        <span className="flex flex-col">
          <span className="text-[19px] font-bold leading-none tracking-tight text-ink-900">
            kir<span className="text-accent-600">AI</span>
          </span>
          {credit ? (
            <span className="mt-1.5 text-[10px] font-medium leading-none tracking-[0.01em] text-ink-400">
              by Mohammad Lutza Zulkarnaen
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-150',
          isActive
            ? 'bg-ink-900 text-white shadow-sm'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-accent-300' : 'text-ink-400 group-hover:text-ink-600')} />
          <span className="flex-1">{item.label}</span>
          {isActive ? <ChevronRight className="h-3.5 w-3.5 text-white/40" /> : null}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <NavLink to="/app/dashboard" onClick={onNavigate} aria-label="kirAI dashboard">
          <BrandMark credit />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">Ruang kerja</p>
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="rounded-xl border border-ink-200/80 bg-ink-50/80 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-700">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2F9E64]" />
            Privasi terjaga
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
            Dokumen hanya dapat diakses akun Anda dan diproses di server kirAI.
          </p>
        </div>
      </div>

      <div className="border-t border-ink-200/80 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold', AVATAR_COLORS[user?.avatarColor] || AVATAR_COLORS.violet)}>
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink-900">{user?.name}</p>
            <p className="truncate text-[11px] text-ink-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-[#C43B31]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-ink-200/80 bg-white lg:block">
        <SidebarContent />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={close} />
          <aside className="absolute inset-y-0 left-0 w-[280px] animate-fade-up border-r border-ink-200 bg-white shadow-lift">
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={close} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-[13px] font-medium text-ink-500">
                Halo, <span className="font-semibold text-ink-900">{user?.name?.split(' ')[0] || 'pengguna'}</span> — siap memeriksa tulisan hari ini?
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <Button to="/app/new" size="sm" variant="primary" icon={Plus} className="hidden sm:inline-flex">
                Analisis baru
              </Button>
              <NavLink
                to="/app/profile"
                className={({ isActive }) =>
                  cn(
                    'grid h-9 w-9 place-items-center rounded-full text-xs font-bold ring-2 ring-transparent transition',
                    AVATAR_COLORS[user?.avatarColor] || AVATAR_COLORS.violet,
                    isActive && 'ring-accent-200',
                  )
                }
                title="Profil saya"
              >
                {initials(user?.name)}
              </NavLink>
            </div>
          </div>
        </header>

        <main key={location.pathname} className="mx-auto max-w-[1180px] animate-fade-up px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
