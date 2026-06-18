import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

interface WorkerCapabilities {
  cpus: number;
  platform: string;
  totalMem: number;
  vram?: number;
}

export interface NodeReputation {
  accuracy: number;
  reliability: number;
  pingMs: number;
  uptimeHours: number;
  completedTasks: number;
  totalAssigned: number;
  overallScore: number;
}

interface Worker {
  id: string;
  socket: Socket;
  busy: boolean;
  reputation: NodeReputation;
  capabilities: WorkerCapabilities;
  connectionTime: number;
}

const workers = new Map<string, Worker>();
const TRUST_THRESHOLD_TAU = 0.50; // Lowered slightly so we can test with malicous nodes

/**
 * @description The WebSocket Registry.
 * Listens for new physical nodes joining the global Swarm.
 */
io.on('connection', (socket) => {
  // Give them a high starting reputation
  const startingReputation = 0.95;

  // Immediately send the current state to newly connected clients (e.g. the UI dashboard)
  const publicWorkers = Array.from(workers.values()).map(w => ({
    id: w.id,
    busy: w.busy,
    reputation: w.reputation,
    capabilities: w.capabilities
  }));
  socket.emit('network_state', publicWorkers);

  socket.on('register_worker', (capabilities: WorkerCapabilities) => {
    if (!capabilities.vram) {
      capabilities.vram = Math.floor(capabilities.totalMem / (1024 ** 3) * 0.5); 
    }

    console.log(`[Broker] Worker registered: ${socket.id} | VRAM: ${capabilities.vram}GB`);
    workers.set(socket.id, {
      id: socket.id,
      socket,
      busy: false,
      reputation: {
        accuracy: 1.0,
        reliability: 1.0,
        pingMs: 0,
        uptimeHours: 0,
        completedTasks: 0,
        totalAssigned: 0,
        overallScore: 0.95
      },
      capabilities,
      connectionTime: Date.now()
    });
    
    broadcastNetworkState();
  });

  socket.on('update_capabilities', (newCapabilities: WorkerCapabilities) => {
    const worker = workers.get(socket.id);
    if (worker) {
      worker.capabilities = newCapabilities;
      console.log(`[Broker] Worker ${socket.id} updated capabilities: VRAM: ${newCapabilities.vram}GB, CPUs: ${newCapabilities.cpus}`);
      broadcastNetworkState();
    }
  });

  socket.on('pong', (timestamp: number) => {
    const worker = workers.get(socket.id);
    if (worker) {
      worker.reputation.pingMs = Date.now() - timestamp;
      recalculateScore(worker);
      broadcastNetworkState();
    }
  });

  socket.on('client_ping', (timestamp: number) => {
    socket.emit('client_pong', timestamp);
  });

  socket.on('disconnect', () => {
    workers.delete(socket.id);
    broadcastNetworkState();
  });
});

function recalculateScore(worker: Worker) {
  worker.reputation.uptimeHours = (Date.now() - worker.connectionTime) / (1000 * 60 * 60);
  if (worker.reputation.totalAssigned > 0) {
    worker.reputation.reliability = worker.reputation.completedTasks / worker.reputation.totalAssigned;
  }
  
  // Weighting formula: 40% accuracy, 30% reliability, 20% experience, 10% uptime, minus ping penalty
  const expScore = Math.min(worker.reputation.completedTasks / 100, 1.0);
  const uptimeScore = Math.min(worker.reputation.uptimeHours / 24, 1.0);
  const pingPenalty = Math.min(worker.reputation.pingMs / 1000, 0.2); // max 20% penalty for 1000ms ping
  
  worker.reputation.overallScore = 
    (worker.reputation.accuracy * 0.40) + 
    (worker.reputation.reliability * 0.30) + 
    (expScore * 0.20) + 
    (uptimeScore * 0.10) - 
    pingPenalty;
    
  worker.reputation.overallScore = Math.max(0, worker.reputation.overallScore);
}

// Ping loop
setInterval(() => {
  const now = Date.now();
  for (const [id, worker] of workers.entries()) {
    worker.socket.emit('ping', now);
  }
}, 5000);

// Broadcast the list of active workers to all connected clients (excluding the socket instances themselves)
function broadcastNetworkState() {
  const publicWorkers = Array.from(workers.values()).map(w => {
    // Update uptime before broadcasting
    recalculateScore(w);
    return {
      id: w.id,
      busy: w.busy,
      reputation: w.reputation,
      capabilities: w.capabilities
    };
  });
  io.emit('network_state', publicWorkers);
}

