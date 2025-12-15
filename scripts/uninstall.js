#!/usr/bin/env node

/**
 * AI Chatbot Desktop Uninstallation Script
 * Cross-platform uninstaller for the AI Chatbot Desktop system
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

class Uninstaller {
  constructor() {
    this.platform = os.platform();
    this.homeDir = os.homedir();
    this.installDir = path.join(this.homeDir, '.ai-chatbot-desktop');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log('🗑️  AI Chatbot Desktop Uninstaller');
    console.log('==================================');
    console.log(`Platform: ${this.platform}`);
    console.log(`Install Directory: ${this.installDir}`);
    console.log('');

    try {
      // Check if installation exists
      const exists = await this.checkInstallation();
      if (!exists) {
        console.log('❌ AI Chatbot Desktop is not installed or installation directory not found.');
        process.exit(0);
      }

      // Confirm uninstallation
      const confirmed = await this.confirmUninstallation();
      if (!confirmed) {
        console.log('Uninstallation cancelled.');
        process.exit(0);
      }

      await this.stopService();
      await this.removeService();
      await this.removeShortcuts();
      await this.backupUserData();
      await this.removeInstallation();
      
      console.log('✅ Uninstallation completed successfully!');
      console.log('');
      console.log('Your user data has been backed up to:');
      console.log(`${this.installDir}-backup-${Date.now()}`);
      
    } catch (error) {
      console.error('❌ Uninstallation failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async checkInstallation() {
    try {
      await fs.access(this.installDir);
      return true;
    } catch (error) {
      return false;
    }
  }

  async confirmUninstallation() {
    return new Promise((resolve) => {
      this.rl.question('Are you sure you want to uninstall AI Chatbot Desktop? (y/N): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async stopService() {
    console.log('🛑 Stopping service...');
    
    try {
      if (this.platform === 'win32') {
        await this.stopWindowsService();
      } else if (this.platform === 'darwin') {
        await this.stopMacService();
      } else if (this.platform === 'linux') {
        await this.stopLinuxService();
      }
      console.log('✓ Service stopped');
    } catch (error) {
      console.warn('⚠️  Could not stop service:', error.message);
    }
  }

  async stopWindowsService() {
    try {
      await execAsync('sc stop AIChatbotDesktop');
    } catch (error) {
      // Service might not be installed or already stopped
    }
  }

  async stopMacService() {
    try {
      await execAsync('launchctl unload ~/Library/LaunchAgents/com.aichatbot.desktop.plist');
    } catch (error) {
      // Service might not be installed or already stopped
    }
  }

  async stopLinuxService() {
    try {
      await execAsync('sudo systemctl stop ai-chatbot-desktop.service');
    } catch (error) {
      // Service might not be installed or already stopped
    }
  }

  async removeService() {
    console.log('🔧 Removing service...');
    
    try {
      if (this.platform === 'win32') {
        await this.removeWindowsService();
      } else if (this.platform === 'darwin') {
        await this.removeMacService();
      } else if (this.platform === 'linux') {
        await this.removeLinuxService();
      }
      console.log('✓ Service removed');
    } catch (error) {
      console.warn('⚠️  Could not remove service:', error.message);
    }
  }

  async removeWindowsService() {
    try {
      await execAsync('sc delete AIChatbotDesktop');
    } catch (error) {
      // Service might not be installed
    }
  }

  async removeMacService() {
    try {
      const plistPath = path.join(this.homeDir, 'Library/LaunchAgents/com.aichatbot.desktop.plist');
      await fs.unlink(plistPath);
    } catch (error) {
      // Plist might not exist
    }
  }

  async removeLinuxService() {
    try {
      await execAsync('sudo systemctl disable ai-chatbot-desktop.service');
      await execAsync('sudo rm -f /etc/systemd/system/ai-chatbot-desktop.service');
      await execAsync('sudo systemctl daemon-reload');
    } catch (error) {
      // Service might not be installed
    }
  }

  async removeShortcuts() {
    console.log('🔗 Removing shortcuts...');
    
    try {
      if (this.platform === 'linux') {
        // Remove desktop entry from user applications
        const desktopPath = path.join(this.homeDir, '.local/share/applications/ai-chatbot-desktop.desktop');
        try {
          await fs.unlink(desktopPath);
        } catch (error) {
          // Desktop entry might not exist
        }
      }
      
      console.log('✓ Shortcuts removed');
    } catch (error) {
      console.warn('⚠️  Could not remove all shortcuts:', error.message);
    }
  }

  async backupUserData() {
    console.log('💾 Backing up user data...');
    
    const backupDir = `${this.installDir}-backup-${Date.now()}`;
    
    try {
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });
      
      // Backup configuration files
      const configDir = path.join(this.installDir, 'config');
      const backupConfigDir = path.join(backupDir, 'config');
      
      try {
        await this.copyDirectory(configDir, backupConfigDir);
      } catch (error) {
        // Config directory might not exist
      }
      
      // Backup user data
      const dataDir = path.join(this.installDir, 'data');
      const backupDataDir = path.join(backupDir, 'data');
      
      try {
        await this.copyDirectory(dataDir, backupDataDir);
      } catch (error) {
        // Data directory might not exist
      }
      
      // Backup logs (last 7 days only)
      const logsDir = path.join(this.installDir, 'logs');
      const backupLogsDir = path.join(backupDir, 'logs');
      
      try {
        await this.copyRecentLogs(logsDir, backupLogsDir);
      } catch (error) {
        // Logs directory might not exist
      }
      
      // Create backup info file
      const backupInfo = {
        timestamp: new Date().toISOString(),
        platform: this.platform,
        originalInstallDir: this.installDir,
        version: '1.0.0'
      };
      
      await fs.writeFile(
        path.join(backupDir, 'backup-info.json'),
        JSON.stringify(backupInfo, null, 2)
      );
      
      console.log('✓ User data backed up');
    } catch (error) {
      console.warn('⚠️  Could not backup user data:', error.message);
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

  async copyRecentLogs(source, target) {
    await fs.mkdir(target, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const sourcePath = path.join(source, entry.name);
        const stats = await fs.stat(sourcePath);
        
        if (stats.mtime > cutoffDate) {
          const targetPath = path.join(target, entry.name);
          await fs.copyFile(sourcePath, targetPath);
        }
      }
    }
  }

  async removeInstallation() {
    console.log('🗂️  Removing installation files...');
    
    try {
      await fs.rm(this.installDir, { recursive: true, force: true });
      console.log('✓ Installation files removed');
    } catch (error) {
      throw new Error(`Failed to remove installation directory: ${error.message}`);
    }
  }
}

// Run uninstaller if called directly
if (require.main === module) {
  const uninstaller = new Uninstaller();
  uninstaller.run().catch(error => {
    console.error('Uninstallation failed:', error);
    process.exit(1);
  });
}

module.exports = Uninstaller;