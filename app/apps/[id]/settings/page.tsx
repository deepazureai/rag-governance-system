'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SLASettingsTab } from '@/src/components/dashboard/sla-settings-tab';

export default function ApplicationSettingsPage() {
  const params = useParams();
  const applicationId = params.id as string;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/apps/${applicationId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Application Settings</h1>
            <p className="text-muted-foreground mt-1">Configure SLA thresholds and benchmarks</p>
          </div>
        </div>

        {/* SLA Settings Tab */}
        <SLASettingsTab
          applicationId={applicationId}
          applicationName={applicationId}
        />
      </div>
    </div>
  );
}
