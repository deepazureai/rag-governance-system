'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAppSelector } from '@/hooks/useRedux';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 pt-16',
          'md:ml-64',
          sidebarOpen && 'md:ml-64',
          !sidebarOpen && 'md:ml-20'
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
