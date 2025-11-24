import React, { useState, useEffect } from 'react';
import { Zap, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const RemediationPanel = ({ selectedCheck, systemInfo, onCheckUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (selectedCheck && !selectedCheck.aiSuggestion) {
      fetchAIRemediation();
    } else if (selectedCheck?.aiSuggestion) {
      setAiResponse(selectedCheck.aiSuggestion);
    }
  }, [selectedCheck]);

  const fetchAIRemediation = async () => {
    setLoading(true);
    setAiResponse(null);
    setApplySuccess(false);

    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.getAIRemediation(selectedCheck, systemInfo);
        setAiResponse(response);
      } else {
        // Fallback demo response
        setTimeout(() => {
          setAiResponse({
            rootCause: 'Configuration not set according to CIS benchmark requirements',
            securityImpact: 'This misconfiguration may expose the system to security vulnerabilities',
            fixCommands: ['sudo command-to-fix', 'sudo verify-command'],
            verificationSteps: ['Run the check command again', 'Verify output matches expected value']
          });
        }, 2000);
      }
    } catch (error) {
      console.error('AI Remediation fetch error:', error);
      setAiResponse({
        rootCause: 'Unable to analyze - ' + error.message,
        securityImpact: 'Manual review required',
        fixCommands: ['Check error logs for details'],
        verificationSteps: ['Retry after resolving the issue']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = async () => {
    if (!aiResponse?.fixCommands || aiResponse.fixCommands.length === 0) {
      alert('No fix commands available');
      return;
    }

    const confirmed = window.confirm(
      `This will execute the following commands:\n\n${aiResponse.fixCommands.join('\n')}\n\nDo you want to continue?`
    );

    if (!confirmed) return;

    setApplying(true);
    setApplySuccess(false);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.applyFix(aiResponse.fixCommands, selectedCheck.id);
        
        if (result.success) {
          setApplySuccess(true);
          onCheckUpdate({ 
            ...selectedCheck, 
            remediated: true, 
            status: 'pass',
            aiSuggestion: aiResponse
          });
          alert('Remediation applied successfully! Check has been marked as passed.');
        } else {
          throw new Error(result.error || 'Failed to apply fix');
        }
      } else {
        // Demo mode
        setTimeout(() => {
          setApplySuccess(true);
          onCheckUpdate({ 
            ...selectedCheck, 
            remediated: true, 
            status: 'pass',
            aiSuggestion: aiResponse
          });
          alert('Demo: Remediation simulated successfully!');
        }, 1500);
      }
    } catch (error) {
      console.error('Fix application error:', error);
      alert(`Failed to apply fix: ${error.message}`);
    } finally {
      setApplying(false);
    }
  };

  if (!selectedCheck) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-12 border border-slate-700 text-center">
        <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 text-lg mb-2">No check selected</p>
        <p className="text-slate-500 text-sm">Go to Results tab and click "AI Fix" on any failed check</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">AI-Powered Remediation</h2>

      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{selectedCheck.title}</h3>
            <p className="text-sm text-slate-400 mt-1">CIS ID: {selectedCheck.id}</p>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium flex-shrink-0 ${
            selectedCheck.severity === 'high' ? 'bg-red-500/20 text-red-400' :
            selectedCheck.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {selectedCheck.severity} severity
          </span>
        </div>

        {/* Check Details */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 font-medium ${
                selectedCheck.status === 'fail' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {selectedCheck.status.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Expected Output:</span>
              <span className="ml-2 text-slate-300 font-mono text-xs">{selectedCheck.expected}</span>
            </div>
            <div>
              <span className="text-slate-400">Actual Output:</span>
              <span className="ml-2 text-slate-300 font-mono text-xs">{selectedCheck.actualOutput}</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="ml-3 text-slate-400">Analyzing with Claude AI...</span>
          </div>
        )}

        {/* AI Response */}
        {!loading && aiResponse && (
          <div className="space-y-4">
            {/* Root Cause */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Root Cause Analysis
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">{aiResponse.rootCause}</p>
            </div>

            {/* Security Impact */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Security Impact
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">{aiResponse.securityImpact}</p>
            </div>

            {/* Fix Commands */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Remediation Commands
              </h4>
              <div className="space-y-2">
                {aiResponse.fixCommands && aiResponse.fixCommands.map((cmd, idx) => (
                  <div key={idx} className="bg-slate-950 rounded p-3 font-mono text-sm text-cyan-300 break-all">
                    {cmd}
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Steps */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Verification Steps
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                {aiResponse.verificationSteps && aiResponse.verificationSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">{step}</li>
                ))}
              </ol>
            </div>

            {/* Apply Button */}
            {!selectedCheck.remediated && (
              <button
                onClick={handleApplyFix}
                disabled={applying || applySuccess}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {applying ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Applying Fix...
                  </>
                ) : applySuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Fix Applied Successfully
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Apply Remediation
                  </>
                )}
              </button>
            )}

            {selectedCheck.remediated && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-400 font-medium">Remediation Applied</p>
                  <p className="text-slate-400 text-sm mt-1">This check has been successfully remediated</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {!loading && !aiResponse && (
          <div className="text-center py-12 text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p>Failed to load AI remediation. Please try again.</p>
            <button
              onClick={fetchAIRemediation}
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemediationPanel;