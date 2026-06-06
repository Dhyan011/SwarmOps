function AgentGraph() {
  const agents = [
    "LogAgent",
    "MetricAgent",
    "TraceAgent",
    "VisualAgent",
    "ConfigAgent",
    "KBAgent",
    "Orchestrator",
  ];

  return (
    <div className="bg-slate-900 p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-4">
        Agent Graph
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div
            key={agent}
            className="bg-slate-800 p-4 rounded-lg text-center"
          >
            {agent}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentGraph;