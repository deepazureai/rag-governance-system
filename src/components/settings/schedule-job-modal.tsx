import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface ScheduledJob {
  jobId?: string;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
  };
  retention: {
    archiveRetentionDays: number;
    autoDeleteAfterDays: number;
  };
}

interface ScheduleJobModalProps {
  job?: ScheduledJob | null;
  applicationId: string;
  onSave: (jobData: any) => Promise<void>;
  onClose: () => void;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

const DAYS_OF_WEEK = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export function ScheduleJobModal({
  job,
  applicationId,
  onSave,
  onClose,
}: ScheduleJobModalProps) {
  const [formData, setFormData] = useState<ScheduledJob>(
    job || {
      schedule: {
        type: 'daily',
        time: '02:00',
        timezone: 'UTC',
      },
      retention: {
        archiveRetentionDays: 90,
        autoDeleteAfterDays: 365,
      },
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleScheduleChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        [field]: value,
      },
    });
  };

  const handleRetentionChange = (field: string, value: number) => {
    setFormData({
      ...formData,
      retention: {
        ...formData.retention,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        schedule: formData.schedule,
        retention: formData.retention,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{job ? 'Edit Scheduled Job' : 'Create Scheduled Job'}</DialogTitle>
          <DialogClose asChild>
            <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6">
          {/* Schedule Type */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Schedule Type</Label>
            <Select
              value={formData.schedule.type}
              onValueChange={(value: any) => handleScheduleChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">How often should this job run?</p>
          </div>

          {/* Time */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Time (HH:mm)</Label>
            <Input
              type="time"
              value={formData.schedule.time}
              onChange={(e) => handleScheduleChange('time', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">What time should the batch job run?</p>
          </div>

          {/* Day of Week (for weekly) */}
          {formData.schedule.type === 'weekly' && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</Label>
              <Select
                value={String(formData.schedule.dayOfWeek || 0)}
                onValueChange={(value) => handleScheduleChange('dayOfWeek', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {formData.schedule.type === 'monthly' && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</Label>
              <Select
                value={String(formData.schedule.dayOfMonth || 1)}
                onValueChange={(value) => handleScheduleChange('dayOfMonth', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Day {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Timezone */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Timezone</Label>
            <Select
              value={formData.schedule.timezone}
              onValueChange={(value) => handleScheduleChange('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Retention Policies */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900">Retention Policies</h3>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Archive Retention (days)
              </Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={formData.retention.archiveRetentionDays}
                onChange={(e) =>
                  handleRetentionChange('archiveRetentionDays', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500 mt-1">How long to keep archive files in storage</p>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-delete Records (days)
              </Label>
              <Input
                type="number"
                min="1"
                max="3650"
                value={formData.retention.autoDeleteAfterDays}
                onChange={(e) =>
                  handleRetentionChange('autoDeleteAfterDays', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Automatically delete records older than this many days
              </p>
            </div>
          </div>

          {/* Schedule Summary */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Summary:</span>{' '}
              {formData.schedule.type === 'daily' &&
                `Batch job will run daily at ${formData.schedule.time}`}
              {formData.schedule.type === 'weekly' &&
                `Batch job will run every ${DAYS_OF_WEEK[formData.schedule.dayOfWeek || 0].label} at ${formData.schedule.time}`}
              {formData.schedule.type === 'monthly' &&
                `Batch job will run on day ${formData.schedule.dayOfMonth} of each month at ${formData.schedule.time}`}
              , timezone: <span className="font-mono">{formData.schedule.timezone}</span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? 'Saving...' : job ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
