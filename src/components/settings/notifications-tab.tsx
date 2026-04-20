'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Webhook, Plus, Trash2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { NotificationChannel, NotificationRule } from '@/src/types/index';

interface ChannelFormData {
  name: string;
  type: 'email' | 'webhook';
  emailRecipients?: string;
  webhookUrl?: string;
}

export function NotificationsTab() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    type: 'email',
  });
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
    fetchRules();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/notifications/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.data || []);
      }
    } catch (error) {
      console.error('[v0] Error fetching channels:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/notifications/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.data || []);
      }
    } catch (error) {
      console.error('[v0] Error fetching rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const body: any = {
        name: formData.name,
        type: formData.type,
      };

      if (formData.type === 'email' && formData.emailRecipients) {
        body.emailConfig = {
          provider: 'smtp',
          recipientEmails: formData.emailRecipients.split(',').map((e) => e.trim()),
          fromEmail: 'alerts@ragplatform.com',
        };
      } else if (formData.type === 'webhook' && formData.webhookUrl) {
        body.webhookConfig = {
          url: formData.webhookUrl,
          timeout: 30000,
        };
      }

      const res = await fetch('/api/notifications/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setFormData({ name: '', type: 'email' });
        setShowAddChannel(false);
        await fetchChannels();
      }
    } catch (error) {
      console.error('[v0] Error adding channel:', error);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const res = await fetch(`/api/notifications/channels/${channelId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchChannels();
      }
    } catch (error) {
      console.error('[v0] Error deleting channel:', error);
    }
  };

  const handleTestChannel = async (channelId: string) => {
    setTestingChannelId(channelId);

    try {
      const res = await fetch(`/api/notifications/channels/${channelId}/test`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      }
    } catch (error) {
      console.error('[v0] Error testing channel:', error);
      alert('Error testing channel');
    } finally {
      setTestingChannelId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Notification Channels */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
            <p className="text-sm text-gray-600 mt-1">Configure email and webhook endpoints for alerts</p>
          </div>
          {!showAddChannel && (
            <Button
              onClick={() => setShowAddChannel(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </Button>
          )}
        </div>

        {/* Add Channel Form */}
        {showAddChannel && (
          <Card className="p-6 bg-blue-50 border border-blue-200 mb-4">
            <form onSubmit={handleAddChannel} className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Channel Name</Label>
                <Input
                  id="channel-name"
                  placeholder="e.g., Production Alerts"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="channel-type">Channel Type</Label>
                <select
                  id="channel-type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'email' | 'webhook' })
                  }
                >
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>

              {formData.type === 'email' && (
                <div>
                  <Label htmlFor="email-recipients">Email Recipients (comma-separated)</Label>
                  <Input
                    id="email-recipients"
                    type="text"
                    placeholder="alert1@example.com, alert2@example.com"
                    value={formData.emailRecipients || ''}
                    onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
                    required
                  />
                </div>
              )}

              {formData.type === 'webhook' && (
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-domain.com/webhooks/alerts"
                    value={formData.webhookUrl || ''}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create Channel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddChannel(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Channels List */}
        <div className="space-y-3">
          {channels.length === 0 ? (
            <Card className="p-8 bg-gray-50 text-center">
              <p className="text-gray-600">No notification channels configured yet.</p>
            </Card>
          ) : (
            channels.map((channel) => (
              <Card key={channel.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {channel.type === 'email' ? (
                    <Mail className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Webhook className="w-5 h-5 text-green-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{channel.name}</p>
                    <p className="text-sm text-gray-600">
                      {channel.type === 'email'
                        ? channel.emailConfig?.recipientEmails.join(', ')
                        : channel.webhookConfig?.url}
                    </p>
                  </div>
                  <Badge
                    variant={channel.enabled ? 'default' : 'secondary'}
                    className={channel.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                  >
                    {channel.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestChannel(channel.id)}
                    disabled={testingChannelId === channel.id}
                    className="gap-1"
                  >
                    {testingChannelId === channel.id ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Test
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteChannel(channel.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Notification Rules */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Rules</h3>
        <Card className="p-6 bg-blue-50 border border-blue-200">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Define When to Send Alerts</p>
              <p className="text-sm text-blue-800 mt-1">
                Configure which applications and alert severities should trigger notifications. Rules determine which channels receive each alert.
              </p>
              <Button
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Rule
              </Button>
            </div>
          </div>
        </Card>

        {rules.length > 0 && (
          <div className="space-y-3 mt-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{rule.name}</p>
                    <p className="text-sm text-gray-600">
                      App: {rule.appId} • Trigger: {rule.triggerOn} • Channels: {rule.channelIds.length}
                    </p>
                  </div>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Digest Mode</Label>
              <p className="text-sm text-gray-600">Combine multiple alerts into daily digest instead of real-time</p>
            </div>
            <Switch />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <Label>Quiet Hours</Label>
              <p className="text-sm text-gray-600">Suppress notifications during specified hours</p>
            </div>
            <Switch />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <Label>Webhook Retries</Label>
              <p className="text-sm text-gray-600">Automatically retry failed webhook deliveries (max 4 attempts)</p>
            </div>
            <Switch defaultChecked />
          </div>
        </Card>
      </div>
    </div>
  );
}
