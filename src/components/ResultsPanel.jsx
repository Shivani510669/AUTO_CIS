import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Zap, Shield } from 'lucide-react';

const ResultsPanel = ({ checks, onSelectCheck }) => {
  const failedChecks = checks.filter(c => c.status === 'fail');
  const passedChecks = checks.filter(c => c.status === 'pass');
  const errorChecks = checks.filter(c => c.status === 'error');

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Compliance Check Results</h2>
        {checks.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">✓ {passedChecks.length} Passed</span>
            <span className="text-red-400">✗ {failedChecks.length} Failed</span>
            <span className="text-yellow-400">⚠ {errorChecks.length} Errors</span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {checks.length === 0 ? (
        <div className="bg-slate-800/50 rounded-lg p-12 border border-slate-700 text-center">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-2">No compliance checks performed yet</p>
          <p className="text-slate-500 text-sm">Go to Dashboard and click "Run Compliance Check" to start</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`bg-slate-800/50 rounded-lg p-4 border transition-all hover:border-slate-600 ${
                check.status === 'pass' ? 'border-green-500/30' :
                check.status === 'fail' ? 'border-red-500/30' :
                'border-yellow-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {check.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                    {check.status === 'fail' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    {check.status === 'error' && <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-slate-400">{check.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          check.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                          check.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {check.severity}
                        </span>
                        {check.remediated && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                            ✓ Remediated
                          </span>
                        )}
                      </div>
                      <p className="font-medium mt-1 text-white">{check.title}</p>
                    </div>
                  </div>

                  <div className="ml-8 space-y-1 text-sm">
                    <p className="text-slate-400">
                      <span className="font-medium">Expected:</span> <span className="text-slate-300">{check.expected}</span>
                    </p>
                    <p className="text-slate-400">
                      <span className="font-medium">Actual:</span> <span className="text-slate-300">{check.actualOutput}</span>
                    </p>
                  </div>
                </div>

                {check.status === 'fail' && !check.remediated && (
                  <button
                    onClick={() => onSelectCheck(check)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                  >
                    <Zap className="w-4 h-4" />
                    AI Fix
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;