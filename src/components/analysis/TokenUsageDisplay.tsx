import { ModelUsage } from '@/lib/analysis';

interface TokenUsageDisplayProps {
  usage: ModelUsage;
}

export function TokenUsageDisplay({ usage }: TokenUsageDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Token Usage & Cost</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Claude Usage */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Claude</h4>
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <span>Input Tokens:</span>
              <span>{usage.claude.input.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Output Tokens:</span>
              <span>{usage.claude.output.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-blue-800">
              <span>Cost:</span>
              <span>${usage.claude.cost.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Mistral Usage */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Mistral</h4>
          <div className="bg-purple-50 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <span>Input Tokens:</span>
              <span>{usage.mistral.input.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Output Tokens:</span>
              <span>{usage.mistral.output.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-purple-800">
              <span>Cost:</span>
              <span>${usage.mistral.cost.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total Cost */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Total Cost:</span>
          <span className="text-lg font-bold text-green-700">
            ${usage.totalCost.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
} 