"use client";

import { motion } from "framer-motion";
import { BrainCircuit, LineChart, ShieldCheck, Sparkles, RefreshCcw, LayoutDashboard } from "lucide-react";

export const FeaturesBento = () => {
  return (
    <section id="features" className="container mx-auto px-4 py-24 md:py-32">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          Everything you need.<br/>
          <span className="text-muted-foreground">Nothing you don&apos;t.</span>
        </h2>
        <p className="text-xl text-muted-foreground">
          A deeply opinionated take on personal finance, designed for speed, clarity, and total control.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Feature 1: AI Analyst (Large) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2 bg-secondary/30 rounded-3xl border border-border/50 overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 border border-accent/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <BrainCircuit className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Your Personal AI Analyst</h3>
            <p className="text-muted-foreground text-lg max-w-md">
              Stop digging through spreadsheets. Ask complex questions about your spending, find hidden subscriptions, and get actionable insights instantly.
            </p>
            
            <div className="mt-8 flex-1 w-full bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-inner">
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs border border-border">You</div>
                  <div className="bg-secondary px-4 py-2 rounded-2xl rounded-tl-sm text-sm border border-border/50">
                    How much did I spend on dining out last month vs this month?
                  </div>
                </div>
                <div className="flex gap-3 self-end flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                    <Sparkles className="w-4 h-4 text-accent" />
                  </div>
                  <div className="bg-accent/10 px-4 py-3 rounded-2xl rounded-tr-sm border border-accent/20 max-w-[80%]">
                    <div className="text-sm mb-3">You spent <strong className="text-foreground">$450.20</strong> on dining out this month. That&apos;s <strong className="text-primary">12% less</strong> than last month! 🎉</div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                      <div className="h-full bg-primary w-[45%]"></div>
                      <div className="h-full bg-destructive/50 w-[55%] border-l border-background"></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>This Month ($450)</span>
                      <span>Last Month ($510)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature 2: Real-time Sync */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-secondary/30 rounded-3xl border border-border/50 overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_15px_rgba(20,184,100,0.3)]">
              <RefreshCcw className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Real-time Sync</h3>
            <p className="text-muted-foreground">
              Connect your banks, credit cards, and brokerages. Transactions categorize automatically.
            </p>
            <div className="mt-8 flex-1 flex flex-col justify-end">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full rounded-xl bg-background/50 border border-border/50 flex items-center px-4 relative overflow-hidden">
                    <div className="w-full h-full absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    <div className="w-6 h-6 rounded-full bg-secondary mr-3"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2 w-1/2 bg-secondary rounded-full"></div>
                      <div className="h-2 w-1/4 bg-secondary/50 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature 3: Self Hosted */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-secondary/30 rounded-3xl border border-border/50 overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">100% Yours</h3>
            <p className="text-muted-foreground">
              We don&apos;t harvest or sell your data. Fully open-source. Inspect the code or host it yourself via Docker.
            </p>
            <div className="mt-8 bg-background/80 border border-border rounded-xl p-4 font-mono text-sm text-muted-foreground overflow-hidden">
              <div className="text-blue-400">git clone</div>
              <div>github.com/guilders/app</div>
              <div className="text-primary mt-2">docker compose up -d</div>
              <div className="text-muted-foreground/50 mt-2"># Your wealth, secured.</div>
            </div>
          </div>
        </motion.div>

        {/* Feature 4: Forecasting (Large) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="md:col-span-2 bg-secondary/30 rounded-3xl border border-border/50 overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 h-full relative z-10 items-center">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <LineChart className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Predict Your Future</h3>
              <p className="text-muted-foreground text-lg">
                Understand your cash flow velocity. Project your net worth years into the future based on current spending and investment habits.
              </p>
            </div>
            <div className="flex-1 w-full max-w-[300px] h-[200px] relative">
               <svg className="w-full h-full text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <title>Forecasting chart</title>
                 {/* Past */}
                 <path d="M0,80 Q20,70 40,60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                 {/* Present Point */}
                 <circle cx="40" cy="60" r="3" fill="currentColor" />
                 {/* Future Projection (Dashed) */}
                 <path d="M40,60 Q60,40 100,10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent blur-xl -z-10"></div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};