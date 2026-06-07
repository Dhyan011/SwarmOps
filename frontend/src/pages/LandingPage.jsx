import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { HiOutlineRocketLaunch, HiOutlineCpuChip, HiOutlineCodeBracket } from "react-icons/hi2";

export default function LandingPage() {
  const navigate = useNavigate();

  // Mouse tracking for parallax background
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 50, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 50, damping: 20 });

  // Move the background slightly based on mouse
  const translateX = useTransform(mouseXSpring, [-0.5, 0.5], ["-2%", "2%"]);
  const translateY = useTransform(mouseYSpring, [-0.5, 0.5], ["-2%", "2%"]);

  const handleMouseMove = (e) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col items-center pt-32 pb-20 px-6 overflow-hidden bg-slate-950"
    >
      {/* 3D Tracking Parallax Background - Unaltered image */}
      <motion.div 
        className="absolute inset-[-5%] z-0"
        style={{ x: translateX, y: translateY }}
      >
        <img 
          src="/starry-night.png" 
          alt="Starry Night Cosmic Background" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Cyber Grid over the background */}
      <div className="cyber-grid opacity-30 z-0" />
      
      {/* Hero Section (Center Aligned) */}
      <motion.div 
        className="max-w-4xl w-full flex flex-col items-center text-center z-10 mt-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.4] border border-black/[0.1] mb-8 backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse-dot" />
          <span className="text-base font-bold text-slate-900 uppercase tracking-wider">SwarmOps Core v0.2.0 is Live</span>
        </motion.div>

        <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-tight mb-6 leading-tight drop-shadow-xl text-slate-900">
          Autonomous <br />
          <span className="bg-gradient-to-r from-blue-700 to-amber-600 bg-clip-text text-transparent">Incident Response.</span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-xl md:text-2xl text-slate-900 max-w-3xl mb-12 leading-relaxed drop-shadow-md font-semibold bg-white/20 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/30">
          Unleash an 8-agent AI swarm to instantly triage, investigate, trace, and patch production bugs in your codebase before your users even notice.
        </motion.p>

        <motion.div variants={itemVariants} className="flex items-center gap-4 flex-wrap justify-center">
          <button 
            onClick={() => navigate("/dashboard")}
            className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-amber-500 text-white font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(37,99,235,0.4)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <HiOutlineRocketLaunch className="w-6 h-6 relative z-10" />
            <span className="relative z-10">Enter Command Center</span>
          </button>
          <a 
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/[0.4] border border-black/[0.1] text-slate-900 font-bold text-lg hover:bg-white/[0.6] hover:border-black/[0.2] backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            Read the Manual
          </a>
        </motion.div>
      </motion.div>

      {/* Manual / How it Works Section */}
      <motion.div 
        id="how-it-works"
        className="max-w-5xl w-full mt-40 z-10"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-16 bg-white/30 p-8 rounded-3xl backdrop-blur-md border border-white/50 inline-block mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 drop-shadow-sm">How The Swarm Works</h2>
          <p className="text-lg md:text-xl text-slate-800 font-semibold max-w-2xl mx-auto">A multi-phase, highly concurrent architecture that acts exactly like a Senior SRE team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-8 group backdrop-blur-xl bg-white/60 border-white/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
              <HiOutlineCpuChip className="w-7 h-7 text-blue-700" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">1. Parallel Investigation</h3>
            <p className="text-base text-slate-800 font-medium leading-relaxed">
              Upon incident creation, the Orchestrator spins up four specialized agents (Logs, Metrics, Trace, Security) to concurrently fetch context and analyze the target repository or environment.
            </p>
          </div>

          <div className="glass-card p-8 group backdrop-blur-xl bg-white/60 border-white/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center mb-6 group-hover:bg-amber-600/20 transition-colors">
              <HiOutlineCodeBracket className="w-7 h-7 text-amber-700" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">2. Root Cause Synthesis</h3>
            <p className="text-base text-slate-800 font-medium leading-relaxed">
              The Root Cause Agent synthesizes the concurrent findings into a singular, highly confident hypothesis, pinpointing the exact lines of code responsible for the crash.
            </p>
          </div>

          <div className="glass-card p-8 group backdrop-blur-xl bg-white/60 border-white/50 shadow-xl hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center mb-6 group-hover:bg-emerald-600/20 transition-colors">
              <HiOutlineRocketLaunch className="w-7 h-7 text-emerald-700" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">3. Automated Patching</h3>
            <p className="text-base text-slate-800 font-medium leading-relaxed">
              The Fix Generator writes a `git diff` patch. Once validated by the Validation Agent, you simply click "Approve" and SwarmOps opens a GitHub Pull Request on your behalf automatically.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
