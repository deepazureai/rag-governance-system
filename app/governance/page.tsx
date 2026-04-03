'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { mockPolicies } from '@/data/mockData';
import { Plus, Shield, Lock, Eye, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const typeIcons: Record<string, React.ReactNode> = {
  compliance: <FileText className="w-5 h-5" />,
  security: <Lock className="w-5 h-5" />,
  quality: <Eye className="w-5 h-5" />,
  privacy: <Shield className="w-5 h-5" />,
};

const typeColors: Record<string, string> = {
  compliance: 'bg-blue-100 text-blue-800',
  security: 'bg-red-100 text-red-800',
  quality: 'bg-green-100 text-green-800',
  privacy: 'bg-purple-100 text-purple-800',
};

export default function GovernancePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Governance & Compliance</h1>
            <p className="text-gray-600">
              Manage policies and compliance rules for your RAG applications
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Policy
          </Button>
        </div>

        {/* Policy Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Policies', value: '7', icon: FileText },
            { label: 'Active Policies', value: '6', icon: Shield },
            { label: 'Compliance Score', value: '96%', icon: Eye },
            { label: 'Last Audit', value: '2 days ago', icon: Lock },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="p-4 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Policies Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white border-b border-gray-200 rounded-none grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({mockPolicies.length})</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {['all', 'compliance', 'security', 'quality', 'privacy'].map((tabType) => (
            <TabsContent key={tabType} value={tabType} className="space-y-4 mt-6">
              {mockPolicies
                .filter((policy) => tabType === 'all' || policy.type === tabType)
                .map((policy) => (
                  <Card key={policy.id} className="p-6 bg-white border-l-4 border-l-blue-600">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-100">
                            {typeIcons[policy.type]}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                          <Badge className={`text-xs ${typeColors[policy.type]}`}>
                            {policy.type.charAt(0).toUpperCase() + policy.type.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{policy.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {policy.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Switch checked={policy.enabled} />
                      </div>
                    </div>

                    {/* Rules */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Rules ({policy.rules.length})</p>
                      <div className="space-y-2">
                        {policy.rules.map((rule) => (
                          <div key={rule.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {rule.action}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">{rule.condition}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Audit Log
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Compliance Dashboard */}
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>

          <div className="space-y-4">
            {[
              {
                name: 'GDPR Compliance',
                status: 'compliant',
                percentage: 98,
                details: 'All data handling meets GDPR requirements',
              },
              {
                name: 'Data Retention Policy',
                status: 'compliant',
                percentage: 100,
                details: 'Retention policies enforced across all systems',
              },
              {
                name: 'Access Control',
                status: 'compliant',
                percentage: 95,
                details: 'Role-based access control properly configured',
              },
              {
                name: 'Audit Logging',
                status: 'compliant',
                percentage: 92,
                details: 'Audit logs enabled for all critical operations',
              },
            ].map((item, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.details}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'compliant'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit Trail */}
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Policy Changes</h3>

          <div className="space-y-3">
            {[
              {
                date: '2024-03-15',
                action: 'Policy Updated',
                policy: 'Data Privacy Policy',
                actor: 'John Doe',
              },
              {
                date: '2024-03-12',
                action: 'Policy Enabled',
                policy: 'Access Control Policy',
                actor: 'Admin User',
              },
              {
                date: '2024-03-10',
                action: 'Rule Added',
                policy: 'Quality Standards',
                actor: 'Jane Smith',
              },
              {
                date: '2024-03-08',
                action: 'Policy Created',
                policy: 'New Compliance Rule',
                actor: 'System',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="text-xs text-gray-500 w-20 flex-shrink-0">{item.date}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold">{item.policy}</span> by {item.actor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
