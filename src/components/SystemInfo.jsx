import React from 'react';
import { Monitor } from 'lucide-react';

const SystemInfo = ({ systemInfo }) => {
  if (!systemInfo) {
    return (
      <div className="text-right">
        <p className="text-sm text-slate-400">Loading system info...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium">{systemInfo.os}</p>
        <p className="text-xs text-slate-400">{systemInfo.hostname}</p>
      </div>
      <Monitor className="w-5 h-5 text-slate-400" />
    </div>
  );
};

export default SystemInfo;