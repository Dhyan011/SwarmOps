import { Link } from "react-router-dom";
import {
  HiArrowRight,
  HiOutlineCheckCircle,
  HiOutlineChevronRight,
  HiOutlineCodeBracket,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
} from "react-icons/hi2";

const steps = [
  {
    number: "01",
    title: "Bring the incident context",
    body: "Start with symptoms. Add logs, a stack trace, code, or a public repository when you have them.",
  },
  {
    number: "02",
    title: "Review the evidence",
    body: "See what was supplied, what could be retrieved, what the model concluded, and what is still unknown.",
  },
  {
    number: "03",
    title: "Decide what happens next",
    body: "Inspect the proposed diff and validation state. An authorized reviewer can ask SwarmOps to open a GitHub pull request.",
  },
];

const sampleEvidence = [
  { label: "User supplied", detail: "Checkout returns HTTP 500 after retry" },
  { label: "User supplied", detail: "Traceback points to payment retry handler" },
  { label: "Retrieved", detail: "Public repository context, when a repo URL is provided" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#090d14] text-slate-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-3 rounded-md" aria-label="SwarmOps home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/10 text-blue-200" aria-hidden="true">
            <HiOutlineCodeBracket className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SwarmOps</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm">
          <a href="#how-it-works" className="hidden text-slate-300 hover:text-white sm:inline">How it works</a>
          <a href="#security" className="hidden text-slate-300 hover:text-white sm:inline">Security</a>
          <a href="https://github.com/Dhyan011/SwarmOps" target="_blank" rel="noreferrer" className="hidden text-slate-300 hover:text-white md:inline">GitHub</a>
          <Link to="/login" className="rounded-md border border-white/15 px-3.5 py-2 text-slate-100 hover:border-white/30 hover:bg-white/5">Sign in</Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28">
        <div className="max-w-2xl">
          <p className="mb-5 flex items-center gap-2 text-sm font-medium text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> AI-assisted incident investigation
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-6xl">
            From production incident to a fix you can review.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Investigate failures, connect available evidence to likely causes, and prepare a GitHub change for human review—all in one workspace, with you in control.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/new-incident" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-300 px-5 font-semibold text-slate-950 hover:bg-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200">
              Start an investigation <HiArrowRight className="h-4 w-4" />
            </Link>
            <a href="#sample-investigation" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 font-semibold text-white hover:bg-white/5">
              Explore a sample <HiOutlineChevronRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 max-w-lg text-xs leading-5 text-slate-400">
            SwarmOps does not deploy or merge changes. A pull request is a proposal, not proof that an incident is resolved.
          </p>
        </div>

        <div id="sample-investigation" className="relative scroll-mt-8 rounded-xl border border-white/10 bg-[#0f151f] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Illustrative sample · not live data</p>
              <h2 className="mt-2 text-base font-semibold text-white">Checkout retry failures</h2>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-100">Needs review</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evidence available</h3>
              <ul className="mt-3 space-y-3">
                {sampleEvidence.map((item) => (
                  <li key={item.detail} className="border-l-2 border-blue-300/50 pl-3">
                    <span className="block text-[11px] font-medium text-blue-200">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-300">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0a0f16] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <HiOutlineSparkles className="h-4 w-4 text-blue-200" /> Finding · AI-generated hypothesis
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The retry handler may reuse a payment response after a failed attempt. Confirm this against the repository and a reproducible test before treating it as the cause.
              </p>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <HiOutlineCodeBracket className="h-4 w-4 text-slate-400" /> Proposed change
                </div>
                <pre className="mt-3 overflow-x-auto rounded-md bg-black/30 p-3 text-xs leading-5 text-slate-300"><code><span className="text-rose-300">- cached_response = previous_attempt</span>{"\n"}<span className="text-emerald-300">+ cached_response = None</span></code></pre>
                <p className="mt-3 text-xs text-amber-100">Sample diff only. No tests were run and no repository was changed.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-400">
            <HiOutlineCheckCircle className="h-4 w-4 text-blue-200" />
            The sample demonstrates the review flow; its evidence and diagnosis are fictional.
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 border-y border-white/10 bg-[#0c1119]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-blue-200">A workflow, not a black box</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Keep every conclusion connected to the next decision.</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="border-t border-white/15 pt-5">
                <p className="font-mono text-xs text-blue-200">{step.number}</p>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="scroll-mt-8 mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-medium text-blue-200">Trust and permissions</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">A human stays in control.</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <article className="border-l border-blue-300/50 pl-4">
            <h3 className="flex items-center gap-2 font-semibold text-white"><HiOutlineShieldCheck className="h-4 w-4 text-blue-200" /> Separate access</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Signing in to SwarmOps establishes your identity. GitHub App installation separately grants repository access; the app checks ownership and reviewer permissions on the server.</p>
          </article>
          <article className="border-l border-amber-300/50 pl-4">
            <h3 className="font-semibold text-white">Review before writing</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">A pull request is created only for an eligible proposal and authorized reviewer. SwarmOps does not merge or deploy it.</p>
          </article>
          <article className="border-l border-white/20 pl-4 sm:col-span-2">
            <h3 className="font-semibold text-white">Evidence is not all the same</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">User-supplied logs, retrieved public repository context, AI-generated findings, and independently verified provider outcomes must remain distinguishable. AI-generated tests are not executed by the current system.</p>
          </article>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0c1119]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Start with the evidence you have.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Observability integrations are optional. Manual incident context is a supported starting point—not a substitute for live telemetry.</p>
          </div>
          <Link to="/new-incident" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-300 px-5 font-semibold text-slate-950 hover:bg-blue-200">
            Start an investigation <HiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
        <span>SwarmOps · evidence-first incident investigation</span>
        <div className="flex items-center gap-4">
          <a href="https://github.com/Dhyan011/SwarmOps" target="_blank" rel="noreferrer" className="hover:text-slate-300">Source code</a>
          <Link to="/login" className="hover:text-slate-300">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
