import { Search, Database, FileDigit, PlaySquare, Send } from "lucide-react"

const steps = [
  {
    title: "We Detect Pain Signals",
    desc: "Monitoring LinkedIn, Crunchbase, and G2 in real-time. When a company hires SDRs or churns a competitor — we find them.",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    borderColor: "border-blue-400/20"
  },
  {
    title: "We Profile the Company",
    desc: "Leadsforge + Crunchbase + LinkedIn give us everything: team size, ICP, decision maker, and exact pipeline lost per month.",
    icon: Database,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    borderColor: "border-indigo-400/20"
  },
  {
    title: "We Generate the Autopsy",
    desc: "Claude AI + Puppeteer create a hyper-personalized PDF report with their logo, numbers, and competitor data. Zero human touch.",
    icon: FileDigit,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    borderColor: "border-purple-400/20"
  },
  {
    title: "We Make a Custom Video",
    desc: "Sora AI generates a 90-second movie about their exact situation — their office, their SDR losses, their new reality with us.",
    icon: PlaySquare,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    borderColor: "border-pink-400/20"
  },
  {
    title: "We Reach Them First",
    desc: "Email + LinkedIn + Slack via Salesforge API. PDF attached, video embedded, and a personalized live counter ticking.",
    icon: Send,
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10",
    borderColor: "border-[#F59E0B]/50"
  }
]

export default function Timeline() {
  return (
    <section className="py-32 bg-[#0D0D0D] relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">How Phantom Pipeline Works</h2>
          <p className="text-gray-400 text-lg">A fully autonomous engine built on the Forge Stack.</p>
        </div>

        <div className="relative">
          {/* Central Line */}
          <div className="absolute left-[28px] md:left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-[#F59E0B]/0 via-[#F59E0B]/30 to-[#F59E0B]/0 md:-translate-x-1/2" />
          
          <div className="space-y-16">
            {steps.map((step, idx) => {
              const isEven = idx % 2 === 0
              return (
                <div 
                  key={idx}
                  className={`relative flex flex-col md:flex-row items-start md:items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both ${
                    isEven ? "md:flex-row-reverse" : ""
                  }`}
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  {/* Content Box */}
                  <div className={`flex-1 w-full pl-20 md:pl-0 ${isEven ? "md:text-left" : "md:text-right"}`}>
                    <div className="group relative bg-[#111827] border border-white/5 rounded-2xl p-6 md:p-8 hover:border-[#F59E0B]/30 transition-colors duration-300">
                      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-[#F59E0B]/50 transition-colors" />
                      <div className="text-[#F59E0B] font-mono text-sm mb-3 tracking-widest">STEP {idx + 1}</div>
                      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{step.title}</h3>
                      <p className="text-gray-400 leading-relaxed text-sm md:text-base">{step.desc}</p>
                    </div>
                  </div>

                  {/* Icon Node */}
                  <div className="absolute left-[16px] md:static md:w-20 md:h-20 flex items-center justify-center shrink-0 z-10 md:transform md:translate-x-0">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full ${step.bg} ${step.borderColor} border flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md`}>
                      <step.icon className={`w-6 h-6 md:w-7 md:h-7 ${step.color}`} />
                    </div>
                  </div>

                  {/* Empty space for alternation */}
                  <div className="hidden md:block flex-1" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
