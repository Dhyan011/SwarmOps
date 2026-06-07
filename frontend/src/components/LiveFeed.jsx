import { useEffect, useRef } from "react";

const statusColors = {
  started: "bg-blue-400",
  running: "bg-blue-400",
  completed: "bg-emerald-400",
  failed: "bg-red-400",
  warning: "bg-amber-400",
  info: "bg-slate-400",
};

const statusTextColors = {
  started: "text-blue-400",
  running: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
  warning: "text-amber-400",
  info: "text-black text-lg font-semibold",
};

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function LiveFeed({ events = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const sortedEvents = [...events].reverse();

  return (
    <div className="glass-card-static overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-dot" />
          <span className="text-sm font-semibold uppercase tracking-wider text-black text-lg font-semibold">
            Live Feed
          </span>
        </div>
        <span className="text-[10px] text-slate-600 tabular-nums">
          {events.length} events
        </span>
      </div>

      {/* Events List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5 max-h-[500px]"
      >
        {sortedEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-600">
            Waiting for agent events...
          </div>
        ) : (
          sortedEvents.map((event, i) => {
            const status = event.status || "info";
            const dotColor = statusColors[status] || "bg-slate-400";
            const textColor = statusTextColors[status] || "text-black text-lg font-semibold";

            return (
              <div
                key={event.id || i}
                className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0 animate-slide-in"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                {/* Dot */}
                <div className="pt-1.5 shrink-0">
                  <span
                    className={`block w-1.5 h-1.5 rounded-full ${dotColor} ${
                      status === "running" ? "animate-pulse-dot" : ""
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${textColor}`}>
                      {event.agent || "System"}
                    </span>
                    <span className="text-black text-lg font-semibold">·</span>
                    <span className="text-[10px] text-slate-600 tabular-nums">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-[13px] text-black text-lg font-semibold leading-relaxed break-words">
                    {event.message || "—"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
