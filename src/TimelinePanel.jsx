function TimelinePanel() {
  const events = [
    "Incident Detected",
    "Evidence Collection Started",
    "Root Cause Identified",
    "Fix Generated",
    "Validation Running"
  ];

  return (
    <div className="bg-slate-900 rounded-xl p-5">
      <h2 className="text-xl font-bold mb-4">
        Investigation Timeline
      </h2>

      {events.map((event, index) => (
        <div
          key={index}
          className="border-l-2 border-cyan-500 pl-4 mb-4"
        >
          {event}
        </div>
      ))}
    </div>
  );
}

export default TimelinePanel;