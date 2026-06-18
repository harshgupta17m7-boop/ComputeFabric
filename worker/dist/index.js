import { io } from 'socket.io-client';
import os from 'os';
import crypto from 'crypto';
import vm from 'vm';
import si from 'systeminformation';
const BROKER_URL = process.env.BROKER_URL || 'http://localhost:3000';
const socket = io(BROKER_URL);
const SIMULATED_VRAM = process.env.SIMULATED_VRAM ? parseInt(process.env.SIMULATED_VRAM) : [8, 12, 16, 24][Math.floor(Math.random() * 4)];
const IS_MALICIOUS = process.env.IS_MALICIOUS === 'true' || (process.env.IS_MALICIOUS !== 'false' && Math.random() > 0.7);
console.log(`[Worker] Connecting to Broker at ${BROKER_URL}...`);
if (IS_MALICIOUS) {
    console.log(`[WARNING] This node is configured as MALICIOUS.`);
}
socket.on('connect', async () => {
    console.log(`[Worker] Connected to Broker with ID: ${socket.id}`);
    // Probe actual hardware
    const graphics = await si.graphics();
    const memory = await si.mem();
    const cpu = await si.cpu();
    let gpuVram = 0;
    if (graphics.controllers.length > 0 && graphics.controllers[0].vram) {
        gpuVram = graphics.controllers[0].vram / 1024; // convert MB to GB if needed, wait vram is usually in MB in systeminformation
        // If it's already returned in MB, /1024 makes it GB. Let's just calculate it.
        // systeminformation returns vram in MB natively
        gpuVram = Math.round(graphics.controllers[0].vram / 1024) || SIMULATED_VRAM;
    }
    else {
        gpuVram = SIMULATED_VRAM;
    }
    const cpus = parseInt(process.env.ALLOCATED_CPUS || "") || Math.max(1, (cpu.physicalCores || os.cpus().length) - 1);
    const vram = parseInt(process.env.ALLOCATED_VRAM || "") || gpuVram;
    const capabilities = {
        cpus,
        platform: os.platform(),
        totalMem: memory.total,
        vram
    };
    socket.emit('register_worker', capabilities);
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp);
    });
});
// A simulated secure execution sandbox for LLM Inference
async function executeLLMInSandbox(prompt, isVerification) {
    return new Promise((resolve) => {
        // We isolate the workload from the host using Node.js VM contexts
        // This represents the microVM (Firecracker/Kata) isolation discussed in the paper
        const sandbox = {
            prompt,
            isVerification,
            output: null,
            hiddenStates: []
        };
        vm.createContext(sandbox);
        // The script simulates the two phases of LLM inference:
        // 1. Prefill (Highly parallel, processes the prompt)
        // 2. Autoregressive (Sequential, generates output)
        const script = new vm.Script(`
      // Simulated Prefill Phase
      const promptTokens = prompt.split(" ");
      let currentState = "PREFILL_START";
      for (const token of promptTokens) {
        currentState = currentState + "_" + token.toUpperCase();
      }
      hiddenStates.push(currentState); // Commit prefill state

      // If this node is just a Verifier, it skips the expensive autoregressive phase entirely!
      if (isVerification) {
        output = "VERIFICATION_PREFILL_ONLY";
      } else {
        // Simulated Autoregressive Decoding Phase
        let generatedText = "I am a decentralized AI model.";
        let genTokens = generatedText.split(" ");
        for (const token of genTokens) {
           currentState = currentState + "+" + token.toLowerCase();
        }
        hiddenStates.push(currentState); // Commit final state
        output = generatedText;
      }
    `);
        // Execute securely within the sandbox
        script.runInContext(sandbox, { timeout: 5000 });
        resolve({
            result: sandbox.output,
            states: sandbox.hiddenStates
        });
    });
}
socket.on('execute_task', async ({ taskId, code: prompt, isVerification }) => {
    console.log(`[Worker] Received LLM inference task ${taskId}. (Verifier Mode: ${!!isVerification})`);
    try {
        const startTime = performance.now();
        let result;
        let merkleRoot;
        if (IS_MALICIOUS) {
            console.log(`[Worker] Maliciously forging result for task ${taskId} to save compute cycles!`);
            result = "Forged/Hallucinated Output";
            merkleRoot = crypto.createHash('sha256').update(JSON.stringify(["FAKE_STATE"])).digest('hex');
        }
        else {
            // Execute the prompt inside the VM Sandbox
            const execution = await executeLLMInSandbox(prompt, isVerification);
            result = execution.result;
            // Hash the prefill hidden states to create the Merkle Commitment
            merkleRoot = crypto.createHash('sha256').update(JSON.stringify(execution.states[0])).digest('hex');
        }
        const endTime = performance.now();
        console.log(`[Worker] Task completed in ${(endTime - startTime).toFixed(2)}ms. Merkle Root: ${merkleRoot.substring(0, 8)}...`);
        socket.emit('task_result', { taskId, result, merkleRoot, isVerification });
    }
    catch (error) {
        console.error(`[Worker] Task ${taskId} failed:`, error.message);
        socket.emit('task_result', { taskId, error: error.message, isVerification });
    }
});
// A simulated secure execution sandbox for Distributed Compute Tasks
async function executeComputeInSandbox(code, dataset) {
    return new Promise((resolve) => {
        // We isolate the workload from the host using Node.js VM contexts
        const sandbox = {
            dataset,
            output: null,
            console: {
                log: () => { } // squelch console logs from untrusted code
            }
        };
        vm.createContext(sandbox);
        // The script expects the user to have provided a function as a string expression or assignment
        // E.g., `output = dataset.map(x => x * x);`
        const script = new vm.Script(code);
        // Execute securely within the sandbox
        script.runInContext(sandbox, { timeout: 30000 });
        resolve(sandbox.output);
    });
}
socket.on('execute_compute', async ({ taskId, code, dataset }) => {
    console.log(`[Worker] Received Distributed Compute task ${taskId} with ${dataset.length} items in shard.`);
    try {
        const startTime = performance.now();
        let result;
        if (IS_MALICIOUS) {
            console.log(`[Worker] Maliciously dropping shard data for task ${taskId}!`);
            result = dataset.map(() => "Forged Result");
        }
        else {
            // Execute the compute payload inside the VM Sandbox
            result = await executeComputeInSandbox(code, dataset);
        }
        const endTime = performance.now();
        const merkleRoot = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
        console.log(`[Worker] Shard completed in ${(endTime - startTime).toFixed(2)}ms. Merkle Root: ${merkleRoot.substring(0, 8)}...`);
        socket.emit('compute_result', { taskId, result, merkleRoot });
    }
    catch (error) {
        console.error(`[Worker] Compute task ${taskId} failed:`, error.message);
        socket.emit('compute_result', { taskId, error: error.message });
    }
});
socket.on('disconnect', () => {
    console.log(`[Worker] Disconnected from Broker.`);
});
