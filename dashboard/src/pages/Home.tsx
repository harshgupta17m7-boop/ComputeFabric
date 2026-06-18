import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  Server, Cpu, Activity, ShieldCheck, Zap, Globe, HardDrive,
  Database, Network, Layers, BarChart, Lock, Box, Code,
  Workflow, PlaySquare, Hexagon, ArrowRight
} from 'lucide-react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { GlowCard } from '@/components/ui/glow-card';
import { NetworkSimulation } from '@/components/NetworkSimulation';
import { InteractiveArchitecture } from '@/components/InteractiveArchitecture';
import { auth, db, authenticateAnonymously } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const waitlistSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.string().min(1, "Role is required"),
});

type WaitlistForm = z.infer<typeof waitlistSchema>;

const CanvasBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{ x: number, y: number, vx: number, vy: number, size: number }> = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      particles = [];
      const numParticles = Math.floor((width * height) / 12000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // cyan
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = 'rgba(26, 110, 247, 0.15)'; // electric blue
      ctx.lineWidth = 1;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    init();
    draw();

    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <motion.canvas 
      ref={canvasRef} 
      style={{ y }}
      className="absolute inset-0 z-0 pointer-events-none opacity-50 h-[150vh]"
    />
  );
};

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const { scrollYProgress } = useScroll();
  
  // Parallax effects
  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, 200]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const yNetwork = useTransform(scrollYProgress, [0.1, 0.4], [100, 0]);

  const form = useForm<WaitlistForm>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { name: "", email: "", role: "" }
  });

  const onSubmit = async (data: WaitlistForm) => {
    try {
      const user = await authenticateAnonymously();
      await addDoc(collection(db, "waitlist"), {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        source: 'landing_page'
      });
      
      setWaitlistSuccess(true);
      toast({
        title: "Request Received",
        description: "Welcome to the Parallax Network.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error submitting to waitlist:", error);
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-white">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Hexagon className="w-6 h-6 text-primary group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">ComputeFabric</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#network" className="hover:text-white transition-colors">Live Network</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#vision" className="hover:text-white transition-colors">Vision</a>
            <MagneticButton intensity={0.2} className="bg-[#1a6ef7] hover:bg-[#1a6ef7]/90 text-white rounded-md px-4 py-2 text-sm font-medium shadow-[0_0_15px_rgba(26,110,247,0.5)] transition-all hover:shadow-[0_0_25px_rgba(26,110,247,0.7)]" onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}>
              Join Waitlist
            </MagneticButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
        <CanvasBackground />
        
        {/* Dynamic mesh gradient in background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10 pointer-events-none" />
        
        <motion.div 
          style={{ y: yHero, opacity: opacityHero }}
          className="relative z-20 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white mb-6 leading-tight drop-shadow-2xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-primary bg-[length:200%_auto] animate-gradient">
                Compute Orchestration
              </span>
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            ComputeFabric transforms underutilized consumer hardware into scalable AI infrastructure through intelligent orchestration and cryptographic verification.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20"
          >
            <MagneticButton 
              intensity={0.3} 
              className="w-full sm:w-auto bg-[#1a6ef7] hover:bg-[#1a6ef7]/90 text-white px-8 h-14 rounded-full text-lg font-medium shadow-[0_0_30px_rgba(26,110,247,0.4)] transition-all hover:shadow-[0_0_50px_rgba(26,110,247,0.6)] hover:scale-105 active:scale-95" 
              onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Join Waitlist
            </MagneticButton>
            <MagneticButton 
              intensity={0.1} 
              className="w-full sm:w-auto bg-white/5 border border-white/20 text-white hover:bg-white/10 px-8 h-14 rounded-full text-lg font-medium transition-all hover:scale-105 active:scale-95" 
              onClick={() => setLocation('/dashboard')}
            >
              Launch Dashboard
            </MagneticButton>
          </motion.div>
        </motion.div>

        {/* Live Network Simulation pushed up */}
        <motion.div 
          id="network"
          style={{ y: yNetwork }}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-30 w-full max-w-5xl mx-auto px-6 -mb-32"
        >
          <NetworkSimulation />
        </motion.div>
      </section>

      {/* Problem Section with Glow Cards */}
      <section className="pt-48 pb-32 bg-background relative border-t border-white/5 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-primary font-semibold tracking-wider uppercase mb-4 animate-pulse">The Compute Bottleneck</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white">The World Already Has Compute.<br />It Just Isn't Coordinated.</h3>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <GlowCard glowColor="rgba(239, 68, 68, 0.15)" className="h-full p-8">
                <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center mb-6">
                  <Server className="text-destructive w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-white mb-4">Traditional Infrastructure</h4>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3"><span className="text-destructive mt-1">✕</span> Expensive datacenters</li>
                  <li className="flex items-start gap-3"><span className="text-destructive mt-1">✕</span> Long deployment cycles</li>
                  <li className="flex items-start gap-3"><span className="text-destructive mt-1">✕</span> Massive capital requirements</li>
                  <li className="flex items-start gap-3"><span className="text-destructive mt-1">✕</span> Energy intensive and centralized</li>
                </ul>
              </GlowCard>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <GlowCard glowColor="rgba(26, 110, 247, 0.3)" className="h-full p-8 border-primary/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-6 relative z-10">
                  <Globe className="text-primary w-6 h-6 animate-[spin_10s_linear_infinite]" />
                </div>
                <h4 className="text-xl font-bold text-white mb-4 relative z-10">ComputeFabric</h4>
                <ul className="space-y-4 text-muted-foreground relative z-10">
                  <li className="flex items-start gap-3"><span className="text-primary mt-1">✓</span> Millions of idle GPUs globally</li>
                  <li className="flex items-start gap-3"><span className="text-primary mt-1">✓</span> Powerful AI PCs everywhere</li>
                  <li className="flex items-start gap-3"><span className="text-primary mt-1">✓</span> Underutilized workstations</li>
                  <li className="flex items-start gap-3"><span className="text-primary mt-1">✓</span> Decentralized and ready to deploy</li>
                </ul>
              </GlowCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Section */}
      <section id="architecture" className="py-32 bg-[#080b14] border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.1),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Interactive Architecture</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Hover over the components to see how the global fabric is orchestrated.
            </p>
          </motion.div>

          <InteractiveArchitecture />
        </div>
      </section>

      {/* Features Section with Glow Cards */}
      <section className="py-32 bg-background border-t border-white/5 relative">
        {/* Background decorative elements */}
        <div className="absolute left-0 top-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-1/4 w-64 h-64 bg-cyan-400/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Engineered for Scale</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Intelligent Orchestration", desc: "Coordinates heterogeneous hardware at scale across multiple environments and connection qualities.", icon: Workflow },
              { title: "Workload Placement", desc: "Matches workloads to optimal resources based on predictive availability and hardware profiles.", icon: Box },
              { title: "Verification Layer", desc: "Ensures trustworthy execution on untrusted nodes through cryptographic and probabilistic checks.", icon: ShieldCheck },
              { title: "Contributor Economy", desc: "Dynamically rewards value delivered based on uptime, capability, and successful executions.", icon: Zap },
              { title: "Global Compute Fabric", desc: "Transforms disconnected resources into a unified, accessible infrastructure layer.", icon: Globe },
              { title: "Federated AI Training", desc: "(Coming Soon) Train massive models across distributed hardware using DiLoCo gradient averaging.", icon: Layers }
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="h-full"
              >
                <GlowCard className="h-full p-8 group flex flex-col">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-6 group-hover:bg-primary/20 transition-colors">
                    <feat.icon className="w-8 h-8 text-primary group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    {feat.title}
                    {feat.title === "Federated AI Training" && (
                      <span className="text-[10px] uppercase tracking-widest bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">Coming Soon</span>
                    )}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed flex-1">{feat.desc}</p>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-40 bg-[#05070f] border-t border-white/5 relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(26, 110, 247, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(26, 110, 247, 0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
            transformOrigin: 'top center'
          }}
        />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-block p-4 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md">
              <Layers className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">A New Layer of Global Infrastructure</h2>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              We believe future compute infrastructure will combine centralized and distributed resources. ComputeFabric is building the orchestration layer that coordinates global compute regardless of where hardware is physically located.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="py-32 bg-background border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        
        <div className="max-w-xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Join the Future of Compute</h2>
            <p className="text-lg text-muted-foreground">
              Whether you want to contribute compute resources, build AI products, or help shape the future of infrastructure, we'd love to hear from you.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card/60 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
          >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {waitlistSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(26,110,247,0.3)]">
                      <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">Request Received</h3>
                    <p className="text-muted-foreground text-lg">We'll be in touch shortly with next steps.</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80">Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Jane Doe" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 focus-visible:ring-primary focus-visible:border-primary transition-all" />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80">Work Email</FormLabel>
                              <FormControl>
                                <Input placeholder="jane@company.com" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 focus-visible:ring-primary focus-visible:border-primary transition-all" />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80">I am a...</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 focus:ring-primary focus:border-primary transition-all">
                                    <SelectValue placeholder="Select your role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-card border-white/10 text-white backdrop-blur-xl">
                                  <SelectItem value="contributor">Compute Contributor</SelectItem>
                                  <SelectItem value="startup">AI Startup</SelectItem>
                                  <SelectItem value="developer">Developer</SelectItem>
                                  <SelectItem value="researcher">Researcher</SelectItem>
                                  <SelectItem value="investor">Investor</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                        <MagneticButton type="submit" intensity={0.1} className="w-full h-14 bg-[#1a6ef7] hover:bg-[#1a6ef7]/90 text-white text-lg font-medium rounded-xl shadow-[0_0_20px_rgba(26,110,247,0.3)] transition-all hover:shadow-[0_0_40px_rgba(26,110,247,0.5)] active:scale-[0.98]">
                          Request Early Access
                        </MagneticButton>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
            <Hexagon className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-white">ComputeFabric</span>
          </div>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#vision" className="hover:text-white transition-colors">Vision</a>
            <a href="#" className="hover:text-white transition-colors">Careers</a>
          </div>

          <div className="text-sm text-muted-foreground/60">
            &copy; {new Date().getFullYear()} ComputeFabric. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
