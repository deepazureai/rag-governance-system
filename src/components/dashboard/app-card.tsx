'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/src/utils/format';
import { App } from '@/src/types';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AppCardProps {
  app: App;
}

export function AppCard({ app }: AppCardProps) {
  return (
    <Card className="p-6 bg-white hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
            <Badge className={`text-xs ${getStatusColor(app.status)}`}>
              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{app.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-gray-600 text-xs">Framework</p>
          <p className="text-gray-900 font-medium">{app.ragFramework}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Owner</p>
          <p className="text-gray-900 font-medium">{app.owner}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Data Source</p>
          <p className="text-gray-900 font-medium truncate">{app.dataSource}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Deployed</p>
          <p className="text-gray-900 font-medium">
            {new Date(app.deploymentDate).toISOString().split('T')[0]}
          </p>
        </div>
      </div>

      <Link href={`/apps/${app.id}`}>
        <Button
          variant="outline"
          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          View Details
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </Card>
  );
}
