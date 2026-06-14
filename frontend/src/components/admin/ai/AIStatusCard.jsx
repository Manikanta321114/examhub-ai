import React from 'react';
import { Bot, RefreshCw } from 'lucide-react';

/**
 * AIStatusCard – displays the current AI status, mode, last/next scan times
 * and a button to trigger a manual scan.
 *
 * Props:
 *   status: string (e.g., '🟢 Active')
 *   mode: string (e.g., 'Automatic Monitoring')
 *   lastScan: string (human readable)
 *   nextScan: string (human readable)
 *   onRunScan: () => void – callback for the "Run Scan" button
 */
export default function AIStatusCard({
  status = '🟢 Active',
  mode = 'Automatic Monitoring',
  lastScan = '—',
  nextScan = '—',
  onRunScan,
}) {
  return (
    <div className="glass-panel border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
      <div className="flex items-center gap-2 text-xl font-semibold text-white">
        <Bot className="h-5 w-5 text-brand-400" />
        <span>{status}</span>
      </div>
      <div className="text-sm text-slate-400 space-y-1">
        <p><span className="font-medium">Mode:</span> {mode}</p>
        <p><span className="font-medium">Last Scan:</span> {lastScan}</p>
        <p><span className="font-medium">Next Scan:</span> {nextScan}</p>
      </div>
      <button
        onClick={onRunScan}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
      >
        <RefreshCw className="h-4 w-4" />
        Run Scan
      </button>
    </div>
  );
}
