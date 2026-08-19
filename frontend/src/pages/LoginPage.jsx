import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [keys, setKeys] = useState({ gemini: "", groq: "", ollama: "http://localhost:11434" });
  const [githubConnected, setGithubConnected] = useState(false);

  const handleProviderSelect = (p) => setProvider(p);
  const handleKeyChange = (p, val) => setKeys({ ...keys, [p]: val });
  
  const canContinue = provider !== null && (
    (provider === "gemini" && keys.gemini.length > 10) ||
    (provider === "groq" && keys.groq.length > 10) ||
    provider === "openrouter" ||
    provider === "ollama"
  );

  const handleContinue = () => {
    if (!canContinue) return;
    // Mock save logic
    if (provider === "gemini") localStorage.setItem("gemini_key", keys.gemini);
    if (provider === "groq") localStorage.setItem("groq_key", keys.groq);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 w-full relative overflow-hidden">
      {/* 3D background sphere simulated with a blurred orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none -z-10 animate-spin-slow" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 mx-auto mb-6 flex items-center justify-center shadow-glow-indigo">
            <span className="text-white text-3xl font-black tracking-tighter">S</span>
          </div>
          <h1 className="text-4xl font-black text-text-main tracking-tight mb-2">Configure SwarmOps</h1>
          <p className="text-slate-400">Step 1 of 2 — Choose Your AI Engine</p>
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          
          {/* Gemini */}
          <div 
            onClick={() => handleProviderSelect("gemini")}
            className={`glass-card p-6 cursor-pointer transition-all duration-300 card-3d
              ${provider === "gemini" ? "border-indigo-500 shadow-glow-indigo" : "border-white/10 hover:border-indigo-500/50"}
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <span className="text-indigo-400 text-xl">🔷</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Google Gemini</h3>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">FREE TIER</span>
                </div>
              </div>
            </div>
            <ul className="text-sm text-slate-400 mb-6 space-y-1">
              <li>• ~166 runs / day free</li>
              <li>• 1M token context window</li>
              <li>• Best for large repositories</li>
            </ul>
            <AnimatePresence>
              {provider === "gemini" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-white/10">
                  <input 
                    type="password" 
                    placeholder="Enter Gemini API Key..." 
                    value={keys.gemini}
                    onChange={(e) => handleKeyChange("gemini", e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block">Get Free Key ↗</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Groq */}
          <div 
            onClick={() => handleProviderSelect("groq")}
            className={`glass-card p-6 cursor-pointer transition-all duration-300 card-3d
              ${provider === "groq" ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "border-white/10 hover:border-amber-500/50"}
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-400 text-xl">🟠</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Groq</h3>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">FREE TIER</span>
                </div>
              </div>
            </div>
            <ul className="text-sm text-slate-400 mb-6 space-y-1">
              <li>• ~55 runs / day free</li>
              <li>• Ultra-fast Llama 3.3 70B</li>
              <li>• Ideal for rapid triage</li>
            </ul>
            <AnimatePresence>
              {provider === "groq" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-white/10">
                  <input 
                    type="password" 
                    placeholder="Enter Groq API Key..." 
                    value={keys.groq}
                    onChange={(e) => handleKeyChange("groq", e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs text-amber-400 hover:text-amber-300 mt-2 inline-block">Get Free Key ↗</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* OpenRouter */}
          <div 
            onClick={() => handleProviderSelect("openrouter")}
            className={`glass-card p-6 cursor-pointer transition-all duration-300 card-3d
              ${provider === "openrouter" ? "border-violet-500 shadow-glow-violet" : "border-white/10 hover:border-violet-500/50"}
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <span className="text-violet-400 text-xl">⚫</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">OpenRouter</h3>
                  <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">PREMIUM</span>
                </div>
              </div>
            </div>
            <ul className="text-sm text-slate-400 mb-6 space-y-1">
              <li>• All top-tier models available</li>
              <li>• Best for complex multi-agent runs</li>
              <li>• Paid per token</li>
            </ul>
            <AnimatePresence>
              {provider === "openrouter" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-white/10">
                  <button className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-lg transition-colors">
                    Sign In with OAuth
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ollama */}
          <div 
            onClick={() => handleProviderSelect("ollama")}
            className={`glass-card p-6 cursor-pointer transition-all duration-300 card-3d
              ${provider === "ollama" ? "border-cyan-500 shadow-glow-cyan" : "border-white/10 hover:border-cyan-500/50"}
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 text-xl">🖥️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Local Ollama</h3>
                  <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">PRIVATE</span>
                </div>
              </div>
            </div>
            <ul className="text-sm text-slate-400 mb-6 space-y-1">
              <li>• 100% private, runs on your GPU</li>
              <li>• Unlimited tokens</li>
              <li>• Requires local setup</li>
            </ul>
            <AnimatePresence>
              {provider === "ollama" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-white/10">
                  <input 
                    type="text" 
                    placeholder="http://localhost:11434" 
                    value={keys.ollama}
                    onChange={(e) => handleKeyChange("ollama", e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Step 2 */}
        <div className="text-center mb-6">
          <p className="text-slate-400 mb-4">Step 2 of 2 — Connect GitHub (Required for Auto-PR)</p>
          <div className="glass-card p-4 flex items-center justify-between border-white/10 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐙</span>
              <span className="text-white font-medium">GitHub Account</span>
            </div>
            {githubConnected ? (
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full text-sm">✅ Connected</span>
            ) : (
              <button 
                onClick={() => setGithubConnected(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
              >
                Connect Account
              </button>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-center">
          <button 
            onClick={handleContinue}
            disabled={!canContinue || !githubConnected}
            className={`
              btn-primary px-12 py-3.5 rounded-xl text-lg w-full max-w-sm
              ${(!canContinue || !githubConnected) ? "opacity-50 cursor-not-allowed grayscale" : ""}
            `}
          >
            Continue to Dashboard →
          </button>
        </div>

      </motion.div>
    </div>
  );
}
