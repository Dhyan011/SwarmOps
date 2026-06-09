import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { exchangeOAuthCode } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we just returned from OpenRouter with a code
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (code) {
      setIsAuthenticating(true);
      
      exchangeOAuthCode(code)
        .then((data) => {
          if (data && data.key) {
            // Save the key and redirect to dashboard
            localStorage.setItem("openrouter_api_key", data.key);
            // Clean up URL and navigate
            window.history.replaceState({}, document.title, "/");
            navigate("/dashboard");
          } else {
            throw new Error("Invalid response from OpenRouter");
          }
        })
        .catch((err) => {
          console.error("OAuth Exchange Failed:", err);
          setError("Failed to generate API Key. Please try again.");
          setIsAuthenticating(false);
        });
    } else {
      // If no code, check if they are already logged in
      const existingKey = localStorage.getItem("openrouter_api_key");
      if (existingKey) {
        navigate("/dashboard");
      }
    }
  }, [location, navigate]);

  const handleLogin = () => {
    // Redirect to OpenRouter OAuth flow
    // Ensure callback URL matches the current origin
    const callbackUrl = window.location.origin + "/login";
    window.location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-md w-full p-8 text-center"
      >
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 mx-auto mb-6 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)]">
            <span className="text-white text-3xl font-black tracking-tighter">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SwarmOps</h1>
          <p className="text-slate-300">Autonomous Incident Response</p>
        </div>

        {isAuthenticating ? (
          <div className="py-8">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Authenticating securely...</p>
            <p className="text-sm text-slate-400 mt-2">Generating your API key.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-slate-200 text-sm leading-relaxed">
              To launch AI investigations, SwarmOps requires connection to an OpenRouter account.
              Your personal credits will be used for your runs.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.6)]"
            >
              Sign In with OpenRouter
            </button>
            <p className="text-xs text-slate-500 mt-4">
              If you don't have an account, you can create one instantly on the next page.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
