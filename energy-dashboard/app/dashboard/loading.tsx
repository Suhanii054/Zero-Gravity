export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary text-accent-cyan">
      <div className="rounded-3xl border border-accent-cyan/20 bg-white/[0.03] p-8 font-display uppercase tracking-[0.25em]">
        Synchronizing forecast grid...
      </div>
    </div>
  );
}
