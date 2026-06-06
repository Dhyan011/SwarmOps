import { useNavigate } from "react-router-dom";

function ApproveFix() {
  const navigate = useNavigate();

  const handleApprove = () => {
    navigate("/autofix");
  };

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-green-500/30">
      <h2 className="text-xl font-bold mb-4">
        Recommended Action
      </h2>

      <p className="mb-4 text-slate-300">
        AI has identified a memory leak in <span className="text-red-400 font-mono">UserService</span>. 
        Applying the generated patch will resolve the object accumulation issue.
      </p>

      <button 
        onClick={handleApprove}
        className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-bold transition-colors"
      >
        Approve Fix →
      </button>
    </div>
  );
}

export default ApproveFix;