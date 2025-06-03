import React from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';

export function ChatTypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex max-w-3xl">
        {/* Avatar */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white">
            <CpuChipIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Typing Animation */}
        <div className="px-4 py-3 rounded-lg shadow-sm bg-white border border-gray-200">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-xs text-gray-500 ml-2">Agent is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
} 