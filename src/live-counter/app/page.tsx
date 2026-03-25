export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">
        Phantom Pipeline
      </p>
      <h1 className="text-5xl font-black tracking-tight mb-4">
        Your Pipeline Is Leaking Money
      </h1>
      <p className="text-slate-400 text-lg max-w-md mb-8">
        Every second your SDRs spend on manual outreach is money left on the table.
        We calculated exactly how much.
      </p>
      <a
        href="https://meetings-eu1.hubspot.com/franksondors/"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
      >
        See Your Report →
      </a>
      <p className="text-slate-600 text-xs mt-12">
        Powered by Salesforge · Agent Frank
      </p>
    </main>
  )
}
