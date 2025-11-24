import React, { useState } from 'react';
import { Shield, Terminal, XCircle, Zap, Download, Loader } from 'lucide-react';

const Dashboard = ({ systemInfo, checks, onRunScan }) => {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    if (!systemInfo) {
      alert('System information not available. Please restart the application.');
      return;
    }

    // Check privileges
    const needsPrivileges = systemInfo.platform !== 'win32' || systemInfo.platform !== 'darwin';
    if (needsPrivileges && window.electronAPI) {
      const hasPrivileges = await window.electronAPI.checkPrivileges?.();
      if (hasPrivileges === false) {
        alert('⚠️ Administrator/Root privileges required!\n\nPlease restart the application with:\n- Linux/Mac: sudo npm start\n- Windows: Run as Administrator');
        return;
      }
    }

    setScanning(true);
    try {
      console.log('Starting compliance scan...');
      await onRunScan();
      console.log('Scan completed successfully');
    } catch (error) {
      console.error('Scan error:', error);
      alert(`Scan failed: ${error.message}\n\nCheck console for details.`);
    } finally {
      setScanning(false);
    }
  };
  const complianceScore = checks.length > 0 
    ? Math.round((checks.filter(c => c.status === 'pass').length / checks.length) * 100)
    : 0;

  const exportReport = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.generateReport({ 
          systemInfo, 
          checks,
          timestamp: new Date().toISOString()
        });
        
        if (result.success) {
          alert(`Report saved to: ${result.path}`);
        } else if (result.cancelled) {
          // User cancelled
        } else {
          alert(`Failed to save report: ${result.error}`);
        }
      } catch (error) {
        alert(`Export error: ${error.message}`);
      }
    } else {
      // Web fallback - download as JSON
      const report = {
        systemInfo,
        checks,
        timestamp: new Date().toISOString(),
        summary: {
          total: checks.length,
          passed: checks.filter(c => c.status === 'pass').length,
          failed: checks.filter(c => c.status === 'fail').length,
          remediated: checks.filter(c => c.remediated).length
        }
      };
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autocis-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Compliance Score</p>
              <p className="text-3xl font-bold text-cyan-400">{complianceScore}%</p>
            </div>
            <Shield className="w-10 h-10 text-cyan-400 opacity-50" />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Checks</p>
              <p className="text-3xl font-bold">{checks.length}</p>
            </div>
            <Terminal className="w-10 h-10 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Failed Checks</p>
              <p className="text-3xl font-bold text-red-400">
                {checks.filter(c => c.status === 'fail').length}
              </p>
            </div>
            <XCircle className="w-10 h-10 text-red-400 opacity-50" />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Remediated</p>
              <p className="text-3xl font-bold text-green-400">
                {checks.filter(c => c.remediated).length}
              </p>
            </div>
            <Zap className="w-10 h-10 text-green-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* System Info Card */}
      {systemInfo && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">System Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Operating System</p>
              <p className="font-medium">{systemInfo.os} {systemInfo.version}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Hostname</p>
              <p className="font-medium">{systemInfo.hostname}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">User</p>
              <p className="font-medium">{systemInfo.user}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Architecture</p>
              <p className="font-medium">{systemInfo.arch || 'N/A'}</p>
            </div>
          </div>
          {systemInfo.timestamp && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm">Last Updated</p>
              <p className="font-medium text-sm">{systemInfo.timestamp}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleScan}
          disabled={scanning || !systemInfo}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {scanning ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Scanning System...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Run Compliance Check
            </>
          )}
        </button>

        {checks.length > 0 && (
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
        )}
      </div>

      {/* Info Message */}
      {!systemInfo?.error && checks.length === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <span className="font-semibold">👋 Welcome to AutoCIS Guard!</span> Click "Run Compliance Check" to scan your system against CIS benchmarks.
          </p>
        </div>
      )}

      {systemInfo?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">
            <span className="font-semibold">⚠️ System Detection Error:</span> Could not detect system information. Some features may not work properly.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
