import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Play, Edit2, Clock } from 'lucide-react';
import { batchClient } from '@/src/api/batchClient';
import { FrontendLogger } from '@/src/utils/logger';
import { ScheduleJobModal } from './schedule-job-modal';

interface Application {
  id: string;
  name: string;
  status: string;
}

interface ScheduledJob {
  jobId: string;
  applicationId: string;
  isEnabled: boolean;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
  };
  lastRun?: {
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
  };
  nextScheduledRun: string;
  retention: {
    archiveRetentionDays: number;
    autoDeleteAfterDays: number;
  };
  createdAt: string;
}

export function ScheduledJobsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);

  // Fetch applications on mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/applications`);
        const data = await response.json();
        if (data.success && data.data) {
          setApplications(data.data);
          if (data.data.length > 0) {
            setSelectedAppId(data.data[0].id);
          }
        }
      } catch (error: any) {
        FrontendLogger.error('[ScheduledJobs] Error fetching applications:', error);
      } finally {
        setAppsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      fetchScheduledJobs();
    }
  }, [selectedAppId]);

  const fetchScheduledJobs = async () => {
    if (!selectedAppId) return;

    try {
      setLoading(true);
      const result = await batchClient.getApplicationScheduledJobs(selectedAppId);
      setScheduledJobs(result.jobs || []);
      console.log('[v0] Fetched scheduled jobs:', result.count, 'jobs');
    } catch (error: any) {
      // Gracefully handle missing scheduled jobs endpoint (404 is expected during development)
      console.log('[v0] Scheduled jobs endpoint not available - this is expected if no scheduled jobs have been created yet');
      setScheduledJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJob = async (jobId: string, isCurrentlyEnabled: boolean) => {
    try {
      await batchClient.toggleScheduledJob(jobId, !isCurrentlyEnabled);
      await fetchScheduledJobs();
      FrontendLogger.info(`[ScheduledJobs] Job ${jobId} toggled`);
    } catch (error: any) {
      FrontendLogger.error('[ScheduledJobs] Failed to toggle job:', error);
      alert(`Failed to toggle job: ${error.message}`);
    }
  };

  const handleTriggerJob = async (jobId: string) => {
    try {
      await batchClient.triggerScheduledJob(jobId);
      alert('Job triggered successfully');
      await fetchScheduledJobs();
    } catch (error: any) {
      FrontendLogger.error('[ScheduledJobs] Failed to trigger job:', error);
      alert(`Failed to trigger job: ${error.message}`);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled job?')) return;

    try {
      await batchClient.deleteScheduledJob(jobId);
      await fetchScheduledJobs();
      FrontendLogger.info(`[ScheduledJobs] Job ${jobId} deleted`);
    } catch (error: any) {
      FrontendLogger.error('[ScheduledJobs] Failed to delete job:', error);
      alert(`Failed to delete job: ${error.message}`);
    }
  };

  const handleSaveJob = async (jobData: any) => {
    try {
      if (editingJob) {
        await batchClient.updateScheduledJob(editingJob.jobId, jobData);
      } else {
        await batchClient.createScheduledJob(
          selectedAppId!,
          '', // connectionId
          jobData.schedule,
          {} // sourceConfig
        );
      }
      await fetchScheduledJobs();
      setShowModal(false);
      setEditingJob(null);
    } catch (error: any) {
      FrontendLogger.error('[ScheduledJobs] Failed to save job:', error);
      alert(`Failed to save job: ${error.message}`);
    }
  };

  const getScheduleDisplay = (job: ScheduledJob) => {
    const { schedule } = job;
    const time = schedule.time;

    switch (schedule.type) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Every ${days[schedule.dayOfWeek || 0]} at ${time}`;
      case 'monthly':
        return `Every month on day ${schedule.dayOfMonth} at ${time}`;
      default:
        return `${schedule.type} at ${time}`;
    }
  };

  const getLastRunStatus = (job: ScheduledJob) => {
    if (!job.lastRun) return 'Never run';

    const status = job.lastRun.status;
    const time = new Date(job.lastRun.timestamp).toLocaleString();

    return `${status === 'success' ? '✓' : '✗'} ${time}`;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Application</h3>
        
        <Select value={selectedAppId || ''} onValueChange={setSelectedAppId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an application..." />
          </SelectTrigger>
          <SelectContent>
            {applications.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-2">
          Select an application to view and configure scheduled batch jobs
        </p>
      </Card>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scheduled Batch Jobs</h2>
        <p className="text-gray-600">Set up automatic batch processing for offline hours</p>
      </div>

      {!selectedAppId ? (
        <Card className="p-8 bg-gray-50 text-center">
          <p className="text-gray-500">Select an application to view scheduled batch jobs</p>
        </Card>
      ) : (
        <>
          {/* Add New Job Button */}
          <Button
            onClick={() => {
              setEditingJob(null);
              setShowModal(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Scheduled Job
          </Button>

          {/* Scheduled Jobs List */}
          {loading ? (
            <Card className="p-8 text-center text-gray-500">
              <p>Loading scheduled jobs...</p>
            </Card>
          ) : scheduledJobs.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <p>No scheduled jobs configured yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {scheduledJobs.map((job) => (
                <Card key={job.jobId} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">{getScheduleDisplay(job)}</h3>
                        <Badge variant={job.isEnabled ? 'default' : 'secondary'}>
                          {job.isEnabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="space-y-2 mt-3">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Timezone:</span> {job.schedule.timezone}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Next Run:</span>{' '}
                          {new Date(job.nextScheduledRun).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Last Run:</span> {getLastRunStatus(job)}
                        </p>
                        {job.lastRun?.errorMessage && (
                          <p className="text-sm text-red-600">
                            <span className="font-medium">Error:</span> {job.lastRun.errorMessage}
                          </p>
                        )}

                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <p>
                            Archive retention: <span className="font-medium">{job.retention.archiveRetentionDays} days</span> •
                            Auto-delete: <span className="font-medium">{job.retention.autoDeleteAfterDays} days</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Toggle
                        pressed={job.isEnabled}
                        onPressedChange={() => handleToggleJob(job.jobId, job.isEnabled)}
                        className="w-12 h-8"
                      />

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTriggerJob(job.jobId)}
                        title="Manually trigger this job now"
                      >
                        <Play className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingJob(job);
                          setShowModal(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteJob(job.jobId)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Schedule Job Modal */}
          {showModal && (
            <ScheduleJobModal
              job={editingJob}
              applicationId={selectedAppId}
              onSave={handleSaveJob}
              onClose={() => {
                setShowModal(false);
                setEditingJob(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