app.post('/api/tasks/inference', async (req, res) => {
  const { prompt } = req.body;
  const taskId = randomUUID();
  console.log(`\n[Broker] Received inference task ${taskId} for prompt: "${prompt}"`);

  const trustedWorkers = Array.from(workers.values()).filter(w => !w.busy && w.reputation.overallScore >= TRUST_THRESHOLD_TAU);
  
  if (trustedWorkers.length < 2) {
    return res.status(503).json({ error: "Requires at least 2 trusted workers for VeriLLM protocol." });
  }

  // Select Primary and Verifier
  const primary = trustedWorkers[0];
  const verifier = trustedWorkers[1];

  primary.busy = true;
  verifier.busy = true;

  try {
    // Phase 1: Primary Inference (Commit)
    console.log(`[VeriLLM] Dispatching Primary Inference to ${primary.id}`);
    const primaryResult: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Primary timed out")), 10000);
      
      const onResult = ({ taskId: returnedId, result, merkleRoot, error }: any) => {
        if (returnedId === taskId) {
          clearTimeout(timeout);
          primary.socket.off('task_result', onResult);
          if (error) reject(new Error(error));
          else resolve({ result, merkleRoot });
        }
      };
      primary.socket.on('task_result', onResult);
      primary.socket.emit('execute_task', { taskId, code: prompt, isVerification: false });
    });

    console.log(`[VeriLLM] Primary committed Merkle Root: ${primaryResult.merkleRoot.substring(0,8)}...`);

    // Phase 2: Verifier Spot-Check (Sample)
    console.log(`[VeriLLM] Dispatching Verification task to ${verifier.id}`);
    const verifierResult: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Verifier timed out")), 10000);
      
      const onResult = ({ taskId: returnedId, merkleRoot, error }: any) => {
        if (returnedId === taskId) {
          clearTimeout(timeout);
          verifier.socket.off('task_result', onResult);
          if (error) reject(new Error(error));
          else resolve({ merkleRoot });
        }
      };
      verifier.socket.on('task_result', onResult);
      verifier.socket.emit('execute_task', { taskId, code: prompt, isVerification: true });
    });

    console.log(`[VeriLLM] Verifier computed Merkle Root: ${verifierResult.merkleRoot.substring(0,8)}...`);

    // Phase 3: On-Chain Auditing (Reveal & Slash)
    primary.busy = false;
    verifier.busy = false;

    if (primaryResult.merkleRoot === verifierResult.merkleRoot) {
      console.log(`[VeriLLM] ✅ Verification Passed. Inference is cryptographically valid.`);
      res.json({ taskId, status: 'verified', result: primaryResult.result });
    } else {
      console.log(`[VeriLLM] 🚨 VERIFICATION FAILED! Mismatch detected.`);
      console.log(`[VeriLLM] ⚔️ SLASHING Primary node ${primary.id} (Reputation 0)`);
      
      const maliciousNode = workers.get(primary.id);
      if (maliciousNode) {
        maliciousNode.reputation.accuracy = 0.0; // Slashed!
        recalculateScore(maliciousNode);
      }
      broadcastNetworkState();
      
      res.status(403).json({ taskId, status: 'slashed', error: "Primary inferencer provided malicious/forged data." });
    }

  } catch (error: any) {
    primary.busy = false;
    verifier.busy = false;
    res.status(500).json({ taskId, status: 'failed', error: error.message });
  }
});

/**
 * @route POST /api/tasks/compute
 * @description The core Map-Reduce Distributed Compute endpoint.
 * Takes an array (dataset) and arbitrary JS code, sharding the dataset
 * across the active swarm of Worker nodes for parallel processing.
 */
