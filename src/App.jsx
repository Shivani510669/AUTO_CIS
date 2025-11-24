import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ResultsPanel from './components/ResultsPanel';
import RemediationPanel from './components/RemediationPanel';
import SystemInfo from './components/SystemInfo';

const App = () => {
    const [systemInfo, setSystemInfo] = useState(null);
    const [checks, setChecks] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedCheck, setSelectedCheck] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        setLoading(true);
        await loadSystemInfo();
        setLoading(false);
    };

    const loadSystemInfo = async () => {
        try {
            if (window.api) {
                const info = await window.api.getSystemInfo();
                if (info && !info.error) {
                    setSystemInfo(info);
                } else {
                    throw new Error(info.error || 'Failed to load system info');
                }
            } else {
                // Fallback for web preview
                setSystemInfo({
                    os: 'Linux (Ubuntu)',
                    version: '22.04 LTS',
                    hostname: 'demo-host',
                    user: 'admin',
                    platform: 'linux',
                    arch: 'x64',
                    timestamp: new Date().toLocaleString()
                });
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
            setSystemInfo({
                os: 'Unknown',
                version: 'N/A',
                hostname: 'unknown',
                user: 'user',
                timestamp: new Date().toLocaleString(),
                error: true
            });
        }
    };

    const runScan = async () => {
        if (!systemInfo) {
            alert('System information not loaded. Please restart the application.');
            return;
        }

        try {
            if (window.api) {
                const results = await window.api.runComplianceCheck(systemInfo.os);
                if (results && !results.error) {
                    setChecks(results);
                    setActiveTab('results');
                } else {
                    throw new Error(results.error || 'Scan failed');
                }
            } else {
                // Demo mode fallback
                alert('Running in demo mode. Real checks require Electron.');
            }
        } catch (error) {
            console.error('Scan error:', error);
            alert(`Scan failed: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
                    <p className="text-white text-lg">Loading AutoCIS Guard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-cyan-400" />
                            <div>
                                <h1 className="text-2xl font-bold">AutoCIS Guard</h1>
                                <p className="text-sm text-slate-400">AI-Powered Security Compliance</p>
                            </div>
                        </div>
                        <SystemInfo systemInfo={systemInfo} />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-6 mt-6">
                <div className="flex gap-2 border-b border-slate-700">
                    {['dashboard', 'results', 'remediation'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-medium capitalize transition-colors ${activeTab === tab
                                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'dashboard' && (
                    <Dashboard
                        systemInfo={systemInfo}
                        checks={checks}
                        onRunScan={runScan}
                    />
                )}

                {activeTab === 'results' && (
                    <ResultsPanel
                        checks={checks}
                        onSelectCheck={(check) => {
                            setSelectedCheck(check);
                            setActiveTab('remediation');
                        }}
                    />
                )}

                {activeTab === 'remediation' && (
                    <RemediationPanel
                        selectedCheck={selectedCheck}
                        systemInfo={systemInfo}
                        onCheckUpdate={(updatedCheck) => {
                            setChecks(prev => prev.map(c =>
                                c.id === updatedCheck.id ? updatedCheck : c
                            ));
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default App;