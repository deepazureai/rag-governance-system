'use client';

import { useEvaluation } from '@/hooks/useEvaluation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function FrameworkSelector() {
  const { frameworks, selectedFramework, switchFramework, loading } = useEvaluation();

  return (
    <Card className="p-4 bg-white border border-gray-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Evaluation Framework</h3>
          <p className="text-sm text-gray-600">Select which evaluation framework to use</p>
        </div>

        <div className="w-full md:w-64">
          <Select value={selectedFramework} onValueChange={switchFramework}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map((fw) => (
                <SelectItem key={fw.type} value={fw.type}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {fw.metadata.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Framework Details */}
      {frameworks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frameworks.map((fw) => (
              <div
                key={fw.type}
                className={`p-3 rounded-lg border-2 ${
                  selectedFramework === fw.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{fw.metadata.name}</h4>
                  {selectedFramework === fw.type && (
                    <Badge className="bg-blue-600">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">{fw.metadata.description}</p>
                <p className="text-xs text-gray-500 mb-2">v{fw.metadata.version}</p>
                <div className="flex flex-wrap gap-1">
                  {fw.metadata.supportedMetrics.slice(0, 3).map((metric) => (
                    <Badge
                      key={metric}
                      variant="outline"
                      className="text-xs"
                    >
                      {metric}
                    </Badge>
                  ))}
                  {fw.metadata.supportedMetrics.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{fw.metadata.supportedMetrics.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
