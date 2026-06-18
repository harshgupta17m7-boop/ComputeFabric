import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Activity, Cpu, ShieldAlert, CheckCircle2, Server, Network, Layers, Shield, Zap, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Worker {
  id: string;
  busy: boolean;
  reputation: {
    accuracy: number;
    reliability: number;
    pingMs: number;
    uptimeHours: number;
    completedTasks: number;
    totalAssigned: number;
    overallScore: number;
  };
  capabilities: {
    cpus: number;
    platform: string;
    totalMem: number;
    vram: number;
  };
}

export default function Dashboard() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [prompt, setPrompt] = useState("");
  const [datasetSize, setDatasetSize] = useState("100");
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [consensusLogs, setConsensusLogs] = useState<{time: string, msg: string, isError: boolean}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      addLog("Connected to Parallax Broker", false);
    });

    newSocket.on('network_state', (publicWorkers: Worker[]) => {
      setWorkers(publicWorkers);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const addLog = (msg: string, isError: boolean = false) => {
    setConsensusLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, isError }, ...prev].slice(0, 8));
  };

  const submitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addLog(`Deploying Map-Reduce workload...`, false);
    
    try {
        const size = parseInt(datasetSize);
        if (isNaN(size) || size < 1) throw new Error("Invalid dataset size");
        const mockDataset = Array.from({length: size}, (_, i) => i);
        
        addLog(`Sharding dataset of ${size} items...`);
        const response = await fetch('http://localhost:3000/api/tasks/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            dataset: mockDataset,
            code: "output = dataset.map(x => x * 2);"
          }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          addLog(data.error || "Consensus Failed", true);
          throw new Error(data.error || "Unknown error");
        }
        addLog(`✅ Consensus Reached! ${data.consensusGroups} groups verified.`);
    } catch (err: any) {
      toast({
        title: "Deployment Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 overflow-hidden relative">
      {/* Background glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel p-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent inline-flex items-center gap-4">
              <Network className="h-10 w-10 text-cyan-400" />
              Parallax Command Center
            </h1>
            <p className="text-zinc-400 mt-2 text-lg">Trustless Distributed Compute Swarm</p>
          </div>
          
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 text-glow">{workers.length}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Active Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 text-glow">
                {workers.filter(w => !w.busy && w.reputation.overallScore >= 0.50).length}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Trusted / Idle</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 text-glow">
                {workers.reduce((acc, w) => acc + (w.capabilities?.vram || 0), 0)} GB
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Total VRAM</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: Deploy Wizard */}
          <div className="xl:col-span-4 space-y-6">
            <div className="glass-panel p-6 box-glow relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                <Zap className="h-6 w-6 text-cyan-400" />
                Deploy Workload
              </h2>
              
              <div className="flex gap-2 mb-6 bg-black/50 p-1 rounded-lg">
                <button 
                  type="button"
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all bg-cyan-500/20 text-cyan-300`}
                >
                  Map-Reduce Data
                </button>
                <button 
                  type="button"
                  disabled
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all text-zinc-600 bg-black/20 cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  Federated AI Training <span className="text-[10px] uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">Coming Soon</span>
                </button>
              </div>

              <form onSubmit={submitJob} className="space-y-6">
                <AnimatePresence mode="wait">
                    <motion.div key="compute" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Dataset Size (Items)</label>
                        <Input
                          type="number"
                          value={datasetSize}
                          onChange={(e) => setDatasetSize(e.target.value)}
                          className="bg-black/50 border-white/10 text-white focus:border-cyan-500"
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Compute Algorithm</label>
                        <Textarea
                          disabled
                          value="output = dataset.map(x => x * 2);"
                          className="bg-black/50 border-white/10 text-zinc-500 font-mono text-sm"
                        />
                      </div>
                      <div className="p-4 bg-cyan-950/30 border border-cyan-900/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-cyan-500 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-cyan-100">Trustless Consensus Active</h4>
                            <p className="text-xs text-cyan-500/80 mt-1">This job will be sharded into Consensus Groups. 3 nodes will compute each shard simultaneously to mathematically verify results via Merkle Roots.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                </AnimatePresence>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full text-white font-bold tracking-wide shadow-lg transition-all bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/50`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Awaiting Consensus...
                    </div>
                  ) : (
                    "Deploy to Swarm"
                  )}
                </Button>
              </form>
            </div>

            {/* Live Consensus Feed */}
            <div className="glass-panel p-6 h-[250px] flex flex-col">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4" /> Real-time Feed
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-2 custom-scrollbar">
                <AnimatePresence>
                  {consensusLogs.map((log, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 ${log.isError ? 'text-red-400' : 'text-zinc-300'}`}
                    >
                      <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                      <span>{log.msg}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {consensusLogs.length === 0 && (
                  <div className="text-zinc-600 text-center mt-10">Awaiting network events...</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Swarm Visualizer */}
          <div className="xl:col-span-8">
            <div className="glass-panel p-6 h-full min-h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Layers className="h-6 w-6 text-indigo-400" />
                  Swarm Topology
                </h2>
                <div className="flex items-center gap-2 text-sm text-zinc-400 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  Live Sync
                </div>
              </div>

              {workers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-white/5 border-dashed rounded-xl bg-black/20">
                  <Server className="h-16 w-16 text-zinc-800 mb-4" />
                  <p className="text-zinc-400 font-medium">No nodes detected in the fabric.</p>
                  <p className="text-sm text-zinc-600 mt-2">Start a contributor daemon to populate the swarm.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar content-start">
                  <AnimatePresence>
                    {workers.map((worker) => (
                      <motion.div 
                        key={worker.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`p-5 rounded-xl border relative overflow-hidden backdrop-blur-md transition-all ${
                          worker.reputation.overallScore === 0 
                            ? 'bg-red-950/20 border-red-900/50' 
                            : worker.busy
                              ? 'bg-cyan-950/20 border-cyan-500/30 box-glow'
                              : 'bg-black/40 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Status glow behind card */}
                        {worker.busy && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/10 blur-xl pointer-events-none rounded-full animate-pulse" />
                        )}

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-mono text-sm text-zinc-100">{worker.id.substring(0,12)}</h3>
                              <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1.5">
                                <Cpu className="h-3.5 w-3.5 text-zinc-400" />
                                {worker.capabilities?.cpus || '?'} Cores <span className="mx-1">•</span> {worker.capabilities?.vram || '?'}GB
                              </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              worker.reputation.overallScore === 0 
                                ? 'bg-red-950/50 text-red-400 border-red-900/50' 
                                : worker.reputation.overallScore >= 0.50 
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50' 
                                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-700/50'
                            }`}>
                              {(worker.reputation.overallScore * 100).toFixed(0)}% Rep
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                            <div>
                              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Ping</div>
                              <div className="text-xs text-zinc-300 mt-1">{worker.reputation.pingMs}ms</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Uptime</div>
                              <div className="text-xs text-zinc-300 mt-1">{worker.reputation.uptimeHours.toFixed(1)}h</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Tasks</div>
                              <div className="text-xs text-zinc-300 mt-1">{worker.reputation.completedTasks}</div>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between">
                            <span className={`flex items-center gap-2 text-xs font-bold tracking-wider ${
                              worker.reputation.overallScore === 0 
                                ? 'text-red-500' 
                                : worker.busy 
                                  ? 'text-cyan-400' 
                                  : 'text-zinc-500'
                            }`}>
                              <span className="relative flex h-2.5 w-2.5">
                                {worker.busy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                  worker.reputation.overallScore === 0 
                                    ? 'bg-red-500' 
                                    : worker.busy 
                                      ? 'bg-cyan-500' 
                                      : 'bg-zinc-600'
                                }`}></span>
                              </span>
                              {worker.reputation.overallScore === 0 ? 'SLASHED' : worker.busy ? 'EXECUTING' : 'IDLE'}
                            </span>
                            
                            {worker.reputation.overallScore === 0 && (
                              <ShieldAlert className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
