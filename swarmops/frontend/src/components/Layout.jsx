import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-900 flex overflow-hidden">
      {/* Fixed Starry Night Background - Unaltered */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/starry-night.png" 
          alt="Cosmic Background" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="cyber-grid opacity-30 fixed inset-0 z-0 pointer-events-none" />
      
      <Sidebar />
      
      <main className="flex-1 ml-[72px] relative z-10 overflow-y-auto h-screen">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
