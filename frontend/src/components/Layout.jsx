import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100">
      <Sidebar />
      <main className="min-w-0 px-4 py-6 sm:px-6 md:pl-60 md:py-8" id="main-content">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
