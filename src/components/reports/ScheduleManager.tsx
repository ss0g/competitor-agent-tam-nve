'use client'

import { useState, useEffect } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface Schedule {
  id: string;
  name: string;
  cronExpression: string;
  nextRun: string;
  isActive: boolean;
  projectId: string;
  analysisTimeframe: number;
  recipients: string[];
  notifyOnChanges: boolean;
}

interface ScheduleForm {
  name: string;
  scheduleType: 'custom' | 'preset';
  cronExpression: string;
  analysisTimeframe: number;
  recipients: string;
  notifyOnChanges: boolean;
}

const PRESET_SCHEDULES = [
  { label: 'Daily at 9 AM', value: '0 9 * * *', description: 'Every day at 9:00 AM' },
  { label: 'Weekly on Monday', value: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  { label: 'Monthly on 1st', value: '0 9 1 * *', description: '1st of every month at 9:00 AM' },
  { label: 'Bi-weekly', value: '0 9 * * 1/2', description: 'Every other Monday at 9:00 AM' },
];

export function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ScheduleForm>({
    name: '',
    scheduleType: 'preset',
    cronExpression: '0 9 * * 1',
    analysisTimeframe: 7,
    recipients: '',
    notifyOnChanges: true,
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reports/schedules');
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recipients: formData.recipients.split(',').map(email => email.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }

      await fetchSchedules();
      setShowForm(false);
      setFormData({
        name: '',
        scheduleType: 'preset',
        cronExpression: '0 9 * * 1',
        analysisTimeframe: 7,
        recipients: '',
        notifyOnChanges: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Report Schedules</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          {showForm ? 'Cancel' : 'New Schedule'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">New Schedule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
              <select
                value={formData.scheduleType}
                onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as 'custom' | 'preset' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="preset">Preset Schedule</option>
                <option value="custom">Custom Cron Expression</option>
              </select>

              <button
                type="button"
                className="ml-2 px-3 py-2 text-sm hover:underline"
                style={{ color: '#067A46' }}
                onClick={() => setShowForm(false)}
              >
                Learn about cron expressions
              </button>
            </div>

            {formData.scheduleType === 'preset' && (
              <div className="mt-2 p-4 rounded-md" style={{ backgroundColor: '#B5E7BA' }}>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Common Schedule Patterns</h4>
                <div className="space-y-2">
                  {PRESET_SCHEDULES.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, cronExpression: preset.value })}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <strong>{preset.label}</strong>
                      <div className="text-xs text-gray-500">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Current: {formData.cronExpression}
                </div>
              </div>
            )}

            {formData.scheduleType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cron Expression</label>
                <input
                  type="text"
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="0 9 * * 1"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Analysis Timeframe (days)</label>
              <input
                type="number"
                value={formData.analysisTimeframe}
                onChange={(e) => setFormData({ ...formData, analysisTimeframe: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                min="1"
                max="30"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Recipients (comma-separated)</label>
              <input
                type="text"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="email1@example.com, email2@example.com"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                id="notifyOnChanges"
                type="checkbox"
                checked={formData.notifyOnChanges}
                onChange={(e) => setFormData({ ...formData, notifyOnChanges: e.target.checked })}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="notifyOnChanges" className="ml-2 block text-sm text-gray-700">
                Send notifications for significant changes
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400"
              >
                Create Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {schedules.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No schedules configured</p>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{schedule.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Next run: {new Date(schedule.nextRun).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Project: {schedule.projectId}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {schedule.recipients.length} recipient(s)
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="p-2 text-red-600 hover:text-red-800"
                  title="Delete schedule"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 