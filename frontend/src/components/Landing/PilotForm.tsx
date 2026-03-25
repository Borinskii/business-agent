import { Bot, ArrowRight, Zap, Inbox, Send } from "lucide-react"

export default function PilotForm() {
  return (
    <section className="py-32 bg-gray-50 relative border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200 mb-8 shadow-sm"
          >
            <Bot className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-8 tracking-tight max-w-4xl mx-auto">
            Reply YES &mdash; Agent Frank Works on Your Pipeline for 48 Hours. <span className="text-[#783FDD]">Free.</span>
          </h2>
        </div>

        {/* 3 Columns Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div 
            className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 hover:border-blue-300 transition-colors"
          >
            <div className="text-[#783FDD] font-mono tracking-widest font-bold text-sm mb-4">HOUR 0</div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium leading-relaxed">Agent Frank learns your ICP and product deeply within seconds.</p>
          </div>
          
          <div 
            className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 hover:border-blue-300 transition-colors"
          >
            <div className="text-[#783FDD] font-mono tracking-widest font-bold text-sm mb-4">HOUR 24</div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium leading-relaxed">First highly-personalized messages sent to 50 of your ideal customers.</p>
          </div>
          
          <div 
            className="bg-white border border-[#783FDD]/30 rounded-2xl p-8 shadow-[0_10px_40px_-15px_rgba(120,63,221,0.2)] relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-[#783FDD]" />
            <div className="text-[#783FDD] font-mono tracking-widest font-bold text-sm mb-4">HOUR 48</div>
            <div className="h-12 w-12 rounded-full bg-[#783FDD]/10 flex items-center justify-center mb-6 border border-[#783FDD]/20">
               <Inbox className="w-5 h-5 text-[#783FDD]" />
            </div>
            <p className="text-gray-900 font-bold leading-relaxed">You receive open rates, reply rates, and live conversations ready to close.</p>
          </div>
        </div>

        {/* Form area */}
        <div 
          className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#783FDD] to-transparent opacity-100" />
          
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Start My Free 48H Pilot</h3>
            <p className="text-gray-500">No setup. No credit card. Just tell us who your ideal customer is.</p>
          </div>
          
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium ml-1">Work Email</label>
              <input 
                type="email" 
                placeholder="you@company.com" 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:border-[#783FDD] focus:bg-white focus:ring-2 focus:ring-[#783FDD]/20 transition-all text-gray-900 placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium ml-1">Who is your ideal customer? (One sentence)</label>
              <input 
                type="text" 
                placeholder="e.g. VPs of Sales at B2B SaaS companies in the US" 
                required
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:border-[#783FDD] focus:bg-white focus:ring-2 focus:ring-[#783FDD]/20 transition-all text-gray-900 placeholder-gray-400"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#783FDD] hover:bg-[#6434B9] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform active:scale-[0.98] text-lg flex items-center justify-center gap-2 mt-4 shadow-md"
            >
              Start Free Pilot
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          
          <p className="text-center text-xs text-gray-500 mt-6 max-w-md mx-auto">
            Powered by Salesforge infrastructure: Leadsforge to find leads, Warmforge for deliverability, Primebox to handle replies.
          </p>
        </div>

      </div>
    </section>
  )
}
