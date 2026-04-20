'use client';

import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Lock, Palette, User, Database, Zap, Clock } from 'lucide-react';
import { useState } from 'react';
import { DataSourcesTab } from '@/src/components/settings/data-sources-tab';
import { ConnectionsTab } from '@/src/components/settings/connections-tab';
import { BatchProcessingTab } from '@/src/components/settings/batch-processing-tab';
import { ScheduledJobsTab } from '@/src/components/settings/scheduled-jobs-tab';
import { AlertThresholdsTab } from '@/src/components/settings/alert-thresholds-tab';

export default function SettingsPage() {
  const [theme, setTheme] = useState('system');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-white border-b border-gray-200 rounded-none grid w-full grid-cols-8">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Connections</span>
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Batch</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Scheduled</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="analyst@company.com"
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </Label>
                  <Input id="name" type="text" defaultValue="John Analyst" />
                </div>

                <div>
                  <Label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </Label>
                  <Input id="role" type="text" defaultValue="Data Analyst" disabled className="bg-gray-100" />
                </div>

                <div>
                  <Label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </Label>
                  <Input id="department" type="text" defaultValue="Data Science" />
                </div>

                <div className="pt-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border-l-4 border-l-yellow-600">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Status</h3>
              <p className="text-gray-600 mb-4">Your account is active and in good standing.</p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Last Login:</span> Today at 2:30 PM
                </p>
                <p>
                  <span className="font-medium">Account Created:</span> January 15, 2024
                </p>
                <p>
                  <span className="font-medium">Member Since:</span> 2+ months
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive email alerts for important events</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-600">Browser push notifications</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                {/* Alert Rules */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-semibold text-gray-900 mb-4">Alert Triggers</p>

                  {[
                    {
                      name: 'Critical Alerts',
                      description: 'Notify on critical severity alerts',
                      checked: true,
                    },
                    {
                      name: 'Performance Issues',
                      description: 'Notify when performance degrades',
                      checked: true,
                    },
                    {
                      name: 'Daily Summary',
                      description: 'Receive daily summary emails',
                      checked: false,
                    },
                    {
                      name: 'Weekly Report',
                      description: 'Weekly performance reports',
                      checked: true,
                    },
                  ].map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-t border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.name}</p>
                        <p className="text-xs text-gray-600">{alert.description}</p>
                      </div>
                      <input type="checkbox" checked={alert.checked} readOnly className="w-4 h-4" />
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Notification Settings
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance Settings</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Choose your preferred theme</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">Dashboard Layout</p>
                  {['Compact', 'Comfortable', 'Spacious'].map((layout, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2">
                      <input type="radio" name="layout" defaultChecked={idx === 1} className="w-4 h-4" />
                      <label className="text-sm text-gray-700">{layout}</label>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">Chart Style</p>
                  {['Line Charts', 'Bar Charts', 'Mixed'].map((style, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2">
                      <input type="radio" name="charts" defaultChecked={idx === 2} className="w-4 h-4" />
                      <label className="text-sm text-gray-700">{style}</label>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Appearance Settings
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6 mt-6">
            <ConnectionsTab />
          </TabsContent>

          {/* Batch Processing Tab */}
          <TabsContent value="batch" className="space-y-6 mt-6">
            <BatchProcessingTab />
          </TabsContent>

          {/* Alert Thresholds Tab */}
          <TabsContent value="alerts" className="space-y-6 mt-6">
            <AlertThresholdsTab />
          </TabsContent>

          {/* Scheduled Jobs Tab */}
          <TabsContent value="scheduled" className="space-y-6 mt-6">
            <ScheduledJobsTab />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </Label>
                  <Input id="current-password" type="password" placeholder="••••••••" />
                </div>

                <div>
                  <Label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </Label>
                  <Input id="new-password" type="password" placeholder="••••••••" />
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" />
                </div>

                <div className="pt-2">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Update Password</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
              <p className="text-gray-600 mb-4">Add an extra layer of security to your account</p>
              <Button variant="outline">Enable 2FA</Button>
            </Card>

            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
              <div className="space-y-3">
                {[
                  { device: 'MacBook Pro (Chrome)', location: 'New York, USA', lastActive: '5 min ago' },
                  { device: 'iPhone 14 (Safari)', location: 'New York, USA', lastActive: '2 hours ago' },
                ].map((session, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{session.device}</p>
                      <p className="text-xs text-gray-600">
                        {session.location} • Last active: {session.lastActive}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600">
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
