/**
 * Smart Energy Copilot Dashboard JavaScript
 * Handles real-time updates, device control, and user interactions
 */

class SmartEnergyDashboard {
  constructor() {
    this.socket = null;
    this.charts = {};
    this.currentSection = 'overview';
    this.devices = [];
    this.energyData = [];
    this.voiceCommandHistory = [];
    this.isVoiceRecording = false;
    
    this.init();
  }

  async init() {
    try {
      // Initialize Socket.IO connection
      this.initializeSocket();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize charts
      this.initializeCharts();
      
      // Load initial data
      await this.loadInitialData();
      
      // Hide loading overlay
      this.hideLoading();
      
      console.log('Dashboard initialized successfully');
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      this.showToast('Failed to initialize dashboard', 'error');
    }
  }

  initializeSocket() {
    this.socket = io();
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.showToast('Connected to Smart Energy Copilot', 'success');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.showToast('Connection lost', 'warning');
    });
    
    // System status updates
    this.socket.on('systemStatus', (status) => {
      this.updateSystemStatus(status);
    });
    
    this.socket.on('systemStatusUpdate', (status) => {
      this.updateSystemStatus(status);
    });
    
    // Energy updates
    this.socket.on('energyUpdate', (data) => {
      this.updateEnergyData(data);
    });
    
    // Device updates
    this.socket.on('deviceUpdate', (data) => {
      this.handleDeviceUpdate(data);
    });
    
    // Voice command results
    this.socket.on('voiceCommandResult', (result) => {
      this.handleVoiceCommandResult(result);
    });
    
    this.socket.on('voiceActivity', (activity) => {
      this.addVoiceCommandToHistory(activity);
    });
    
    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.showToast(error.message || 'Connection error', 'error');
    });
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.switchSection(section);
      });
    });
    
    // Refresh buttons
    document.getElementById('refresh-devices')?.addEventListener('click', () => {
      this.loadDevices();
    });
    
    document.getElementById('refresh-logs')?.addEventListener('click', () => {
      this.loadSystemLogs();
    });
    
    // Voice control
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('mousedown', () => this.startVoiceRecording());
      voiceBtn.addEventListener('mouseup', () => this.stopVoiceRecording());
      voiceBtn.addEventListener('mouseleave', () => this.stopVoiceRecording());
    }
    
    // Text command
    document.getElementById('send-command')?.addEventListener('click', () => {
      this.sendTextCommand();
    });
    
    document.getElementById('text-command')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendTextCommand();
      }
    });
    
    // Command suggestions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const command = btn.dataset.command;
        document.getElementById('text-command').value = command;
        this.sendTextCommand();
      });
    });
    
    // Time range selector
    document.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-range]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateEnergyChart(btn.dataset.range);
      });
    });
    
    // Log controls
    document.getElementById('clear-logs')?.addEventListener('click', () => {
      this.clearLogs();
    });
    
    document.getElementById('log-level-filter')?.addEventListener('change', (e) => {
      this.filterLogs(e.target.value);
    });
  }

  initializeCharts() {
    // Energy usage chart (24h)
    const energyCtx = document.getElementById('energy-chart');
    if (energyCtx) {
      this.charts.energy = new Chart(energyCtx, {
        type: 'line',
        data: {
          labels: this.generateTimeLabels(24),
          datasets: [{
            label: 'Energy Usage (W)',
            data: this.generateSampleData(24),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f1f5f9'
              }
            },
            x: {
              grid: {
                color: '#f1f5f9'
              }
            }
          }
        }
      });
    }
    
    // Device activity chart
    const deviceCtx = document.getElementById('device-chart');
    if (deviceCtx) {
      this.charts.device = new Chart(deviceCtx, {
        type: 'doughnut',
        data: {
          labels: ['Online', 'Offline', 'Standby'],
          datasets: [{
            data: [8, 2, 3],
            backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
    
    // Detailed energy chart
    const detailedEnergyCtx = document.getElementById('detailed-energy-chart');
    if (detailedEnergyCtx) {
      this.charts.detailedEnergy = new Chart(detailedEnergyCtx, {
        type: 'line',
        data: {
          labels: this.generateTimeLabels(24),
          datasets: [
            {
              label: 'Total Usage',
              data: this.generateSampleData(24),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Optimized Usage',
              data: this.generateSampleData(24, 0.8),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.4,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f1f5f9'
              }
            },
            x: {
              grid: {
                color: '#f1f5f9'
              }
            }
          }
        }
      });
    }
  }

  async loadInitialData() {
    try {
      // Load system status
      const statusResponse = await fetch('/api/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        this.updateSystemStatus(status);
      }
      
      // Load devices
      await this.loadDevices();
      
      // Load energy overview
      await this.loadEnergyOverview();
      
      // Load system logs
      await this.loadSystemLogs();
      
      // Update last updated time
      this.updateLastUpdatedTime();
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  async loadDevices() {
    try {
      const response = await fetch('/api/devices');
      if (response.ok) {
        this.devices = await response.json();
        this.renderDevices();
        this.updateDeviceMetrics();
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      this.showToast('Failed to load devices', 'error');
    }
  }

  async loadEnergyOverview() {
    try {
      const response = await fetch('/api/energy/overview');
      if (response.ok) {
        const data = await response.json();
        this.updateEnergyMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load energy overview:', error);
    }
  }

  async loadSystemLogs() {
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const logs = await response.json();
        this.renderSystemLogs(logs);
      }
    } catch (error) {
      console.error('Failed to load system logs:', error);
    }
  }

  updateSystemStatus(status) {
    // Update status indicators
    const aiStatus = document.getElementById('ai-status');
    const t5Status = document.getElementById('t5-status');
    const tuyaStatus = document.getElementById('tuya-status');
    
    if (aiStatus) {
      const dot = aiStatus.querySelector('.status-dot');
      dot.className = `status-dot ${status.aiAgent?.isInitialized ? 'online' : 'offline'}`;
    }
    
    if (t5Status) {
      const dot = t5Status.querySelector('.status-dot');
      dot.className = `status-dot ${status.t5AICore ? 'online' : 'offline'}`;
    }
    
    if (tuyaStatus) {
      const dot = tuyaStatus.querySelector('.status-dot');
      dot.className = `status-dot ${status.tuyaIntegration ? 'online' : 'offline'}`;
    }
    
    // Update AI confidence if available
    if (status.aiAgent?.confidence !== undefined) {
      const confidenceEl = document.getElementById('ai-confidence');
      if (confidenceEl) {
        confidenceEl.textContent = `${Math.round(status.aiAgent.confidence * 100)}%`;
      }
    }
  }

  updateEnergyData(data) {
    this.energyData.push({
      timestamp: new Date(data.timestamp),
      consumption: data.estimatedConsumption,
      devices: data.totalDevices,
      onlineDevices: data.onlineDevices
    });
    
    // Keep only last 100 data points
    if (this.energyData.length > 100) {
      this.energyData.shift();
    }
    
    this.updateEnergyMetrics(data);
    this.updateEnergyCharts();
  }

  updateEnergyMetrics(data) {
    const totalConsumption = document.getElementById('total-consumption');
    const currentUsage = document.getElementById('current-usage');
    
    if (totalConsumption && data.estimatedConsumption !== undefined) {
      totalConsumption.textContent = `${data.estimatedConsumption}`;
    }
    
    if (currentUsage && data.estimatedConsumption !== undefined) {
      currentUsage.textContent = `${data.estimatedConsumption} W`;
    }
  }

  updateDeviceMetrics() {
    const totalDevicesEl = document.getElementById('total-devices');
    const onlineDevicesEl = document.getElementById('online-devices');
    
    if (totalDevicesEl) {
      totalDevicesEl.textContent = this.devices.length;
    }
    
    if (onlineDevicesEl) {
      const onlineCount = this.devices.filter(d => d.currentStatus?.isOnline).length;
      onlineDevicesEl.textContent = onlineCount;
    }
    
    // Update device chart
    if (this.charts.device) {
      const online = this.devices.filter(d => d.currentStatus?.isOnline && d.currentStatus?.powerState === 'on').length;
      const offline = this.devices.filter(d => !d.currentStatus?.isOnline).length;
      const standby = this.devices.length - online - offline;
      
      this.charts.device.data.datasets[0].data = [online, offline, standby];
      this.charts.device.update();
    }
  }

  renderDevices() {
    const devicesGrid = document.getElementById('devices-grid');
    if (!devicesGrid) return;
    
    devicesGrid.innerHTML = '';
    
    this.devices.forEach(device => {
      const deviceCard = this.createDeviceCard(device);
      devicesGrid.appendChild(deviceCard);
    });
  }

  createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.innerHTML = `
      <div class="device-header">
        <div class="device-info">
          <h4>${device.name || device.id}</h4>
          <p>${device.type || 'Unknown Type'}</p>
        </div>
        <div class="device-status">
          <div class="status-dot ${device.currentStatus?.isOnline ? 'online' : 'offline'}"></div>
          <span>${device.currentStatus?.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      <div class="device-controls">
        ${this.createDeviceControls(device)}
      </div>
    `;
    
    return card;
  }

  createDeviceControls(device) {
    const controls = [];
    
    if (device.currentStatus?.isOnline) {
      if (device.type === 'light' || device.type === 'outlet') {
        const isOn = device.currentStatus?.powerState === 'on';
        controls.push(`
          <button class="btn ${isOn ? 'btn-danger' : 'btn-success'}" 
                  onclick="dashboard.controlDevice('${device.id}', 'power', ${!isOn})">
            <i class="fas fa-power-off"></i>
            ${isOn ? 'Turn Off' : 'Turn On'}
          </button>
        `);
      }
      
      if (device.type === 'thermostat') {
        controls.push(`
          <button class="btn btn-primary" 
                  onclick="dashboard.controlDevice('${device.id}', 'temperature', 72)">
            <i class="fas fa-thermometer-half"></i>
            Set 72°F
          </button>
        `);
      }
    }
    
    controls.push(`
      <button class="btn" onclick="dashboard.refreshDevice('${device.id}')">
        <i class="fas fa-sync-alt"></i>
        Refresh
      </button>
    `);
    
    return controls.join('');
  }

  async controlDevice(deviceId, action, value) {
    try {
      const command = { [action]: value };
      const response = await fetch(`/api/devices/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      });
      
      if (response.ok) {
        this.showToast('Device command sent successfully', 'success');
        // Refresh device status after a short delay
        setTimeout(() => this.loadDevices(), 1000);
      } else {
        throw new Error('Failed to control device');
      }
    } catch (error) {
      console.error('Device control error:', error);
      this.showToast('Failed to control device', 'error');
    }
  }

  async refreshDevice(deviceId) {
    try {
      const response = await fetch(`/api/devices/${deviceId}/status`);
      if (response.ok) {
        const status = await response.json();
        // Update device in local array
        const deviceIndex = this.devices.findIndex(d => d.id === deviceId);
        if (deviceIndex !== -1) {
          this.devices[deviceIndex].currentStatus = status;
          this.renderDevices();
        }
        this.showToast('Device status refreshed', 'success');
      }
    } catch (error) {
      console.error('Failed to refresh device:', error);
      this.showToast('Failed to refresh device', 'error');
    }
  }

  handleDeviceUpdate(data) {
    console.log('Device update received:', data);
    // Refresh devices to get latest status
    setTimeout(() => this.loadDevices(), 500);
  }

  startVoiceRecording() {
    if (this.isVoiceRecording) return;
    
    this.isVoiceRecording = true;
    const voiceBtn = document.getElementById('voice-btn');
    const voiceStatus = document.getElementById('voice-status');
    
    if (voiceBtn) {
      voiceBtn.classList.add('active');
      voiceBtn.innerHTML = '<i class="fas fa-stop"></i><span>Recording...</span>';
    }
    
    if (voiceStatus) {
      voiceStatus.innerHTML = '<i class="fas fa-microphone"></i><span>Listening...</span>';
    }
    
    // In a real implementation, you would start speech recognition here
    console.log('Voice recording started');
  }

  stopVoiceRecording() {
    if (!this.isVoiceRecording) return;
    
    this.isVoiceRecording = false;
    const voiceBtn = document.getElementById('voice-btn');
    const voiceStatus = document.getElementById('voice-status');
    
    if (voiceBtn) {
      voiceBtn.classList.remove('active');
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i><span>Hold to Speak</span>';
    }
    
    if (voiceStatus) {
      voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Voice recognition ready</span>';
    }
    
    // Simulate voice command processing
    const sampleCommands = [
      'Turn on living room lights',
      'Set thermostat to 72 degrees',
      'Show energy usage',
      'Turn off all devices'
    ];
    
    const randomCommand = sampleCommands[Math.floor(Math.random() * sampleCommands.length)];
    this.processVoiceCommand(randomCommand);
  }

  async sendTextCommand() {
    const input = document.getElementById('text-command');
    const command = input.value.trim();
    
    if (!command) return;
    
    input.value = '';
    await this.processVoiceCommand(command);
  }

  async processVoiceCommand(command) {
    try {
      const response = await fetch('/api/voice/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.handleVoiceCommandResult({ command, result });
      } else {
        throw new Error('Failed to process voice command');
      }
    } catch (error) {
      console.error('Voice command error:', error);
      this.showToast('Failed to process voice command', 'error');
    }
  }

  handleVoiceCommandResult(data) {
    console.log('Voice command result:', data);
    this.addVoiceCommandToHistory(data);
    
    if (data.result?.success) {
      this.showToast('Voice command executed successfully', 'success');
    } else {
      this.showToast('Voice command failed', 'error');
    }
  }

  addVoiceCommandToHistory(activity) {
    this.voiceCommandHistory.unshift({
      command: activity.command,
      result: activity.result,
      timestamp: new Date(activity.timestamp || Date.now())
    });
    
    // Keep only last 20 commands
    if (this.voiceCommandHistory.length > 20) {
      this.voiceCommandHistory.pop();
    }
    
    this.renderVoiceHistory();
    
    // Update voice commands count
    const voiceCommandsToday = document.getElementById('voice-commands-today');
    if (voiceCommandsToday) {
      voiceCommandsToday.textContent = this.voiceCommandHistory.length;
    }
  }

  renderVoiceHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    this.voiceCommandHistory.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div>
          <div class="command-text">${item.command}</div>
          <div class="command-result">${item.result?.message || 'Processed'}</div>
        </div>
        <div class="command-time">${this.formatTime(item.timestamp)}</div>
      `;
      historyList.appendChild(historyItem);
    });
  }

  renderSystemLogs(logs) {
    const logsContainer = document.getElementById('logs-container');
    if (!logsContainer) return;
    
    logsContainer.innerHTML = '';
    
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.innerHTML = `
        <div class="log-timestamp">${this.formatTime(new Date(log.timestamp))}</div>
        <div class="log-level ${log.level}">${log.level.toUpperCase()}</div>
        <div class="log-message">${log.message}</div>
      `;
      logsContainer.appendChild(logEntry);
    });
  }

  switchSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    this.currentSection = section;
    
    // Load section-specific data
    if (section === 'devices') {
      this.loadDevices();
    } else if (section === 'logs') {
      this.loadSystemLogs();
    }
  }

  updateEnergyChart(range) {
    // Update detailed energy chart based on time range
    if (this.charts.detailedEnergy) {
      let hours;
      switch (range) {
        case '1h': hours = 1; break;
        case '24h': hours = 24; break;
        case '7d': hours = 24 * 7; break;
        case '30d': hours = 24 * 30; break;
        default: hours = 24;
      }
      
      this.charts.detailedEnergy.data.labels = this.generateTimeLabels(hours);
      this.charts.detailedEnergy.data.datasets[0].data = this.generateSampleData(hours);
      this.charts.detailedEnergy.data.datasets[1].data = this.generateSampleData(hours, 0.8);
      this.charts.detailedEnergy.update();
    }
  }

  updateEnergyCharts() {
    // Update charts with real energy data
    if (this.energyData.length > 0 && this.charts.energy) {
      const labels = this.energyData.map(d => this.formatTime(d.timestamp));
      const data = this.energyData.map(d => d.consumption);
      
      this.charts.energy.data.labels = labels;
      this.charts.energy.data.datasets[0].data = data;
      this.charts.energy.update();
    }
  }

  clearLogs() {
    const logsContainer = document.getElementById('logs-container');
    if (logsContainer) {
      logsContainer.innerHTML = '<div class="log-entry"><div class="log-message">Logs cleared</div></div>';
    }
  }

  filterLogs(level) {
    const logEntries = document.querySelectorAll('.log-entry');
    logEntries.forEach(entry => {
      const logLevel = entry.querySelector('.log-level');
      if (level === 'all' || (logLevel && logLevel.textContent.toLowerCase() === level)) {
        entry.style.display = 'flex';
      } else {
        entry.style.display = 'none';
      }
    });
  }

  updateLastUpdatedTime() {
    const lastUpdatedEl = document.getElementById('last-updated-time');
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = this.formatTime(new Date());
    }
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon based on type
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    toast.className = `toast ${type}`;
    toastIcon.className = `toast-icon ${icons[type]}`;
    toastMessage.textContent = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  generateTimeLabels(hours) {
    const labels = [];
    const now = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(this.formatTime(time));
    }
    
    return labels;
  }

  generateSampleData(points, multiplier = 1) {
    const data = [];
    for (let i = 0; i < points; i++) {
      // Generate realistic energy usage pattern
      const baseUsage = 500 + Math.sin(i * 0.5) * 200; // Daily pattern
      const randomVariation = (Math.random() - 0.5) * 100;
      data.push(Math.max(0, (baseUsage + randomVariation) * multiplier));
    }
    return data;
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new SmartEnergyDashboard();
});

// Make controlDevice and refreshDevice available globally for onclick handlers
window.controlDevice = (deviceId, action, value) => {
  if (window.dashboard) {
    window.dashboard.controlDevice(deviceId, action, value);
  }
};

window.refreshDevice = (deviceId) => {
  if (window.dashboard) {
    window.dashboard.refreshDevice(deviceId);
  }
};