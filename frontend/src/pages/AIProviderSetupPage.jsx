import { Link, useNavigate } from "react-router-dom";
import AIProviderForm from "../components/AIProviderForm";

export default function AIProviderSetupPage({ onboarding = false }) {
  const navigate = useNavigate();
  return (
    <main className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="text-sm font-medium text-blue-200">{onboarding ? "Required setup" : "AI provider settings"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{onboarding ? "Choose your AI provider." : "Manage your AI provider."}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{onboarding ? "Before using SwarmOps, choose your provider, load an available model, and verify your own API key. SwarmOps never uses a shared platform key or another account's credential." : "Change your selected provider or model by entering a new key and verifying it. The currently saved credential cannot be viewed or retrieved."}</p>
      </header>
      <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">OpenRouter is supported alongside OpenAI, Anthropic, and Google Gemini. Provider accounts, billing, usage limits, and data-handling terms are managed directly with your provider.</div>
      <AIProviderForm onSaved={() => { if (onboarding) navigate("/dashboard", { replace: true }); }} />
      {!onboarding && <Link to="/dashboard" className="inline-flex min-h-10 items-center text-sm text-blue-200 hover:text-white">Back to workspace</Link>}
    </main>
  );
}
