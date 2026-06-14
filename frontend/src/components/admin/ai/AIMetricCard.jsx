import React from 'react';
import { BarChart3, Users, Calendar, Clock } from 'lucide-react';

/**
 * AIMetricCard – shows a single metric with an icon and label.
 * Props:
 *   icon: React element (e.g., <BarChart3 />)
 *   label: string
 *   value: string | number
 */
export default function AIMetricCard({ icon, label, value }) {
  return (
    <div className="glass-panel border-slate-800 rounded-2xl p-4 flex items-center space-x-3 text-white">
      {icon}
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 uppercase font-medium">{label}</span>
        <span className="text-lg font-bold">{value}</span>
      </div>
    </div>
  );
}
