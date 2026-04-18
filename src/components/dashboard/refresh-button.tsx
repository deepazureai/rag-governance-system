import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { batchClient } from '@/src/api/batchClient';
import { logger } from '@/src/utils/logger';

interface DashboardRefreshButtonProps {
  applicationId: string;
  onRefreshStart?: () => void;
  onRefreshComplete?: (success: boolean) => void;
  disabled?: boolean;
}

export function DashboardRefreshButton({
  applicationId,
  onRefreshStart,
  onRefreshComplete,
  disabled = false,
}: DashboardRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      onRefreshStart?.();

      logger.info(`[DashboardRefresh] Refreshing data for app ${applicationId}`);

      // Trigger batch processing to fetch latest data
      const result = await batchClient.executeBatch(
        applicationId,
        '', // connectionId will be fetched from application
        'local-folder', // sourceType will be fetched from connection
        {} // sourceConfig will be fetched from connection
      );

      logger.info(`[DashboardRefresh] Refresh completed:`, result);
      onRefreshComplete?.(result.success);

      // Show success message
      if (result.success) {
        alert('Data refreshed successfully');
      } else {
        alert('Failed to refresh data');
      }
    } catch (error: any) {
      logger.error(`[DashboardRefresh] Refresh failed:`, error);
      alert(`Refresh failed: ${error.message}`);
      onRefreshComplete?.(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing || disabled}
      variant="outline"
      size="sm"
      className="gap-2"
      title="Refresh data from source"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </Button>
  );
}
