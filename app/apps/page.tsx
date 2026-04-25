'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { AppCard } from '@/src/components/dashboard/app-card';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getFetchErrorMessage, getEmptyStateMessage } from '@/src/utils/apiErrorHandler';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AppsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch applications from API
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        console.log('[v0] Fetching applications from:', `${apiUrl}/api/applications`);
        
        const response = await fetch(`${apiUrl}/api/applications`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[v0] Applications response:', result);

        if (result.success) {
          setApplications(result.data || []);
          setError(null);
        } else {
          throw new Error(result.message || 'Failed to fetch applications');
        }
      } catch (err) {
        const errorMsg = getFetchErrorMessage(err, 'load applications');
        console.error('[v0] Error fetching applications:', err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.owner?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600 mt-1">Manage your RAG applications and add new data sources</p>
          </div>
          <Link href="/apps/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              New Application
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Error:</span> {error}
            </p>
          </Card>
        )}

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredApps.length === 0 && applications.length === 0 && (
          <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
            <p className="text-gray-700 text-lg font-semibold">{getEmptyStateMessage('applications')}</p>
            <p className="text-gray-500 text-sm mt-2">Create your first application to start evaluating RAG systems.</p>
            <Link href="/apps/new" className="mt-4 inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="w-4 h-4" />
                Create First Application
              </Button>
            </Link>
          </Card>
        )}

        {/* No Search Results */}
        {!isLoading && filteredApps.length === 0 && applications.length > 0 && (
          <Card className="p-8 bg-gray-50 border border-gray-200 text-center">
            <p className="text-gray-500">No applications found matching your criteria.</p>
          </Card>
        )}

        {/* Applications Grid */}
        {!isLoading && filteredApps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