app.post('/api/tasks/compute', async (req, res) => {
  const { code, dataset } = req.body;
  const taskId = randomUUID();
  console.log(`\n[Broker] Received Distributed Compute task ${taskId} with dataset size: ${dataset?.length || 0}`);

  if (!Array.isArray(dataset) || dataset.length === 0) {
    return res.status(400).json({ error: "Dataset must be a non-empty array." });
  }

  const availableWorkers = Array.from(workers.values()).filter(w => !w.busy && w.reputation.overallScore >= TRUST_THRESHOLD_TAU);
  
  const numGroups = Math.floor(availableWorkers.length / 3);
  if (numGroups === 0) {
    return res.status(503).json({ error: "Requires at least 3 trusted workers for Trustless Consensus Engine protocol." });
  }

  // Cap groups by dataset size so we don't make more groups than dataset items
  const actualGroups = Math.min(dataset.length, numGroups);
  const chunkSize = Math.ceil(dataset.length / actualGroups);
  
  console.log(`[Broker] Consensus Engine: Sharding dataset into ${actualGroups} chunks. Each chunk dispatched to a Consensus Group of 3 nodes.`);

  const shardPromises = [];
  const activeNodesInTask = [];
  
  for (let g = 0; g < actualGroups; g++) {
    // Select 3 nodes for this group
    const groupNodes = availableWorkers.slice(g * 3, g * 3 + 3);
    activeNodesInTask.push(...groupNodes);
    
    const startIdx = g * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, dataset.length);
    const shardData = dataset.slice(startIdx, endIdx);
    
    const groupPromise = new Promise<{ group: number, result: any, verified: boolean }>((resolve, reject) => {
      let resultsReceived = 0;
      const groupResults: { node: any, result: any, merkleRoot: string }[] = [];
      let hasResolved = false;
      
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          groupNodes.forEach(n => n.busy = false);
          reject(new Error(`Consensus Group ${g} timed out`));
        }
      }, 30000);

      groupNodes.forEach(node => {
        node.busy = true;
        node.reputation.totalAssigned += 1;
        recalculateScore(node);
        
        const onResult = ({ taskId: returnedId, result, merkleRoot, error }: any) => {
          if (returnedId === taskId) {
            node.socket.off('compute_result', onResult);
            node.busy = false;
            
            if (error) {
               groupResults.push({ node, result: null, merkleRoot: "ERROR" });
            } else {
               node.reputation.completedTasks += 1;
               groupResults.push({ node, result, merkleRoot });
            }
            recalculateScore(node);
            
            resultsReceived++;
            if (resultsReceived === 3 && !hasResolved) {
               clearTimeout(timeout);
               hasResolved = true;
               
               // Consensus Verification (2 out of 3 must agree on merkleRoot)
               const rootCounts: Record<string, number> = {};
               for (const r of groupResults) {
                 rootCounts[r.merkleRoot] = (rootCounts[r.merkleRoot] || 0) + 1;
               }
               
               let consensusRoot: string | null = null;
               for (const [root, count] of Object.entries(rootCounts)) {
                 if (count >= 2 && root !== "ERROR" && root !== "undefined") {
                   consensusRoot = root;
                   break;
                 }
               }
               
               if (consensusRoot) {
                 console.log(`[Consensus] ✅ Group ${g} reached consensus on root ${consensusRoot.substring(0,8)}...`);
                 // Slash dissenters
                 for (const r of groupResults) {
                   // Compare stringified to avoid undefined vs "undefined" issues
                   if (String(r.merkleRoot) !== consensusRoot) {
                     console.log(`[Consensus] 🚨 SLASHING malicious node ${r.node.id}`);
                     r.node.reputation.accuracy = 0.0;
                     recalculateScore(r.node);
                   }
                 }
                 const validResult = groupResults.find(r => String(r.merkleRoot) === consensusRoot)!.result;
                 resolve({ group: g, result: validResult, verified: true });
               } else {
                 console.log(`[Consensus] 🚨 Group ${g} FAILED to reach consensus! Data compromised.`);
                 reject(new Error(`Consensus failed for shard ${g}`));
               }
               broadcastNetworkState();
            }
          }
        };
        
        node.socket.on('compute_result', onResult);
        node.socket.emit('execute_compute', { taskId, code, dataset: shardData });
      });
    });
    
    shardPromises.push(groupPromise);
  }
  
  broadcastNetworkState();

  try {
    const shardResults = await Promise.all(shardPromises);
    
    // Reduce: Stitch the results back together
    let finalResult: any[] = [];
    for (const r of shardResults.sort((a,b) => a.group - b.group)) {
      if (Array.isArray(r.result)) {
        finalResult = finalResult.concat(r.result);
      } else {
        finalResult.push(r.result);
      }
    }
    
    console.log(`[Broker] Distributed Compute task ${taskId} successfully aggregated & verified by Consensus!`);
    res.json({ taskId, status: 'verified', shardsProcessed: actualGroups, consensusGroups: actualGroups, result: finalResult });

  } catch (error: any) {
    activeNodesInTask.forEach(node => { node.busy = false; });
    broadcastNetworkState();
    console.error(`[Broker] Distributed Compute Failed: ${error.message}`);
    res.status(500).json({ taskId, status: 'failed', error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[Broker] VeriLLM Orchestrator listening on port ${PORT}`);
});
