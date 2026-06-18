// Navigation Logic
const navBtns = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active from all
    navBtns.forEach(b => b.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    
    // Add active to clicked
    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');
  });
});

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const coreRing = document.getElementById('core-ring');
const hardwareVram = document.getElementById('hardware-vram');
const hardwareDesc = document.getElementById('hardware-desc');
const dashPing = document.getElementById('dash-ping');
const dashRel = document.getElementById('dash-rel');
const contData = document.getElementById('cont-data');
const contTasks = document.getElementById('cont-tasks');
const contUptime = document.getElementById('cont-uptime');
const logsContainer = document.getElementById('logs');
const nodeId = document.getElementById('node-id');
const vramSlider = document.getElementById('vram-slider');
const vramLabel = document.getElementById('vram-label');
const cpuSlider = document.getElementById('cpu-slider');
const cpuLabel = document.getElementById('cpu-label');

let lastLogCount = 0;
let slidersInitialized = false;

// Slider Event Listeners
vramSlider.addEventListener('input', (e) => {
  vramLabel.innerText = `${e.target.value} GB`;
});
cpuSlider.addEventListener('input', (e) => {
  cpuLabel.innerText = e.target.value;
});

const saveLimitsBtn = document.getElementById('save-limits-btn');

// Commit changes on button click
saveLimitsBtn.addEventListener('click', () => {
  window.electronAPI.setAllocation({
    vram: vramSlider.value,
    cpus: cpuSlider.value
  });
  saveLimitsBtn.innerText = "Saved!";
  setTimeout(() => saveLimitsBtn.innerText = "Save Limits", 2000);
});

// Listen for state updates from the main process
window.electronAPI.onStateUpdate((state) => {
  // Update Status & Animations
  statusIndicator.className = `status-badge ${state.status}`;
  statusText.innerText = state.status;
  
  if (state.status === 'EXECUTING') {
    coreRing.classList.add('EXECUTING');
  } else {
    coreRing.classList.remove('EXECUTING');
  }

  // Update Hardware Profile
  if (state.maxCapabilities && !slidersInitialized) {
    vramSlider.max = state.maxCapabilities.vram;
    cpuSlider.max = state.maxCapabilities.cpus;
    slidersInitialized = true;
  }

  if (state.capabilities) {
    hardwareVram.innerText = `${state.capabilities.vram}GB`;
    hardwareDesc.innerText = `${state.capabilities.cpus} CPU Cores Allocated`;
    
    // Only update slider values if they aren't currently being dragged
    if (document.activeElement !== vramSlider) {
      vramSlider.value = state.capabilities.vram;
      vramLabel.innerText = `${state.capabilities.vram} GB`;
    }
    if (document.activeElement !== cpuSlider) {
      cpuSlider.value = state.capabilities.cpus;
      cpuLabel.innerText = state.capabilities.cpus;
    }
  }

  // Update Telemetry
  dashPing.innerHTML = `${Math.max(0, state.ping)}<span style="font-size: 16px; color: var(--text-muted)">ms</span>`;
  dashRel.innerHTML = `${state.reliability}<span style="font-size: 16px; color: var(--text-muted)">%</span>`;
  
  // Update Contributions Page
  contData.innerText = state.dataProcessed.toLocaleString();
  contTasks.innerText = state.tasksCompleted.toLocaleString();
  
  // Format uptime
  const hrs = Math.floor(state.uptimeSecs / 3600);
  const mins = Math.floor((state.uptimeSecs % 3600) / 60);
  const secs = state.uptimeSecs % 60;
  if (hrs > 0) contUptime.innerText = `${hrs}h ${mins}m`;
  else if (mins > 0) contUptime.innerText = `${mins}m ${secs}s`;
  else contUptime.innerText = `${secs}s`;
  // Handle Node ID Display
  if (state.nodeId) {
    nodeId.innerText = state.nodeId;
    nodeId.style.color = "var(--success)";
  } else if (state.status === 'DISCONNECTED') {
    nodeId.innerText = 'Disconnected';
    nodeId.style.color = "var(--danger)";
  } else {
    nodeId.innerText = 'Connecting...';
    nodeId.style.color = "var(--primary)";
  }
});

// Listen for logs from the main process
window.electronAPI.onLogMessage((log) => {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${log.time}]</span><span class="log-text">${log.text}</span>`;
  
  logsContainer.appendChild(entry);
  
  // Keep only last 100 logs
  if (logsContainer.children.length > 100) {
    logsContainer.removeChild(logsContainer.firstChild);
  }
  
  // Auto-scroll
  logsContainer.scrollTop = logsContainer.scrollHeight;
});

// Initial boot log
window.electronAPI.onLogMessage({ time: new Date().toLocaleTimeString(), text: 'System UI Booted. Waiting for Main Process...' });
