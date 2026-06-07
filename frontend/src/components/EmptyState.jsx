export default function EmptyState({ title = "No data yet", description = "There's nothing to show here right now.", icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6 animate-float">
          <Icon className="w-7 h-7 text-slate-300 font-medium" />
        </div>
      )}
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-base text-slate-300 font-medium text-center max-w-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
