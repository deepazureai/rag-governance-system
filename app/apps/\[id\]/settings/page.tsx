'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useApplicationSLA } from '@/src/hooks/useApplicationSLA';
import { SLASettingsTab } from '@/src/components/dashboard/sla-settings-tab';
import { INDUSTRY_STANDARD_SLA } from '@/src/utils/sla-benchmarks';

export default function ApplicationSettingsPage() {
  const params = useParams();
  const applicationId = params.id as string;
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { slaConfig, isLoading, error, updateSLA, resetToDefaults } = useApplicationSLA(applicationId);

  const handleSave = async (updatedConfig: any) => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      await updateSLA(updatedConfig);
      setSuccessMessage('SLA configuration updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save SLA configuration');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset to industry standard benchmarks?')) {
      try {
        setErrorMessage('');
        setSuccessMessage('');
        await resetToDefaults();
        setSuccessMessage('SLA configuration reset to industry standards!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to reset SLA configuration');
      }
    }
  };

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

        {/* Status Messages */}
        {successMessage && (
          <Card className="p-4 mb-6 bg-green-50 border-green-200 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </Card>
        )}

        {errorMessage && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{errorMessage}</span>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="p-6 bg-destructive/10 border-destructive/20">
            <p className="text-destructive">Failed to load SLA configuration: {error}</p>
          </Card>
        ) : (
          <>
            {/* SLA Settings Tab */}
            <SLASettingsTab
              applicationId={applicationId}
              slaConfig={slaConfig}
              industryDefaults={INDUSTRY_STANDARD_SLA}
              onSave={handleSave}
              onReset={handleReset}
            />
          </>
        )}
      </div>
    </div>
  );
}
