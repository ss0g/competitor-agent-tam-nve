import { useState, useEffect } from 'react';
import { ScheduleOptions } from '@/lib/scheduler';

interface ScheduleManagerProps {
  reportId: string;
}

interface Schedule extends ScheduleOptions {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED';
  lastRun?: Date;
  nextRun: Date;
}

interface CronPreset {
  label: string;
  value: string;
  description: string;
}

const cronPresets: CronPreset[] = [
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs daily at 12:00 AM' },
  { label: 'Every day at 6 AM', value: '0 6 * * *', description: 'Runs daily at 6:00 AM' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs weekly on Monday at 9:00 AM' },
  { label: 'First of every month', value: '0 0 1 * *', description: 'Runs on the first day of every month at 12:00 AM' },
];

export function ScheduleManager({ reportId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCronHelper, setShowCronHelper] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduleOptions>>({
    frequency: 'CUSTOM',
    timeframe: 30,
    notifyOnChanges: false,
    recipients: [],
    customCron: '0 0 * * *', // Daily at midnight by default
  });

  useEffect(() => {
    loadSchedules();
  }, [reportId]);

  const loadSchedules = async () => {
    try {
      const response = await fetch(`/api/reports/schedules?reportId=${reportId}`);
      if (!response.ok) {
        throw new Error('Failed to load schedules');
      }
      const data = await response.json();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const createSchedule = async () => {
    try {
      const response = await fetch(`/api/reports/schedules?reportId=${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }

      const schedule = await response.json();
      setSchedules([schedule, ...schedules]);
      setIsCreating(false);
      setNewSchedule({
        frequency: 'CUSTOM',
        timeframe: 30,
        notifyOnChanges: false,
        recipients: [],
        customCron: '0 0 * * *',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    }
  };

  const updateScheduleStatus = async (scheduleId: string, status: Schedule['status']) => {
    try {
      const response = await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update schedule status');
      }

      const updatedSchedule = await response.json();
      setSchedules(schedules.map(s => (s.id === scheduleId ? updatedSchedule : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule status');
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setSchedules(schedules.filter(s => s.id !== scheduleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const handleCronPresetSelect = (preset: CronPreset) => {
    setNewSchedule({
      ...newSchedule,
      customCron: preset.value,
    });
    setShowCronHelper(false);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report Schedules</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Schedule
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      )}

      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">New Schedule</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newSchedule.name || ''}
                onChange={e => setNewSchedule({ ...newSchedule, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Weekly Marketing Report"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
              <div className="mt-1 space-y-2">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newSchedule.customCron || ''}
                    onChange={e => setNewSchedule({ ...newSchedule, customCron: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Cron expression (e.g., 0 0 * * *)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCronHelper(!showCronHelper)}
                    className="ml-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Help
                  </button>
                </div>
                
                {showCronHelper && (
                  <div className="mt-2 bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Common Schedule Patterns</h4>
                    <div className="space-y-2">
                      {cronPresets.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => handleCronPresetSelect(preset)}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          <div className="font-medium">{preset.label}</div>
                          <div className="text-xs text-gray-500">
                            {preset.description} ({preset.value})
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Format: minute hour day month weekday
                      <br />
                      Example: 0 9 * * 1 (Every Monday at 9 AM)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Analysis Timeframe (days)</label>
              <input
                type="number"
                value={newSchedule.timeframe}
                onChange={e => setNewSchedule({ ...newSchedule, timeframe: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1"
                max="90"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Recipients (comma-separated)</label>
              <input
                type="text"
                value={newSchedule.recipients?.join(', ') || ''}
                onChange={e => setNewSchedule({ ...newSchedule, recipients: e.target.value.split(',').map(s => s.trim()) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="user@example.com, another@example.com"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyOnChanges"
                checked={newSchedule.notifyOnChanges}
                onChange={e => setNewSchedule({ ...newSchedule, notifyOnChanges: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notifyOnChanges" className="ml-2 block text-sm text-gray-700">
                Only notify when changes detected
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createSchedule}
                disabled={!newSchedule.name || !newSchedule.recipients?.length || !newSchedule.customCron}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No schedules configured</p>
        ) : (
          schedules.map(schedule => (
            <div key={schedule.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{schedule.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Schedule: {schedule.customCron} • {schedule.timeframe} days • {schedule.recipients.length} recipients
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Next run: {new Date(schedule.nextRun).toLocaleString()}
                  </p>
                  {schedule.lastRun && (
                    <p className="text-gray-500 text-sm">
                      Last run: {new Date(schedule.lastRun).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={schedule.status}
                    onChange={e => updateScheduleStatus(schedule.id, e.target.value as Schedule['status'])}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 