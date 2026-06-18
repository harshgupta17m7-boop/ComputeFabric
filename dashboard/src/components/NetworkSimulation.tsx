import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Server, Zap, HardDrive, Cpu, ShieldCheck } from 'lucide-react';

const mockLocations = ["Tokyo", "New York", "London", "Singapore", "Frankfurt", "Sydney", "São Paulo"];
const mockHardware = ["RTX 4090", "H100 80GB", "A100 40GB", "RX 7900 XTX", "M3 Max"];

export function NetworkSimulation() {
  const [nodes, setNodes] = useState(54302);
  const [tflops, setTflops] = useState(12450.5);
  const [tasks, setTasks] = useState(1405932);
  const [feed, setFeed] = useState<Array<{ id: number, text: string, type: 'join' | 'task' | 'verify', time: Date }>>([]);

  // Simulate network growth
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev + Math.floor(Math.random() * 3));
      setTflops(prev => +(prev + Math.random() * 5).toFixed(1));
      setTasks(prev => prev + Math.floor(Math.random() * 15));
      
      if (Math.random() > 0.6) {
        const typeRand = Math.random();
        let newFeedItem;
        const id = Date.now();
        
        if (typeRand > 0.7) {
          newFeedItem = { id, text: `New ${mockHardware[Math.floor(Math.random() * mockHardware.length)]} node joined from ${mockLocations[Math.floor(Math.random() * mockLocations.length)]}`, type: 'join' as const, time: new Date() };
        } else if (typeRand > 0.3) {
          newFeedItem = { id, text: `Workload scheduled on ${Math.floor(Math.random() * 10) + 2} nodes in ${mockLocations[Math.floor(Math.random() * mockLocations.length)]}`, type: 'task' as const, time: new Date() };
        } else {
          newFeedItem = { id, text: `Cryptographic proof verified for task #${Math.floor(Math.random() * 10000)}`, type: 'verify' as const, time: new Date() };
        }
        
        setFeed(prev => [newFeedItem, ...prev].slice(0, 5));
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#080b14]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(26,110,247,0.1)]">
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-primary w-5 h-5 animate-pulse" />
          Live Network Simulation
        </h3>
        <div className="flex items-center gap-2 text-sm text-primary font-mono">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          STATUS: ONLINE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-2">
            <Server className="w-4 h-4" /> Active Nodes
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {nodes.toLocaleString()}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Available Capacity
          </div>
          <div className="text-3xl font-bold text-cyan-400 font-mono">
            {tflops.toLocaleString()} <span className="text-lg text-muted-foreground">TFLOPS</span>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Tasks Executed
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {tasks.toLocaleString()}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Network Activity Log</h4>
        <div className="space-y-3 h-[240px] overflow-hidden relative">
          <AnimatePresence>
            {feed.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5"
              >
                <div className={`mt-0.5 p-1.5 rounded-md ${
                  item.type === 'join' ? 'bg-emerald-500/20 text-emerald-400' :
                  item.type === 'task' ? 'bg-primary/20 text-primary' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {item.type === 'join' && <HardDrive className="w-4 h-4" />}
                  {item.type === 'task' && <Activity className="w-4 h-4" />}
                  {item.type === 'verify' && <ShieldCheck className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/90">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.time.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {feed.length === 0 && (
            <div className="text-center text-muted-foreground py-8">Waiting for network events...</div>
          )}
          {/* Fade out at bottom */}
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#080b14] to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
