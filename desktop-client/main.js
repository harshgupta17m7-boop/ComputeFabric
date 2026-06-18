const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { io } = require('socket.io-client');
const os = require('os');
const crypto = require('crypto');
const vm = require('vm');
const si = require('systeminformation');

let mainWindow;
let socket;

// Worker State
const state = {
  status: 'DISCONNECTED',
  nodeId: null,
  ping: 0,
  tasksCompleted: 0,
  dataProcessed: 0,
  uptimeSecs: 0,
  capabilities: null,
  maxCapabilities: null
};

let connectionTime = null;
setInterval(() => {
  if (state.status !== 'DISCONNECTED' && state.status !== 'CONNECTING' && connectionTime) {
    state.uptimeSecs = Math.floor((Date.now() - connectionTime) / 1000);
  }
  updateUI();
}, 1000);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Compute Fabric Contributor",
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    updateUI();
  });
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  connectToBroker();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for UI to request state
ipcMain.handle('get-state', () => state);
ipcMain.on('set-allocation', (event, { cpus, vram }) => {
  if (state.capabilities) {
    state.capabilities.cpus = parseInt(cpus);
    state.capabilities.vram = parseInt(vram);
    if (socket && socket.connected) {
      socket.emit('update_capabilities', state.capabilities);
      logToUI(`Hardware allocation updated: ${cpus} Cores, ${vram}GB VRAM`);
    }
    updateUI();
  }
});

// Update UI
function updateUI() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', state);
  }
}

// Log to UI
function logToUI(message) {
  console.log(message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', {
      time: new Date().toLocaleTimeString(),
      text: message
    });
  }
}

async function connectToBroker() {
  const BROKER_URL = process.env.BROKER_URL || 'http://localhost:3000';
  socket = io(BROKER_URL);

  logToUI(`Connecting to Broker at ${BROKER_URL}...`);
  state.status = 'CONNECTING';
  updateUI();

  socket.on('connect', async () => {
    connectionTime = Date.now();
    state.nodeId = socket.id;
    logToUI(`Connected to Broker with ID: ${socket.id}`);
    state.status = 'IDLE';
    updateUI();

    // Probe actual hardware
    const graphics = await si.graphics();
    const memory = await si.mem();
    const cpu = await si.cpu();

    let gpuVram = 0;
    if (graphics.controllers.length > 0 && graphics.controllers[0].vram) {
      gpuVram = Math.round(graphics.controllers[0].vram / 1024) || 8;
    } else {
      gpuVram = 8;
    }

    const totalCpus = cpu.physicalCores || os.cpus().length;

    state.maxCapabilities = {
      cpus: totalCpus,
      platform: os.platform(),
      totalMem: memory.total,
      vram: gpuVram
    };

    // Default allocation (50% or Max - 1)
    if (!state.capabilities) {
      state.capabilities = {
        cpus: Math.max(1, totalCpus - 1),
        platform: os.platform(),
        totalMem: memory.total,
        vram: Math.floor(gpuVram * 0.8) || 1
      };
    }
    
    updateUI();
    socket.emit('register_worker', state.capabilities);
  });

  // Native Desktop Client Ping
  setInterval(() => {
    if (socket && socket.connected) {
      socket.volatile.emit('client_ping', Date.now());
    }
  }, 2000);

  socket.on('client_pong', (timestamp) => {
    state.ping = Date.now() - timestamp;
    updateUI();
  });

  // Broker Ping (For Broker Reputation)
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  socket.on('disconnect', () => {
    logToUI(`Disconnected from Broker.`);
    state.status = 'DISCONNECTED';
    state.nodeId = null;
    connectionTime = null;
    updateUI();
  });

  // LLM Inference Tasks
  socket.on('execute_task', async ({ taskId, code: prompt, isVerification }) => {
    logToUI(`Received LLM task ${taskId.substring(0,8)}... (Verifier Mode: ${!!isVerification})`);
    state.status = 'EXECUTING';
    updateUI();
    
    try {
      const startTime = performance.now();
      
      const execution = await executeLLMInSandbox(prompt, isVerification);
      const result = execution.result;
      const merkleRoot = crypto.createHash('sha256').update(JSON.stringify(execution.states[0])).digest('hex');

      const endTime = performance.now();
      logToUI(`Task completed in ${(endTime - startTime).toFixed(2)}ms. Hash: ${merkleRoot.substring(0,8)}...`);
      
      socket.emit('task_result', { taskId, result, merkleRoot, isVerification });
      
      state.tasksCompleted++;
      state.dataProcessed += prompt.split(" ").length; // Rough token count
      state.status = 'IDLE';
      updateUI();
    } catch (error) {
      logToUI(`Task ${taskId} failed: ${error.message}`);
      socket.emit('task_result', { taskId, error: error.message, isVerification });
      state.status = 'IDLE';
      updateUI();
    }
  });

  // Distributed Compute Tasks
  socket.on('execute_compute', async ({ taskId, code, dataset }) => {
    logToUI(`Received Distributed task ${taskId.substring(0,8)}... (Shard Size: ${dataset.length})`);
    state.status = 'EXECUTING';
    updateUI();
    
    try {
      const startTime = performance.now();
      
      const result = await executeComputeInSandbox(code, dataset);

      const endTime = performance.now();
      logToUI(`Shard completed in ${(endTime - startTime).toFixed(2)}ms.`);
      
      const merkleRoot = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
      socket.emit('compute_result', { taskId, result, merkleRoot });
      
      state.tasksCompleted++;
      state.dataProcessed += dataset.length; // Array items
      state.status = 'IDLE';
      updateUI();
    } catch (error) {
      logToUI(`Compute task ${taskId} failed: ${error.message}`);
      socket.emit('compute_result', { taskId, error: error.message });
      state.status = 'IDLE';
      updateUI();
    }
  });
}

// Sandbox logic
async function executeLLMInSandbox(prompt, isVerification) {
  return new Promise((resolve) => {
    const sandbox = {
      prompt,
      isVerification,
      output: null,
      hiddenStates: []
    };
    
    vm.createContext(sandbox);

    const script = new vm.Script(`
      const promptTokens = prompt.split(" ");
      let currentState = "PREFILL_START";
      for (const token of promptTokens) {
        currentState = currentState + "_" + token.toUpperCase();
      }
      hiddenStates.push(currentState); 

      if (isVerification) {
        output = "VERIFICATION_PREFILL_ONLY";
      } else {
        let generatedText = "I am a decentralized AI model.";
        let genTokens = generatedText.split(" ");
        for (const token of genTokens) {
           currentState = currentState + "+" + token.toLowerCase();
        }
        hiddenStates.push(currentState); 
        output = generatedText;
      }
    `);

    script.runInContext(sandbox, { timeout: 5000 });
    
    resolve({
      result: sandbox.output,
      states: sandbox.hiddenStates
    });
  });
}

async function executeComputeInSandbox(code, dataset) {
  return new Promise((resolve) => {
    const sandbox = {
      dataset,
      output: null,
      console: { log: () => {} }
    };
    
    vm.createContext(sandbox);
    const script = new vm.Script(code);
    script.runInContext(sandbox, { timeout: 30000 });
    
    resolve(sandbox.output);
  });
}
