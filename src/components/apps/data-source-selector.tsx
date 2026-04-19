import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, Cloud, Database } from 'lucide-react';

interface DataSourceSelectorProps {
  selected: string | null;
  onSelect: (source: string) => void;
}

export function DataSourceSelector({ selected, onSelect }: DataSourceSelectorProps) {
  const sources = [
    {
      id: 'local_folder',
      name: 'Local Folder',
      description: 'Upload metrics from your local file system',
      icon: Folder,
    },
    {
      id: 'azure_blob',
      name: 'Azure Blob Storage',
      description: 'Connect to Azure Blob containers',
      icon: Cloud,
    },
    {
      id: 'database',
      name: 'SQL Database',
      description: 'Query from SQL Server, PostgreSQL, or MySQL',
      icon: Database,
    },
    {
      id: 'splunk',
      name: 'Splunk',
      description: 'Fetch logs from Splunk',
      icon: Cloud,
    },
    {
      id: 'datadog',
      name: 'Datadog',
      description: 'Retrieve metrics from Datadog',
      icon: Cloud,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sources.map((source) => {
        const Icon = source.icon;
        const isSelected = selected === source.id;

        return (
          <Card
            key={source.id}
            className={`p-4 cursor-pointer transition-all border-2 ${
              isSelected
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelect(source.id)}
          >
            <div className="flex flex-col items-start gap-3">
              <Icon className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
              <div>
                <h3 className="font-semibold text-gray-900">{source.name}</h3>
                <p className="text-sm text-gray-600">{source.description}</p>
              </div>
              {isSelected && (
                <div className="text-sm text-blue-600 font-medium">Selected</div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
