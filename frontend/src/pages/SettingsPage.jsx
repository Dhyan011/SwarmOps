import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiOutlineKey, HiOutlineCloud, HiOutlineCheckCircle } from "react-icons/hi2";

export default function SettingsPage() {
  const [keys, setKeys] = useState({
    gemini: "",
    groq: "",
    openrouter: "",
  });
  
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeys({
      gemini: localStorage.getItem("gemini_key") || "",
      groq: localStorage.getItem("groq_key") || "",
      openrouter: localStorage.getItem("openrouter_api_key") || "",
    });
  }, []);

  const handleChange = (e) => {
    setKeys({ ...keys, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (keys.gemini) localStorage.setItem("gemini_key", keys.gemini);
    else localStorage.removeItem("gemini_key");

    if (keys.groq) localStorage.setItem("groq_key", keys.groq);
    else localStorage.removeItem("groq_key");

    if (keys.openrouter) localStorage.setItem("openrouter_api_key", keys.openrouter);
    else localStorage.removeItem("openrouter_api_key");

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
      className="max-w-4xl mx-auto space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-black tracking-tight mb-2 text-white">
          System Configuration
        </h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Manage AI Providers and Integrations
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card p-8 card-3d">
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
          <HiOutlineKey className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">Model Provider Keys</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Gemini */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Google Gemini API Key
            </label>
            <input
              type="password"
              name="gemini"
              value={keys.gemini}
              onChange={handleChange}
              placeholder="AIzaSy..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            <p className="text-xs text-slate-500 font-bold mt-1">Required for advanced multimodal capabilities and deep context reasoning.</p>
          </div>

          {/* Groq */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Groq API Key
            </label>
            <input
              type="password"
              name="groq"
              value={keys.groq}
              onChange={handleChange}
              placeholder="gsk_..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            <p className="text-xs text-slate-500 font-bold mt-1">Used for ultra-fast Llama-3 log parsing and metrics aggregation.</p>
          </div>

          {/* OpenRouter */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              OpenRouter API Key
            </label>
            <input
              type="password"
              name="openrouter"
              value={keys.openrouter}
              onChange={handleChange}
              placeholder="sk-or-v1-..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            <p className="text-xs text-slate-500 font-bold mt-1">Provides access to Claude 3.5 Sonnet and generic model rotation fallback.</p>
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-slate-400 font-bold">
              Keys are stored securely in your browser's local storage.
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 btn-primary px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-glow-indigo"
            >
              <HiOutlineCloud className="w-5 h-5" />
              Save Configuration
            </button>
          </div>
          
          {saved && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-bold"
            >
              <HiOutlineCheckCircle className="w-5 h-5" />
              Configuration saved successfully. Model rotation is active.
            </motion.div>
          )}

        </form>
      </motion.div>
    </motion.div>
  );
}
