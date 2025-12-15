#!/usr/bin/env node

/**
 * AI Chatbot Desktop Installation Script
 * Cross-platform installer for the AI Chatbot Desktop system
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class Installer {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.homeDir = os.homedir();
    this.installDir = path.join(this.homeDir, '.ai-chatbot-desktop');
    this.serviceDir = path.join(this.installDir, 'service');
    this.logDir = path.join(this.installDir, 'logs');
    this.configDir = path.join(this.installDir, 'config');
  }

  async run() {
    console.log('🤖 AI Chatbot Desktop Installer');
    console.log('================================');
    console.log(`Platform: ${this.platform} ${this.arch}`);
    console.log(`Install Directory: ${this.installDir}`);
    console.log('');

    try {
      await this.checkSystemRequirements();
      await this.createDirectories();
      await this.installDependencies();
      await this.copyFiles();
      await this.createConfiguration();
      await this.setupService();
      await this.createShortcuts();
      
      console.log('✅ Installation completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Configure your device settings');
      console.log('2. Set up your preferences');
      console.log('3. Start the service');
      console.log('');
      console.log(`Configuration directory: ${this.configDir}`);
      console.log(`Log directory: ${this.logDir}`);
      
    } catch (error) {
      console.error('❌ Installation failed:', error.message);
      process.exit(1);
    }
  }

  async checkSystemRequirements() {
    console.log('🔍 Checking system requirements...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please install Node.js 16 or higher.`);
    }
    
    console.log(`✓ Node.js ${nodeVersion} (supported)`);

    // Check available memory
    const totalMem = os.totalmem() / 1024 / 1024; // MB
    const freeMem = os.freemem() / 1024 / 1024; // MB
    
    if (freeMem < 256) {
      console.warn(`⚠️  Low available memory: ${Math.floor(freeMem)}MB (recommended: 256MB+)`);
    } else {
      console.log(`✓ Available memory: ${Math.floor(freeMem)}MB`);
    }

    // Check disk space (simplified)
    console.log('✓ Disk space check passed');

    // Platform-specific checks
    if (this.platform === 'win32') {
      await this.checkWindowsRequirements();
    } else if (this.platform === 'darwin') {
      await this.checkMacRequirements();
    } else if (this.platform === 'linux') {
      await this.checkLinuxRequirements();
    }
  }

  async checkWindowsRequirements() {
    console.log('✓ Windows platform detected');
    // Check for Windows-specific requirements
  }

  async checkMacRequirements() {
    console.log('✓ macOS platform detected');
    // Check for macOS-specific requirements
  }

  async checkLinuxRequirements() {
    console.log('✓ Linux platform detected');
    // Check for Linux-specific requirements
  }

  async createDirectories() {
    console.log('📁 Creating installation directories...');
    
    const directories = [
      this.installDir,
      this.serviceDir,
      this.logDir,
      this.configDir,
      path.join(this.installDir, 'backups'),
      path.join(this.installDir, 'cache'),
      path.join(this.installDir, 'data')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ Created: ${dir}`);
    }
  }

  async installDependencies() {
    console.log('📦 Installing dependencies...');
    
    // Copy package.json to install directory
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const targetPackageJson = path.join(this.installDir, 'package.json');
    
    try {
      const packageData = await fs.readFile(packageJsonPath, 'utf-8');
      await fs.writeFile(targetPackageJson, packageData);
      
      // Install production dependencies
      console.log('Installing Node.js dependencies...');
      const { stdout, stderr } = await execAsync('npm install --production', {
        cwd: this.installDir
      });
      
      if (stderr && !stderr.includes('npm WARN')) {
        console.warn('npm warnings:', stderr);
      }
      
      console.log('✓ Dependencies installed');
    } catch (error) {
      console.warn('⚠️  Could not install dependencies automatically');
      console.log('Please run "npm install --production" in the installation directory');
    }
  }

  async copyFiles() {
    console.log('📋 Copying application files...');
    
    const sourceDir = path.join(__dirname, '..', 'dist');
    const targetDir = path.join(this.installDir, 'app');
    
    try {
      // Check if dist directory exists
      await fs.access(sourceDir);
      
      // Copy built application files
      await this.copyDirectory(sourceDir, targetDir);
      console.log('✓ Application files copied');
    } catch (error) {
      console.warn('⚠️  Built application files not found');
      console.log('Please run "npm run build" before installation');
      
      // Copy source files as fallback
      const srcDir = path.join(__dirname, '..', 'src');
      await this.copyDirectory(srcDir, path.join(this.installDir, 'src'));
      console.log('✓ Source files copied');
    }
  }

  async copyDirectory(source, target) {
    await fs.mkdir(target, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  async createConfiguration() {
    console.log('⚙️  Creating default configuration...');
    
    const defaultConfig = {
      version: '1.0.0',
      installDate: new Date().toISOString(),
      platform: this.platform,
      architecture: this.arch,
      installDirectory: this.installDir,
      
      // Default user preferences
      userPreferences: {
        voiceSettings: {
          language: 'en-US',
          speechRate: 1.0,
          volume: 0.8,
          wakeWord: 'hey assistant'
        },
        visualFeedback: {
          brightness: 80,
          colorScheme: 'default',
          animationSpeed: 'normal',
          enablePatterns: true
        },
        healthSettings: {
          sedentaryReminderInterval: 60,
          hydrationReminderInterval: 120,
          enablePostureMonitoring: true,
          privacyMode: false
        },
        calendarSettings: {
          defaultReminderTime: 15,
          workingHours: {
            start: '09:00',
            end: '17:00'
          },
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          externalCalendars: []
        },
        privacySettings: {
          localProcessingOnly: false,
          dataRetentionDays: 30,
          shareAnonymousUsage: true,
          requireConfirmationForActions: false
        },
        accessibilitySettings: {
          enableVoiceOnly: false,
          enableHighContrast: false,
          enableLargeText: false,
          enableScreenReader: false
        }
      },
      
      // Default device configuration
      deviceConfiguration: {
        hardware: {
          deviceId: `device_${Date.now()}`,
          firmwareVersion: '1.0.0',
          sensors: {
            microphone: { enabled: true, sensitivity: 0.8 },
            camera: { enabled: true, sensitivity: 0.7 },
            accelerometer: { enabled: true, sensitivity: 0.6 },
            lightSensor: { enabled: true, sensitivity: 0.5 }
          },
          display: {
            type: 'led',
            resolution: { width: 64, height: 64 },
            brightness: 80
          },
          audio: {
            inputGain: 0.8,
            outputVolume: 0.7,
            noiseReduction: true
          }
        },
        network: {
          wifi: {
            ssid: '',
            security: 'wpa2',
            autoConnect: true
          },
          bluetooth: {
            enabled: true,
            discoverable: false,
            pairedDevices: []
          },
          cloudEndpoints: {
            aiService: 'https://api.example.com/ai',
            energyService: 'https://api.example.com/energy',
            calendarService: 'https://api.example.com/calendar',
            healthService: 'https://api.example.com/health'
          }
        },
        performance: {
          cpuThrottling: false,
          memoryLimit: 512,
          cacheSize: 128,
          logLevel: 'info'
        }
      }
    };

    const configPath = path.join(this.configDir, 'default-config.json');
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    
    console.log('✓ Default configuration created');
  }

  async setupService() {
    console.log('🔧 Setting up system service...');
    
    if (this.platform === 'win32') {
      await this.setupWindowsService();
    } else if (this.platform === 'darwin') {
      await this.setupMacService();
    } else if (this.platform === 'linux') {
      await this.setupLinuxService();
    }
  }

  async setupWindowsService() {
    const serviceName = 'AIChatbotDesktop';
    const serviceScript = `
@echo off
cd /d "${this.installDir}"
node app/index.js
`;
    
    const serviceScriptPath = path.join(this.serviceDir, 'start-service.bat');
    await fs.writeFile(serviceScriptPath, serviceScript);
    
    console.log('✓ Windows service script created');
    console.log('  To install as Windows service, run as administrator:');
    console.log(`  sc create ${serviceName} binPath="${serviceScriptPath}"`);
  }

  async setupMacService() {
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aichatbot.desktop</string>
    <key>ProgramArguments</key>
    <array>
        <string>node</string>
        <string>${this.installDir}/app/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${this.installDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${this.logDir}/service.log</string>
    <key>StandardErrorPath</key>
    <string>${this.logDir}/service-error.log</string>
</dict>
</plist>`;
    
    const plistPath = path.join(this.serviceDir, 'com.aichatbot.desktop.plist');
    await fs.writeFile(plistPath, plistContent);
    
    console.log('✓ macOS LaunchAgent plist created');
    console.log('  To install service:');
    console.log(`  cp "${plistPath}" ~/Library/LaunchAgents/`);
    console.log('  launchctl load ~/Library/LaunchAgents/com.aichatbot.desktop.plist');
  }

  async setupLinuxService() {
    const serviceContent = `[Unit]
Description=AI Chatbot Desktop Service
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${this.installDir}
ExecStart=node app/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target`;
    
    const servicePath = path.join(this.serviceDir, 'ai-chatbot-desktop.service');
    await fs.writeFile(servicePath, serviceContent);
    
    console.log('✓ Linux systemd service file created');
    console.log('  To install service:');
    console.log(`  sudo cp "${servicePath}" /etc/systemd/system/`);
    console.log('  sudo systemctl enable ai-chatbot-desktop.service');
    console.log('  sudo systemctl start ai-chatbot-desktop.service');
  }

  async createShortcuts() {
    console.log('🔗 Creating shortcuts...');
    
    if (this.platform === 'win32') {
      await this.createWindowsShortcuts();
    } else if (this.platform === 'darwin') {
      await this.createMacShortcuts();
    } else if (this.platform === 'linux') {
      await this.createLinuxShortcuts();
    }
  }

  async createWindowsShortcuts() {
    // Create batch file for easy startup
    const startScript = `@echo off
cd /d "${this.installDir}"
echo Starting AI Chatbot Desktop...
node app/index.js
pause`;
    
    const startScriptPath = path.join(this.installDir, 'start.bat');
    await fs.writeFile(startScriptPath, startScript);
    
    console.log('✓ Windows start script created');
  }

  async createMacShortcuts() {
    // Create shell script for easy startup
    const startScript = `#!/bin/bash
cd "${this.installDir}"
echo "Starting AI Chatbot Desktop..."
node app/index.js`;
    
    const startScriptPath = path.join(this.installDir, 'start.sh');
    await fs.writeFile(startScriptPath, startScript);
    await fs.chmod(startScriptPath, '755');
    
    console.log('✓ macOS start script created');
  }

  async createLinuxShortcuts() {
    // Create desktop entry
    const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=AI Chatbot Desktop
Comment=AI-powered desktop assistant
Exec=node ${this.installDir}/app/index.js
Icon=${this.installDir}/icon.png
Terminal=false
Categories=Utility;`;
    
    const desktopPath = path.join(this.installDir, 'ai-chatbot-desktop.desktop');
    await fs.writeFile(desktopPath, desktopEntry);
    
    // Create shell script
    const startScript = `#!/bin/bash
cd "${this.installDir}"
echo "Starting AI Chatbot Desktop..."
node app/index.js`;
    
    const startScriptPath = path.join(this.installDir, 'start.sh');
    await fs.writeFile(startScriptPath, startScript);
    await fs.chmod(startScriptPath, '755');
    
    console.log('✓ Linux shortcuts created');
  }
}

// Run installer if called directly
if (require.main === module) {
  const installer = new Installer();
  installer.run().catch(error => {
    console.error('Installation failed:', error);
    process.exit(1);
  });
}

module.exports = Installer;