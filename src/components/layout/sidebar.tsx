'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Zap,
  AlertTriangle,
  TrendingUp,
  Shield,
  Settings,
  Menu,
  X,
  Home,
} from 'lucide-react';

const navItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'App Catalog',
    href: '/apps',
    icon: BarChart3,
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: AlertTriangle,
  },
  {
    name: 'Explore',
    href: '/explore',
    icon: Zap,
  },
  {
    name: 'Benchmarks',
    href: '/benchmarks',
    icon: TrendingUp,
  },
  {
    name: 'Governance',
    href: '/governance',
    icon: Shield,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-20',
          'hidden md:flex flex-col'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <h1 className="text-lg font-bold">RAG Eval</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(toggleSidebar())}
            className="text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="border-t border-slate-800 px-3 py-4 space-y-2">
            <p className="text-xs text-slate-500">User: analyst@company.com</p>
            <p className="text-xs text-slate-500">Role: Analyst</p>
          </div>
        )}
      </aside>

      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(toggleSidebar())}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white md:hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <h1 className="text-lg font-bold">RAG Eval</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(toggleSidebar())}
              className="text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link key={item.href} href={item.href} onClick={() => dispatch(toggleSidebar())}>
                  <button
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 px-3 py-4 space-y-2">
            <p className="text-xs text-slate-500">User: analyst@company.com</p>
            <p className="text-xs text-slate-500">Role: Analyst</p>
          </div>
        </aside>
      )}
    </>
  );
}
