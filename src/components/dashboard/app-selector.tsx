'use client';

import useSWR from 'swr';
import { useAppDispatch, useAppSelector } from '@/src/hooks/useRedux';
import { selectApps, selectAllApps } from '@/src/store/slices/appSelectionSlice';
import { appsApi } from '@/src/api/services';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';

export function AppSelector() {
  const dispatch = useAppDispatch();
  const selectedAppIds = useAppSelector((state) => state.appSelection.selectedAppIds);

  // Fetch apps from API
  const { data: appsData, isLoading } = useSWR(
    '/api/apps',
    () => appsApi.getAll(),
    { revalidateOnFocus: false }
  );

  const apps = appsData?.data || [];
  const isSelectingAll = selectedAppIds.length === 0;

  const handleSelectAll = () => {
    if (isSelectingAll) {
      dispatch(selectApps(apps.map((app: any) => app.id)));
    } else {
      dispatch(selectAllApps());
    }
  };

  const handleToggleApp = (appId: string) => {
    const newSelection = isSelectingAll
      ? apps.map((app: any) => app.id).filter((id: string) => id !== appId)
      : selectedAppIds.includes(appId)
      ? selectedAppIds.filter((id) => id !== appId)
      : [...selectedAppIds, appId];

    if (newSelection.length === 0) {
      dispatch(selectAllApps());
    } else {
      dispatch(selectApps(newSelection));
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 bg-white mb-6">
        <div className="flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white mb-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="select-all"
            checked={isSelectingAll}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="font-semibold text-gray-900 cursor-pointer">
            All Applications ({apps.length})
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border-t pt-3">
          {apps.map((app: any) => (
            <div key={app.id} className="flex items-center gap-2">
              <Checkbox
                id={`app-${app.id}`}
                checked={isSelectingAll || selectedAppIds.includes(app.id)}
                onCheckedChange={() => handleToggleApp(app.id)}
              />
              <label
                htmlFor={`app-${app.id}`}
                className="text-sm text-gray-700 cursor-pointer flex-1 truncate"
              >
                {app.name}
              </label>
            </div>
          ))}
        </div>

        {!isSelectingAll && (
          <p className="text-sm text-gray-600 pt-2">
            Showing data for {selectedAppIds.length} application(s)
          </p>
        )}
      </div>
    </Card>
  );
}
