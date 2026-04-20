'use client';

import { useAppDispatch, useAppSelector } from '@/src/hooks/useRedux';
import { selectApps } from '@/src/store/slices/appSelectionSlice';
import { Checkbox } from '@/components/ui/checkbox';

export interface App {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface ApplicationsTableProps {
  applications: App[];
  onRefresh: (appIds: string[]) => void;
  isRefreshing: boolean;
}

export function ApplicationsTable({ applications, onRefresh, isRefreshing }: ApplicationsTableProps) {
  const dispatch = useAppDispatch();
  const selectedAppIds = useAppSelector((state) => state.appSelection.selectedAppIds);

  const handleToggleApp = (appId: string) => {
    const newSelection = selectedAppIds.includes(appId)
      ? selectedAppIds.filter((id) => id !== appId)
      : [...selectedAppIds, appId];
    dispatch(selectApps(newSelection));
  };

  const handleSelectAll = () => {
    if (selectedAppIds.length === applications.length) {
      dispatch(selectApps([]));
    } else {
      dispatch(selectApps(applications.map((app) => app.id)));
    }
  };

  const allSelected = selectedAppIds.length === applications.length && applications.length > 0;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Application</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Owner</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app, index) => (
              <tr
                key={app.id}
                className={`border-b hover:bg-gray-50 transition-colors ${
                  selectedAppIds.includes(app.id) ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedAppIds.includes(app.id)}
                    onCheckedChange={() => handleToggleApp(app.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 truncate">{app.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate">{app.description}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{app.owner}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      app.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {app.status === 'active' ? '✓ Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(app.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
