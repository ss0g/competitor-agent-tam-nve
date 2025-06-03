'use client'

import { useRouter } from 'next/navigation'
import { CompetitorForm } from '@/components/competitors/CompetitorForm'

export default function AddCompetitor() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create competitor')
      }

      router.push('/competitors')
      router.refresh()
    } catch (error) {
      throw error
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Competitor</h1>
          <p className="mt-2 text-sm text-gray-700">
            Add a new competitor to track their website changes and generate analysis reports.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <CompetitorForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
} 