'use client';

import React, { useState, useEffect } from 'react';

interface InteractiveHelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  searchQuery?: string;
}

export const InteractiveHelpSystem: React.FC<InteractiveHelpSystemProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'getting-started',
  searchQuery = ''
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'faq'>('articles');
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Help & Support</h2>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Getting Started with Immediate Reports
                </h3>
                <p className="text-gray-600">
                  Immediate reports generate your first competitive analysis instantly upon project creation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveHelpSystem;
