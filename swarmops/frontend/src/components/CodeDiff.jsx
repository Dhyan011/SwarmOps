import { useMemo } from "react";

export default function CodeDiff({ patch = "" }) {
  const lines = useMemo(() => {
    if (!patch) return [];
    return patch.split("\n").map((line, i) => {
      let type = "neutral";
      if (line.startsWith("+") && !line.startsWith("+++")) type = "add";
      else if (line.startsWith("-") && !line.startsWith("---")) type = "remove";
      else if (line.startsWith("@@")) type = "header";
      return { text: line, type, number: i + 1 };
    });
  }, [patch]);

  if (!patch) {
    return (
      <div className="glass-card-static p-6 text-center">
        <p className="text-xs text-slate-600 font-medium">No code diff available</p>
      </div>
    );
  }

  return (
    <div className="glass-card-static overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/60" />
          <span className="w-3 h-3 rounded-full bg-amber-500/60" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-xs text-slate-600 font-medium ml-2 font-medium">Proposed Fix</span>
      </div>
      <div className="overflow-x-auto">
        <pre className="text-[13px] leading-6 font-mono p-0 m-0">
          {lines.map((line) => (
            <div
              key={line.number}
              className={`
                flex px-4
                ${line.type === "add" ? "diff-add" : ""}
                ${line.type === "remove" ? "diff-remove" : ""}
                ${line.type === "header" ? "bg-amber-500/5 text-amber-400" : ""}
                ${line.type === "neutral" ? "diff-neutral" : ""}
              `}
            >
              <span className="w-10 text-right pr-4 text-slate-600 select-none shrink-0 text-xs leading-6">
                {line.number}
              </span>
              <span
                className={`
                  flex-1 whitespace-pre
                  ${line.type === "add" ? "text-emerald-300" : ""}
                  ${line.type === "remove" ? "text-red-300" : ""}
                  ${line.type === "neutral" ? "text-slate-400" : ""}
                `}
              >
                {line.text}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
