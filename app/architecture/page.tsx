'use client';

import { DashboardLayout } from '@/src/components/layout/dashboard-layout';

export default function ArchitecturePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Domain Architecture</h1>
          <p className="text-gray-600">
            System architecture diagram showing domains, data flow, and component relationships
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <img
            src="/domain-architecture-corrected.jpg"
            alt="Domain Architecture Diagram"
            className="w-full h-auto"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
