#!/usr/bin/env node

/**
 * Smart Energy Copilot Web Dashboard Launcher
 * Starts the web dashboard server with proper configuration
 */

import { DashboardServer } from './server';
import * as fs from 'fs';
import * as path from 'path';

interface DashboardConfig {
  port: number;
  enableAIAgent: boolean;
  aiChatbot: {
    model: string;
    apiKey?: string;
    maxTokens: number;
    temperature: number;
  };
  tuya: {
    accessId: string;
    accessSecret: string;
    endpoint: string;
    uid?: string;
  };
  t5AICore: {
    serialPort: string;
    baudRate: number;
    timeout: number;
  };
}

async function loadConfig(): Promise<DashboardConfig> {
  const configPath = path.join(process.cwd(), 'config', 'tuya-config.json');
  
  let config: Partial<DashboardConfig> = {
    port: 3000,
    enableAIAgent: true,
    aiChatbot: {
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.7
    }
  };

  // Load Tuya configuration if available
  if (fs.existsSync(configPath)) {
    try {
      const tuyaConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.tuya = tuyaConfig;
      console.log('✅ Loaded Tuya configuration');
    } catch (error) {
      console.warn('⚠️  Failed to load Tuya configuration:', error);
    }
  } else {
    console.warn('⚠️  Tuya configuration not found. Some features may be limited.');
    console.log('   Create config/tuya-config.json with your Tuya credentials.');
  }

  // Auto-detect T5 AI Core (common USB-C serial ports on Raspberry Pi)
  const possiblePorts = [
    '/dev/ttyUSB0',
    '/dev/ttyUSB1', 
    '/dev/ttyACM0',
    '/dev/ttyACM1',
    'COM3',
    'COM4',
    'COM5'
  ];

  for (const port of possiblePorts) {
    if (fs.existsSync(port) || process.platform === 'win32') {
      config.t5AICore = {
        serialPort: port,
        baudRate: 115200,
        timeout: 5000
      };
      console.log(`✅ Detected T5 AI Core on ${port}`);
      break;
    }
  }

  if (!config.t5AICore) {
    console.warn('⚠️  T5 AI Core not detected. Voice features may be limited.');
    config.t5AICore = {
      serialPort: '/dev/ttyUSB0', // Default fallback
      baudRate: 115200,
      timeout: 5000
    };
  }

  return config as DashboardConfig;
}

async function startDashboard() {
  console.log('🚀 Starting Smart Energy Copilot Web Dashboard...');
  console.log('');

  try {
    // Load configuration
    const config = await loadConfig();
    
    // Check for development mode
    const isDev = process.argv.includes('--dev');
    if (isDev) {
      console.log('🔧 Running in development mode');
      config.port = 3001; // Use different port for dev
    }

    // Create and initialize dashboard server
    const dashboard = new DashboardServer(config.port);
    
    console.log('⚙️  Initializing dashboard components...');
    await dashboard.initialize(config);
    
    console.log('🌐 Starting web server...');
    await dashboard.start();
    
    console.log('');
    console.log('🎉 Smart Energy Copilot Dashboard is ready!');
    console.log('');
    console.log(`📱 Web Interface: http://localhost:${config.port}`);
    console.log(`🔗 API Endpoint: http://localhost:${config.port}/api`);
    console.log('');
    console.log('Features available:');
    console.log(`   ${config.tuya ? '✅' : '❌'} Tuya IoT Device Control`);
    console.log(`   ${config.t5AICore ? '✅' : '❌'} T5 AI Core Voice Processing`);
    console.log(`   ${config.enableAIAgent ? '✅' : '❌'} AI Agent Integration`);
    console.log('   ✅ Real-time Energy Monitoring');
    console.log('   ✅ Voice Command Interface');
    console.log('   ✅ System Health Dashboard');
    console.log('');
    console.log('Press Ctrl+C to stop the dashboard');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down dashboard...');
      await dashboard.stop();
      console.log('✅ Dashboard stopped successfully');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down dashboard...');
      await dashboard.stop();
      console.log('✅ Dashboard stopped successfully');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start dashboard:', error);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure all dependencies are installed: npm install');
    console.log('2. Check if port 3000 is available');
    console.log('3. Verify Tuya configuration in config/tuya-config.json');
    console.log('4. Ensure T5 AI Core is connected via USB-C');
    console.log('');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Smart Energy Copilot Web Dashboard');
  console.log('');
  console.log('Usage:');
  console.log('  npm run web          Start dashboard in production mode');
  console.log('  npm run web:dev      Start dashboard in development mode');
  console.log('  node start-dashboard.js --help    Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --dev                Enable development mode (port 3001)');
  console.log('  --help, -h           Show this help message');
  console.log('');
  process.exit(0);
}

// Start the dashboard
startDashboard().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});