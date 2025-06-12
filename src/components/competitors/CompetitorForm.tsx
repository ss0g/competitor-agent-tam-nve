'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const competitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Please enter a valid URL'),
  description: z.string().optional(),
})

type CompetitorFormData = z.infer<typeof competitorSchema>

interface CompetitorFormProps {
  initialData?: CompetitorFormData
  onSubmit: (data: CompetitorFormData) => Promise<void>
  isLoading?: boolean
}

export function CompetitorForm({ initialData, onSubmit, isLoading }: CompetitorFormProps) {
  const [error, setError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompetitorFormData>({
    resolver: zodResolver(competitorSchema),
    defaultValues: initialData,
  })

  const onSubmitHandler = async (data: CompetitorFormData) => {
    try {
      setError(null)
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Company Name
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Competitor Inc."
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700">
          Website URL
        </label>
        <input
          type="url"
          id="website"
          {...register('website')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="https://www.example.com"
        />
        {errors.website && (
          <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Add notes about this competitor..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Competitor'}
        </button>
      </div>
    </form>
  )
} 