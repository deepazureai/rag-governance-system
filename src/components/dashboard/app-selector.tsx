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
    // Single-select mode: Select all functionality disabled
    // Do nothing
  };

  const handleToggleApp = (appId: string) => {
    // Single-select: if clicking same app, deselect; otherwise select only this app
    const newSelection = selectedAppIds.includes(appId) ? [] : [appId];
    dispatch(selectApps(newSelection));
  };

  const singleSelected = selectedAppIds.length === 1;

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
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Select Application
          </h3>
          {singleSelected && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              1 selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {apps.map((app: any) => (
            <div key={app.id} className="flex items-center gap-2">
              <Checkbox
                id={`app-${app.id}`}
                checked={selectedAppIds.includes(app.id)}
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

        {!singleSelected && (
          <p className="text-xs text-gray-500 pt-2">
            Select one application to work with
          </p>
        )}
      </div>
    </Card>
  );
}
