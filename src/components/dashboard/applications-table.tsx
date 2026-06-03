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
    // Single-select: if clicking same app, deselect; otherwise select only this app
    const newSelection = selectedAppIds.includes(appId) ? [] : [appId];
    dispatch(selectApps(newSelection));
  };

  const handleSelectAll = () => {
    // Select all is disabled for single-select mode
    // Do nothing
  };

  const singleSelected = selectedAppIds.length === 1;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <div className="w-4 h-4" /> {/* Empty space where checkbox would be */}
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
