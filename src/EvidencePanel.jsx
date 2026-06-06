function EvidencePanel() {
  return (
    <div className="bg-slate-900 rounded-xl p-5">
      <h2 className="text-xl font-bold mb-4">
        Evidence Collected
      </h2>

      <ul className="space-y-3">
        <li>✓ API timeout detected</li>
        <li>✓ Database connection issue</li>
        <li>✓ Memory spike found</li>
        <li>✓ Invalid exception handling</li>
      </ul>
    </div>
  );
}

export default EvidencePanel;