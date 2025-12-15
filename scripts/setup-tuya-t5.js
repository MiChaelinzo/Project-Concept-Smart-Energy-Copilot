#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Tuya + T5 AI Core Integration...\n');

// Check if running on Raspberry Pi
function checkRaspberryPi() {
  try {
    const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
    return cpuInfo.includes('Raspberry Pi');
  } catch (error) {
    return false;
  }
}

// Check T5 AI Core connection
function checkT5Connection() {
  console.log('📡 Checking T5 AI Core connection...');
  
  try {
    const usbDevices = execSync('lsusb', { encoding: 'utf8' });
    console.log('USB Devices found:');
    console.log(usbDevices);
    
    // Check for common T5 AI Core identifiers
    if (usbDevices.includes('T5') || usbDevices.includes('AI') || usbDevices.includes('Neural')) {
      console.log('✅ T5 AI Core detected via USB');
      return true;
    } else {
      console.log('⚠️  T5 AI Core not detected. Please check connection.');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to check USB devices:', error.message);
    return false;
  }
}

// Install system dependencies
function installSystemDependencies() {
  console.log('📦 Installing system dependencies...');
  
  if (checkRaspberryPi()) {
    try {
      // Install required system packages for Raspberry Pi
      execSync('sudo apt update', { stdio: 'inherit' });
      execSync('sudo apt install -y build-essential python3-dev libudev-dev', { stdio: 'inherit' });
      console.log('✅ System dependencies installed');
    } catch (error) {
      console.log('⚠️  Failed to install system dependencies:', error.message);
    }
  }
}

// Install Node.js dependencies
function installNodeDependencies() {
  console.log('📦 Installing Node.js dependencies...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Node.js dependencies installed');
  } catch (error) {
    console.log('❌ Failed to install Node.js dependencies:', error.message);
    process.exit(1);
  }
}

// Setup Tuya configuration
function setupTuyaConfig() {
  console.log('⚙️  Setting up Tuya configuration...');
  
  const configPath = path.join(__dirname, '..', 'config', 'tuya-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ Tuya config file not found. Please create config/tuya-config.json');
    console.log('📋 Required Tuya Developer Platform setup:');
    console.log('   1. Go to https://developer.tuya.com/');
    console.log('   2. Create a new project');
    console.log('   3. Get your Client ID and Client Secret');
    console.log('   4. Update config/tuya-config.json with your credentials');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (config.tuya.clientId === 'YOUR_TUYA_CLIENT_ID') {
      console.log('⚠️  Please update Tuya credentials in config/tuya-config.json');
      return false;
    }
    
    console.log('✅ Tuya configuration found');
    return true;
  } catch (error) {
    console.log('❌ Invalid Tuya configuration:', error.message);
    return false;
  }
}

// Test T5 AI Core communication
function testT5Communication() {
  console.log('🧪 Testing T5 AI Core communication...');
  
  try {
    // Check if device files exist
    const deviceFiles = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyACM0', '/dev/ttyACM1'];
    let deviceFound = false;
    
    for (const deviceFile of deviceFiles) {
      if (fs.existsSync(deviceFile)) {
        console.log(`✅ Found device: ${deviceFile}`);
        deviceFound = true;
        
        // Update config with correct device path
        const configPath = path.join(__dirname, '..', 'config', 'tuya-config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          config.t5AICore.devicePath = deviceFile;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(`📝 Updated T5 device path to: ${deviceFile}`);
        }
        break;
      }
    }
    
    if (!deviceFound) {
      console.log('⚠️  No T5 device files found. Please check connection and permissions.');
      console.log('💡 Try: sudo chmod 666 /dev/ttyUSB* /dev/ttyACM*');
    }
    
    return deviceFound;
  } catch (error) {
    console.log('❌ T5 communication test failed:', error.message);
    return false;
  }
}

// Build the project
function buildProject() {
  console.log('🔨 Building project...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Project built successfully');
    return true;
  } catch (error) {
    console.log('❌ Build failed:', error.message);
    return false;
  }
}

// Run integration test
function runIntegrationTest() {
  console.log('🧪 Running integration test...');
  
  try {
    // Create a simple test script
    const testScript = `
const { AIAgentTuyaIntegrationImpl } = require('./dist/desktop/implementations/AIAgentTuyaIntegrationImpl');
const config = require('./config/tuya-config.json');

async function testIntegration() {
  console.log('Testing AI Agent Tuya Integration...');
  
  try {
    const aiAgent = new AIAgentTuyaIntegrationImpl(
      null, // AI Chatbot (would be initialized separately)
      config.tuya,
      config.t5AICore
    );
    
    console.log('✅ AI Agent created successfully');
    console.log('Status:', aiAgent.getStatus());
    
  } catch (error) {
    console.log('❌ Integration test failed:', error.message);
  }
}

testIntegration();
    `;
    
    fs.writeFileSync('test-integration.js', testScript);
    execSync('node test-integration.js', { stdio: 'inherit' });
    fs.unlinkSync('test-integration.js');
    
    console.log('✅ Integration test completed');
    return true;
  } catch (error) {
    console.log('⚠️  Integration test had issues:', error.message);
    return false;
  }
}

// Main setup function
async function main() {
  console.log('🏠 Smart Energy Copilot - Tuya + T5 AI Core Setup');
  console.log('================================================\n');
  
  // Check environment
  if (checkRaspberryPi()) {
    console.log('✅ Running on Raspberry Pi');
  } else {
    console.log('⚠️  Not running on Raspberry Pi - some features may not work');
  }
  
  // Setup steps
  const steps = [
    { name: 'Install System Dependencies', fn: installSystemDependencies },
    { name: 'Install Node.js Dependencies', fn: installNodeDependencies },
    { name: 'Check T5 AI Core Connection', fn: checkT5Connection },
    { name: 'Setup Tuya Configuration', fn: setupTuyaConfig },
    { name: 'Test T5 Communication', fn: testT5Communication },
    { name: 'Build Project', fn: buildProject },
    { name: 'Run Integration Test', fn: runIntegrationTest }
  ];
  
  let successCount = 0;
  
  for (const step of steps) {
    console.log(`\n🔄 ${step.name}...`);
    if (step.fn()) {
      successCount++;
    }
  }
  
  console.log('\n📊 Setup Summary:');
  console.log(`✅ ${successCount}/${steps.length} steps completed successfully`);
  
  if (successCount === steps.length) {
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Update Tuya credentials in config/tuya-config.json');
    console.log('   2. Run: npm run desktop:start');
    console.log('   3. Test voice commands: "Hey Energy, turn on living room light"');
  } else {
    console.log('\n⚠️  Setup completed with some issues. Please check the logs above.');
  }
}

// Run setup
main().catch(console.error);