import React from "react";

export default function AnalyticsChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="text-slate-500 text-xs py-10 text-center">No trend data available</div>;
  }

  // Find max values to scale SVG
  const maxUsers = Math.max(...data.map(d => d.users), 10);
  const maxClicks = Math.max(...data.map(d => d.clicks), 10);
  const maxValue = Math.max(maxUsers, maxClicks);

  const width = 500;
  const height = 180;
  const padding = 20;

  const getCoordinates = (index, value) => {
    const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
    const y = height - padding - (value * (height - 2 * padding)) / maxValue;
    return { x, y };
  };

  // Generate path points
  const userPoints = data.map((d, i) => getCoordinates(i, d.users));
  const clickPoints = data.map((d, i) => getCoordinates(i, d.clicks));

  const createPathD = (points) => {
    if (points.length === 0) return "";
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  };

  return (
    <div className="space-y-4">
      <div className="relative glass-panel bg-slate-950/20 border-slate-900 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-slate-350 uppercase tracking-wider">Growth Trends (7 Days)</span>
          <div className="flex gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-brand-400">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 block" /> Users
            </span>
            <span className="flex items-center gap-1.5 text-emerald-450">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" /> Apply Clicks
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = padding + ratio * (height - 2 * padding);
            return (
              <line
                key={index}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#1e293b"
                strokeWidth="0.8"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* User Growth Line */}
          <path
            d={createPathD(userPoints)}
            fill="none"
            stroke="#0e90e9"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_2px_8px_rgba(14,144,233,0.3)]"
          />

          {/* Clicks Line */}
          <path
            d={createPathD(clickPoints)}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_2px_8px_rgba(52,211,153,0.3)]"
          />

          {/* Data Points */}
          {userPoints.map((p, i) => (
            <circle
              key={`u-${i}`}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#0b1120"
              stroke="#0e90e9"
              strokeWidth="2.5"
              title={`Users: ${data[i].users}`}
            />
          ))}

          {clickPoints.map((p, i) => (
            <circle
              key={`c-${i}`}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#0b1120"
              stroke="#34d399"
              strokeWidth="2.5"
              title={`Clicks: ${data[i].clicks}`}
            />
          ))}
        </svg>

        {/* X Axis Labels */}
        <div className="flex justify-between text-[9px] text-slate-550 font-bold px-4 mt-2">
          {data.map((d, i) => (
            <span key={i}>{d.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
