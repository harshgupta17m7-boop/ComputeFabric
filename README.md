# ComputeFabric

> **Trustless Distributed Compute Orchestration Layer**

ComputeFabric is an enterprise-grade orchestration layer that aggregates untrusted, heterogeneous consumer hardware into a unified, cryptographically secure compute swarm. By shifting trust from centralized providers (like AWS) to **Zero-Trust Mathematics**, the network scales infinitely while reducing compute costs by up to 90%.

---

## 🏗️ Technical Architecture

ComputeFabric utilizes a tripartite architecture to achieve high-throughput Map-Reduce execution and simulated federated learning without relying on trusted infrastructure.

| Component | Technology Stack | Core Responsibility |
| :--- | :--- | :--- |
| **Orchestrator (Broker)** | Node.js, Express, Socket.io | Dataset sharding, node telemetry, cryptographic consensus resolution, and continuous node slashing. |
| **Swarm (Workers)** | Node.js, VM Sandbox | Isolated execution of mathematical payloads, hardware telemetry polling, and Merkle Root generation. |
| **Command Center** | React, Vite, TailwindCSS | Real-time WebSocket topology visualization, job deployment wizard, and visual telemetry monitoring. |

### The Trustless Consensus Protocol

To guarantee execution integrity on anonymous consumer devices, the Orchestrator enforces a strict consensus protocol:

1. **Dataset Sharding:** A massive dataset $D$ is split into shards $S_1, S_2, ... S_n$.
2. **Consensus Grouping:** Shard $S_x$ is dispatched to a randomly assigned "Consensus Group" of 3 isolated physical nodes.
3. **Sandboxed Execution:** Nodes execute the payload in a local VM sandbox. 
4. **Cryptographic Commitment:** Instead of transmitting large result payloads over the wire, nodes generate a SHA-256 Merkle Root of their output state and transmit the 256-bit hash $H(O_x)$.
5. **Resolution & Slashing:** The Orchestrator compares the 3 hashes. If $\ge 2$ hashes match perfectly, consensus is achieved. The dissenting node is mathematically proven to be malicious or faulty, triggering an immediate Reputation Slash to `0.0`.

---

## 📊 Paradigm Comparison

Why rely on decentralized consensus over traditional Cloud architectures?

| Feature | Legacy Cloud | ComputeFabric |
| :--- | :--- | :--- |
| **Trust Model** | Brand / Corporate Trust | **Zero-Trust Cryptography** |
| **Elasticity** | Constrained by physical data centers | **Infinite** (Global latent hardware) |
| **Cost Basis** | High (Includes 70%+ brand margin) | **At-cost** (Commodity power pricing) |
| **Fault Tolerance** | Redundant hardware | **Byzantine Fault Tolerant (BFT)** |
| **Security Risk** | Single Point of Failure (Data breaches) | Decentralized Payload Sharding |

---

## ⚙️ Node Reputation System

Every node in the swarm is constantly monitored and scored to ensure optimal workload routing. The overall score determines a node's eligibility to join a Consensus Group ($\tau \ge 0.50$).

**Scoring Algorithm Weights:**
* **Accuracy (40%):** Drops to 0 instantly upon a failed Merkle Root consensus (Slashing).
* **Reliability (30%):** Ratio of successfully completed tasks vs. assigned tasks.
* **Experience (20%):** Total volume of data processed historically.
* **Network Latency (-):** Dynamic penalty applied for high ping ($\ge 1000ms$).

---

## 🚀 Quick Start (Local Prototype Deployment)

To run the local swarm for demonstration or testing purposes:

### 1. Initialize the Orchestrator
```bash
cd broker
npm install
npm run build
node dist/index.js
```
*The WebSocket server will mount on port 3000.*

### 2. Boot the Swarm Nodes
Open multiple terminals to simulate physical nodes joining the global grid.
```bash
cd worker
npm install
npm run build

# Start Honest Node A
node dist/index.js

# Start Honest Node B
node dist/index.js

# Start a Malicious Node (Injects poisoned data to trigger slashing)
$env:IS_MALICIOUS='true' # Windows
# export IS_MALICIOUS='true' # Mac/Linux
node dist/index.js
```

### 3. Launch the Command Center
```bash
cd dashboard
npm install
npm run dev
```
*Navigate to `http://localhost:5173` to view the live topology and trigger a Map-Reduce workload.*

---

## 🗺️ Engineering Roadmap

| Phase | Feature | Status | Description |
| :---: | :--- | :---: | :--- |
| **V1** | **Map-Reduce Engine** | ✅ Active | Deterministic data processing and scientific simulations using exact Merkle Root matching. |
| **V2** | **Federated AI Training** | 🚧 Coming Soon | DiLoCo gradient averaging across swarm nodes, utilizing validation-based accuracy testing to slash malicious updates. |
| **V3** | **Hardware Enclaves** | 📅 Planned | Migrating execution from Node VMs to Firecracker microVMs and WebAssembly (WASM) for enterprise-grade RCE protection. |

---

> **Security Note:** The current prototype worker utilizes Node's `vm` module with AST/Regex sanitization for rapid demonstration. Production deployment will require isolated microVMs to prevent host escapes.
