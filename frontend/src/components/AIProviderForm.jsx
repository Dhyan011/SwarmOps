import { useEffect, useState } from "react";
import { getAIConfig, getAIModels, getAIProviders, saveAIConfig, testAIProvider } from "../services/api";

export default function AIProviderForm({ onSaved }) {
  const [providers, setProviders] = useState([]);
  const [configured, setConfigured] = useState(null);
  const [provider, setProvider] = useState("openrouter");
  const [savedModel, setSavedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getAIProviders(), getAIConfig()]).then(([providerResult, configResult]) => {
      if (!active) return;
      setProviders(Array.isArray(providerResult.data) ? providerResult.data : []);
      const config = configResult.data;
      setConfigured(config?.configured === true);
      if (config?.provider) setProvider(config.provider);
      if (config?.model) {
        setSavedModel(config.model);
        setModel(config.model);
      }
    }).catch((cause) => {
      if (active) setError(cause.response?.data?.detail || "AI provider settings could not be loaded.");
    });
    return () => { active = false; };
  }, []);

  const request = async (operation, callback) => {
    setBusy(operation);
    setError("");
    setNotice("");
    try {
      await callback();
    } catch (cause) {
      setError(cause.response?.data?.detail || "The provider request failed. Check your selection and try again.");
    } finally {
      setBusy("");
    }
  };

  const loadModels = () => request("models", async () => {
    if (!apiKey.trim()) throw new Error("Enter your provider API key first.");
    const { data } = await getAIModels(provider, apiKey);
    const items = Array.isArray(data?.models) ? data.models : [];
    setModels(items);
    setModel(items.some((item) => item.id === savedModel) ? savedModel : (items[0]?.id || ""));
    if (!items.length) setError("No models were returned for this provider key.");
  });

  const test = () => request("test", async () => {
    if (!apiKey.trim() || !model) throw new Error("Enter your provider key, load models, and select a model first.");
    await testAIProvider(provider, apiKey, model);
    setNotice("Connection test succeeded for the selected provider and model.");
  });

  const save = () => request("save", async () => {
    if (!apiKey.trim() || !model) throw new Error("Enter your provider key, load models, and select a model first.");
    const { data } = await saveAIConfig(provider, apiKey, model);
    setApiKey("");
    setConfigured(data?.configured === true);
    setSavedModel(data?.model || model);
    setModel(data?.model || model);
    window.dispatchEvent(new Event("swarmops:byok-configured"));
    setNotice("Your encrypted provider configuration was saved.");
    onSaved?.(data);
  });

  const changeProvider = (value) => {
    setProvider(value);
    setModels([]);
    setModel("");
    setApiKey("");
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-6" aria-labelledby="ai-provider-heading">
      <h2 id="ai-provider-heading" className="text-lg font-semibold text-white">Your AI provider and API key</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Each SwarmOps account uses only its own provider credential. Your key is sent over the authenticated connection, encrypted before storage, and never returned to the browser. It is not written to localStorage or logs. Your incident evidence is sent to the provider you choose.</p>
      {configured && <p className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-100">Configured: {providers.find((entry) => entry.id === provider)?.name || provider} · {savedModel}. To replace the key or model, enter the new key below; the saved key is never shown.</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">Provider
          <select value={provider} onChange={(event) => changeProvider(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white focus:border-blue-200 focus:outline-none">
            {providers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-200">Provider API key
          <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="new-password" spellCheck="false" maxLength={4096} placeholder="Paste your key; it is not displayed again" className="mt-2 min-h-11 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-200 focus:outline-none" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <button type="button" onClick={loadModels} disabled={busy !== "" || !apiKey.trim()} className="min-h-10 rounded-md border border-white/15 px-4 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50">{busy === "models" ? "Loading models…" : "Load models"}</button>
        <label className="min-w-64 flex-1 text-sm font-medium text-slate-200">Model
          <select value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length} className="mt-2 min-h-11 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white focus:border-blue-200 focus:outline-none disabled:opacity-50">
            {!models.length && <option value="">Load models with your key</option>}
            {models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={test} disabled={busy !== "" || !apiKey.trim() || !model} className="min-h-10 rounded-md border border-blue-200/30 px-4 text-sm font-medium text-blue-100 hover:bg-blue-300/10 disabled:opacity-50">{busy === "test" ? "Testing…" : "Test connection"}</button>
        <button type="button" onClick={save} disabled={busy !== "" || !apiKey.trim() || !model} className="min-h-10 rounded-md bg-blue-300 px-4 text-sm font-semibold text-slate-950 hover:bg-blue-200 disabled:opacity-50">{busy === "save" ? "Testing and saving…" : configured ? "Replace saved configuration" : "Test and save provider"}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-100">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-100">{notice}</p>}
    </section>
  );
}
