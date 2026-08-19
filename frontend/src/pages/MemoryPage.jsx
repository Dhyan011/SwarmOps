import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlineLightBulb, HiOutlineCpuChip, HiOutlineHashtag } from "react-icons/hi2";

// Mock memory data for the futuristic knowledge graph placeholder
const memoryGraphData = [
  { id: 1, type: "pattern", title: "NullPointerException in PaymentRouter", confidence: 0.94, incidents: 12, related: [2, 4] },
  { id: 2, type: "solution", title: "Add Optional chaining and fallback to generic error handler", confidence: 0.88, incidents: 8, related: [1] },
  { id: 3, type: "pattern", title: "Redis connection timeout during high load", confidence: 0.98, incidents: 43, related: [5] },
  { id: 4, type: "solution", title: "Increase max connection pool size and add retry backoff", confidence: 0.96, incidents: 31, related: [3] },
  { id: 5, type: "pattern", title: "Missing CORS headers for API Gateway", confidence: 0.85, incidents: 4, related: [6] },
  { id: 6, type: "solution", title: "Inject explicit origin list into reverse proxy", confidence: 0.91, incidents: 4, related: [5] }
];

export default function MemoryPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-black tracking-tight mb-2 text-white">
          Agent Memory Store
        </h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Persistent Knowledge Graph & Learning Patterns
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Memory Graph Visualization Placeholder */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6 card-3d flex flex-col min-h-[500px]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">
            Vector Embeddings Visualization
          </h3>
          <div className="flex-1 bg-black/40 border border-white/10 rounded-xl relative overflow-hidden flex items-center justify-center">
            {/* Decorative background grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            
            <div className="text-center z-10 p-8">
              <HiOutlineCpuChip className="w-16 h-16 text-indigo-500/50 mx-auto mb-4 animate-pulse" />
              <p className="text-lg font-bold text-white mb-2">Knowledge Graph Renderer Offline</p>
              <p className="text-sm text-slate-400 font-bold max-w-md mx-auto">
                The 3D vector embeddings visualization requires the WebGL D3 plugin. 
                Viewing tabular patterns instead.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Col: Extracted Patterns */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-2">
            Recent Learned Patterns
          </h3>
          
          <div className="space-y-4">
            {memoryGraphData.map(node => (
              <div key={node.id} className="glass-card p-5 hover:border-indigo-500/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                    ${node.type === "pattern" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}
                  `}>
                    {node.type === "pattern" ? <HiOutlineHashtag className="w-3 h-3" /> : <HiOutlineLightBulb className="w-3 h-3" />}
                    {node.type}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 font-mono">
                    ID:{node.id}
                  </div>
                </div>
                
                <h4 className="text-sm font-bold text-white mb-4">
                  {node.title}
                </h4>
                
                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                  <span className="text-slate-400 font-bold">
                    Seen {node.incidents}x
                  </span>
                  <span className="text-indigo-400 font-bold">
                    {(node.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
