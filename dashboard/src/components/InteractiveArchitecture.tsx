import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Globe, Server, Database, Lock, Box, Workflow, Network, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InteractiveArchitecture() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const NodeCard = ({ id, title, icon: Icon, description, highlight, isCore }: { id: string, title: string, icon: any, description: string, highlight?: boolean, isCore?: boolean }) => {
    const isActive = activeNode === id || activeNode === 'all';
    
    return (
      <motion.div
        onMouseEnter={() => setActiveNode(id)}
        onMouseLeave={() => setActiveNode(null)}
        whileHover={{ scale: 1.05 }}
        className={cn(
          "relative p-6 rounded-xl border transition-all duration-300 cursor-pointer z-10",
          isCore 
            ? "bg-[#1a6ef7]/10 border-[#1a6ef7] shadow-[0_0_30px_rgba(26,110,247,0.2)]" 
            : isActive 
              ? "bg-white/10 border-white/30 shadow-lg" 
              : "bg-card/50 border-white/10",
          highlight && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#080b14]"
        )}
      >
        {isCore && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a6ef7] text-xs font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider">
            Core Engine
          </div>
        )}
        <div className="flex flex-col items-center text-center gap-3">
          <Icon className={cn("w-8 h-8", isCore ? "text-[#1a6ef7]" : isActive ? "text-cyan-400" : "text-muted-foreground")} />
          <h3 className={cn("font-bold text-lg", isCore || isActive ? "text-white" : "text-white/80")}>{title}</h3>
          
          <AnimatePresence>
            {(isActive || isCore) && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-muted-foreground mt-2"
              >
                {description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative max-w-5xl mx-auto py-12" onMouseLeave={() => setActiveNode(null)}>
      
      {/* Background connecting lines (SVG) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-visible hidden md:block">
        <svg className="w-full h-full" style={{ minHeight: '600px' }}>
          {/* Main vertical pipeline */}
          <path d="M 50% 10% L 50% 90%" stroke={activeNode ? "rgba(26,110,247,0.5)" : "rgba(255,255,255,0.1)"} strokeWidth="2" fill="none" strokeDasharray="5,5" />
          
          {/* Branches to side nodes */}
          <path d="M 50% 50% L 20% 70%" stroke={activeNode === 'qualification' || activeNode === 'core' ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.1)"} strokeWidth="2" fill="none" />
          <path d="M 50% 50% L 40% 70%" stroke={activeNode === 'prediction' || activeNode === 'core' ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.1)"} strokeWidth="2" fill="none" />
          <path d="M 50% 50% L 60% 70%" stroke={activeNode === 'placement' || activeNode === 'core' ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.1)"} strokeWidth="2" fill="none" />
          <path d="M 50% 50% L 80% 70%" stroke={activeNode === 'verification' || activeNode === 'core' ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.1)"} strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="w-full max-w-md">
          <NodeCard 
            id="api" 
            title="ComputeFabric API" 
            icon={Server} 
            description="Enterprise-grade endpoints that abstract the complexity of the decentralized network." 
          />
        </div>
        
        <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />
        
        <div className="w-full max-w-2xl">
          <NodeCard 
            id="core" 
            title="Scheduler Engine" 
            icon={Workflow} 
            description="The intelligent core that matches workloads to optimal resources globally in real-time." 
            isCore
          />
        </div>

        <ArrowRight className="w-6 h-6 text-[#1a6ef7] rotate-90" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <NodeCard 
            id="qualification" 
            title="Qualification" 
            icon={Activity} 
            description="Continuously profiles nodes for hardware capabilities and network reliability." 
          />
          <NodeCard 
            id="prediction" 
            title="Prediction" 
            icon={Network} 
            description="AI models predict node availability to ensure workload continuity." 
          />
          <NodeCard 
            id="placement" 
            title="Placement" 
            icon={Box} 
            description="Optimizes workload routing based on latency, cost, and hardware fit." 
          />
          <NodeCard 
            id="verification" 
            title="Verification" 
            icon={Lock} 
            description="Cryptographic and probabilistic checks to ensure trustworthy execution." 
          />
        </div>

        <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />

        <div className="w-full max-w-4xl">
          <NodeCard 
            id="network" 
            title="Distributed Node Network" 
            icon={Globe} 
            description="Millions of consumer and enterprise GPUs operating as a unified fabric." 
          />
        </div>
      </div>
    </div>
  );
}
