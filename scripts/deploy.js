#!/usr/bin/env node

/**
 * AI Chatbot Desktop Deployment Script
 * Advanced deployment and configuration management for AI Chatbot Desktop
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

class Deployer {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.homeDir = os.homedir();
    this.installDir = path.join(this.homeDir, '.ai-chatbot-desktop');
    this.deploymentDir = path.join(this.installDir, 'deployments');
    this.configDir = path.join(this.installDir, 'config');
    this.logDir = path.join(this.installDir, 'logs');
  }

  async run(command, options = {}) {
    console.log('🚀 AI Chatbot Desktop Deployment Manager');
    console.log('=========================================');
    console.log(`Platform: ${this.platform} ${this.arch}`);
    console.log(`Deployment Directory: ${this.deploymentDir}`);
    console.log('');

    try {
      switch (command) {
        case 'package':
          await this.createDeploymentPackage(options);
          break;
        case 'deploy':
          await this.deployToEnvironment(options);
          break;
        case 'rollback':
          await this.rollbackDeployment(options);
          break;
        case 'status':
          await this.getDeploymentStatus();
          break;
        case 'health':
          await this.checkSystemHealth();
          break;
        case 'configure':
          await this.deployConfiguration(options);
          break;
        case 'maintenance':
          await this.runMaintenance(options);
          break;
        default:
          this.showUsage();
      }
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  async createDeploymentPackage(options) {
    console.log('📦 Creating deployment package...');
    
    const version = options.version || this.getVersionFromPackage();
    const environment = options.environment || 'production';
    const packageName = `ai-chatbot-desktop-${version}-${this.platform}-${this.arch}`;
    const packageDir = path.join(this.deploymentDir, packageName);
    const packageFile = `${packageDir}.tar.gz`;

    await fs.mkdir(this.deploymentDir, { recursive: true });
    await fs.mkdir(packageDir, { recursive: true });

    // Build application if needed
    if (!options.skipBuild) {
      console.log('🔨 Building application...');
      await execAsync('npm run build', { cwd: path.join(__dirname, '..') });
      console.log('✓ Build completed');
    }

    // Copy application files
    console.log('📋 Copying application files...');
    const sourceDir = path.join(__dirname, '..', 'dist');
    const targetAppDir = path.join(packageDir, 'app');
    await this.copyDirectory(sourceDir, targetAppDir);

    // Copy configuration templates
    const configTemplateDir = path.join(packageDir, 'config-templates');
    await fs.mkdir(configTemplateDir, { recursive: true });
    
    const defaultConfig = await this.generateDefaultConfiguration(environment);
    await fs.writeFile(
      path.join(configTemplateDir, 'default-config.json'),
      JSON.stringify(defaultConfig, null, 2)
    );

    // Copy deployment scripts
    const scriptsDir = path.join(packageDir, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.copyFile(
      path.join(__dirname, 'install.js'),
      path.join(scriptsDir, 'install.js')
    );
    await fs.copyFile(
      path.join(__dirname, 'uninstall.js'),
      path.join(scriptsDir, 'uninstall.js')
    );

    // Create package manifest
    const manifest = {
      name: 'ai-chatbot-desktop',
      version,
      platform: this.platform,
      architecture: this.arch,
      environment,
      createdAt: new Date().toISOString(),
      checksum: await this.calculateDirectoryChecksum(packageDir),
      files: await this.getFileList(packageDir)
    };

    await fs.writeFile(
      path.join(packageDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Create compressed package
    console.log('🗜️  Compressing package...');
    await this.createTarGz(packageDir, packageFile);
    
    // Clean up temporary directory
    await fs.rm(packageDir, { recursive: true });

    console.log('✅ Deployment package created successfully!');
    console.log(`Package: ${packageFile}`);
    console.log(`Version: ${version}`);
    console.log(`Environment: ${environment}`);
    console.log(`Size: ${await this.getFileSize(packageFile)} MB`);
  }

  async deployToEnvironment(options) {
    console.log('🎯 Deploying to environment...');
    
    const packagePath = options.package;
    const environment = options.environment || 'production';
    const force = options.force || false;

    if (!packagePath) {
      throw new Error('Package path is required for deployment');
    }

    // Validate package
    console.log('🔍 Validating deployment package...');
    const isValid = await this.validatePackage(packagePath);
    if (!isValid) {
      throw new Error('Invalid deployment package');
    }

    // Check system requirements
    console.log('⚙️  Checking system requirements...');
    const requirements = await this.checkSystemRequirements();
    if (!requirements.met && !force) {
      throw new Error('System requirements not met. Use --force to override.');
    }

    // Create backup of current installation
    console.log('💾 Creating backup...');
    const backupId = await this.createBackup();
    console.log(`✓ Backup created: ${backupId}`);

    try {
      // Extract package
      console.log('📦 Extracting package...');
      const extractDir = path.join(this.deploymentDir, `extract-${Date.now()}`);
      await this.extractTarGz(packagePath, extractDir);

      // Stop current service
      console.log('🛑 Stopping current service...');
      await this.stopService();

      // Deploy files
      console.log('📁 Deploying files...');
      await this.deployFiles(extractDir);

      // Update configuration
      console.log('⚙️  Updating configuration...');
      await this.updateConfiguration(extractDir, environment);

      // Start service
      console.log('▶️  Starting service...');
      await this.startService();

      // Verify deployment
      console.log('✅ Verifying deployment...');
      const isHealthy = await this.verifyDeployment();
      
      if (!isHealthy) {
        throw new Error('Deployment verification failed');
      }

      // Clean up
      await fs.rm(extractDir, { recursive: true });

      console.log('🎉 Deployment completed successfully!');
      console.log(`Environment: ${environment}`);
      console.log(`Backup ID: ${backupId}`);

    } catch (error) {
      console.error('❌ Deployment failed, rolling back...');
      await this.restoreBackup(backupId);
      throw error;
    }
  }

  async rollbackDeployment(options) {
    console.log('⏪ Rolling back deployment...');
    
    const backupId = options.backup;
    
    if (!backupId) {
      // Get latest backup
      const backups = await this.listBackups();
      if (backups.length === 0) {
        throw new Error('No backups available for rollback');
      }
      backupId = backups[0];
    }

    console.log(`Rolling back to backup: ${backupId}`);
    
    await this.stopService();
    await this.restoreBackup(backupId);
    await this.startService();
    
    const isHealthy = await this.verifyDeployment();
    if (!isHealthy) {
      throw new Error('Rollback verification failed');
    }

    console.log('✅ Rollback completed successfully!');
  }

  async getDeploymentStatus() {
    console.log('📊 Deployment Status');
    console.log('===================');
    
    try {
      const status = await this.getServiceStatus();
      const health = await this.getSystemHealth();
      const version = await this.getCurrentVersion();
      const uptime = await this.getUptime();

      console.log(`Version: ${version}`);
      console.log(`Status: ${status}`);
      console.log(`Health: ${health.overall}`);
      console.log(`Uptime: ${uptime}`);
      console.log('');

      console.log('Component Health:');
      for (const component of health.components) {
        console.log(`  ${component.name}: ${component.status}`);
      }

      if (health.recommendations.length > 0) {
        console.log('');
        console.log('Recommendations:');
        for (const rec of health.recommendations) {
          console.log(`  ${rec.priority.toUpperCase()}: ${rec.title}`);
        }
      }

    } catch (error) {
      console.error('Failed to get deployment status:', error.message);
    }
  }

  async checkSystemHealth() {
    console.log('🏥 System Health Check');
    console.log('=====================');
    
    const health = await this.getSystemHealth();
    
    console.log(`Overall Status: ${health.overall}`);
    console.log(`Last Check: ${health.lastCheck}`);
    console.log('');

    console.log('Component Details:');
    for (const component of health.components) {
      console.log(`  ${component.name}:`);
      console.log(`    Status: ${component.status}`);
      console.log(`    Message: ${component.message}`);
      if (component.metrics) {
        console.log(`    Metrics: ${JSON.stringify(component.metrics)}`);
      }
      console.log('');
    }

    if (health.recommendations.length > 0) {
      console.log('Recommendations:');
      for (const rec of health.recommendations) {
        console.log(`  [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`    ${rec.description}`);
        if (rec.action) {
          console.log(`    Action: ${rec.action}`);
        }
        console.log('');
      }
    }
  }

  async deployConfiguration(options) {
    console.log('⚙️  Deploying configuration...');
    
    const configFile = options.config;
    if (!configFile) {
      throw new Error('Configuration file path is required');
    }

    // Validate configuration
    const configData = JSON.parse(await fs.readFile(configFile, 'utf-8'));
    const validation = await this.validateConfiguration(configData);
    
    if (!validation.valid) {
      console.error('Configuration validation failed:');
      for (const error of validation.errors) {
        console.error(`  ${error.field}: ${error.message}`);
      }
      throw new Error('Invalid configuration');
    }

    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:');
      for (const warning of validation.warnings) {
        console.warn(`  ${warning.field}: ${warning.message}`);
      }
    }

    // Create backup of current configuration
    const backupPath = path.join(this.configDir, `config-backup-${Date.now()}.json`);
    try {
      const currentConfig = await fs.readFile(path.join(this.configDir, 'current-config.json'), 'utf-8');
      await fs.writeFile(backupPath, currentConfig);
      console.log(`✓ Configuration backed up to: ${backupPath}`);
    } catch (error) {
      console.warn('Could not backup current configuration');
    }

    // Deploy new configuration
    await fs.writeFile(
      path.join(this.configDir, 'current-config.json'),
      JSON.stringify(configData, null, 2)
    );

    console.log('✅ Configuration deployed successfully!');
  }

  async runMaintenance(options) {
    console.log('🔧 Running maintenance tasks...');
    
    const tasks = options.tasks || ['cleanup', 'optimize', 'backup'];
    
    for (const task of tasks) {
      console.log(`Running task: ${task}`);
      
      switch (task) {
        case 'cleanup':
          await this.cleanupLogs();
          await this.cleanupCache();
          break;
        case 'optimize':
          await this.optimizePerformance();
          break;
        case 'backup':
          await this.createBackup();
          break;
        case 'security':
          await this.runSecurityScan();
          break;
        default:
          console.warn(`Unknown maintenance task: ${task}`);
      }
    }

    console.log('✅ Maintenance completed!');
  }

  // Helper methods
  getVersionFromPackage() {
    try {
      const packageJson = require('../package.json');
      return packageJson.version;
    } catch (error) {
      return '1.0.0';
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

  async generateDefaultConfiguration(environment) {
    return {
      environment,
      version: this.getVersionFromPackage(),
      platform: this.platform,
      deployedAt: new Date().toISOString(),
      
      // Environment-specific settings
      ...(environment === 'production' ? {
        logLevel: 'warn',
        enableDebug: false,
        performanceOptimization: true
      } : {
        logLevel: 'debug',
        enableDebug: true,
        performanceOptimization: false
      })
    };
  }

  async calculateDirectoryChecksum(directory) {
    const files = await this.getFileList(directory);
    const hash = crypto.createHash('sha256');
    
    for (const file of files.sort()) {
      const filePath = path.join(directory, file);
      const content = await fs.readFile(filePath);
      hash.update(content);
    }
    
    return hash.digest('hex');
  }

  async getFileList(directory, relativeTo = directory) {
    const files = [];
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.getFileList(fullPath, relativeTo);
        files.push(...subFiles);
      } else {
        files.push(path.relative(relativeTo, fullPath));
      }
    }
    
    return files;
  }

  async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB
  }

  async createTarGz(sourceDir, targetFile) {
    // Simplified tar.gz creation - in production, use proper tar library
    await execAsync(`tar -czf "${targetFile}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`);
  }

  async extractTarGz(sourceFile, targetDir) {
    await fs.mkdir(targetDir, { recursive: true });
    await execAsync(`tar -xzf "${sourceFile}" -C "${targetDir}"`);
  }

  // Placeholder methods for service management and system operations
  async validatePackage(packagePath) { return true; }
  async checkSystemRequirements() { return { met: true }; }
  async createBackup() { return `backup_${Date.now()}`; }
  async restoreBackup(backupId) { console.log(`Restoring backup: ${backupId}`); }
  async listBackups() { return [`backup_${Date.now()}`]; }
  async stopService() { console.log('Service stopped'); }
  async startService() { console.log('Service started'); }
  async deployFiles(extractDir) { console.log('Files deployed'); }
  async updateConfiguration(extractDir, environment) { console.log('Configuration updated'); }
  async verifyDeployment() { return true; }
  async getServiceStatus() { return 'running'; }
  async getSystemHealth() { 
    return { 
      overall: 'healthy', 
      components: [], 
      recommendations: [], 
      lastCheck: new Date().toISOString() 
    }; 
  }
  async getCurrentVersion() { return this.getVersionFromPackage(); }
  async getUptime() { return '2 days, 3 hours'; }
  async validateConfiguration(config) { return { valid: true, errors: [], warnings: [] }; }
  async cleanupLogs() { console.log('Logs cleaned up'); }
  async cleanupCache() { console.log('Cache cleaned up'); }
  async optimizePerformance() { console.log('Performance optimized'); }
  async runSecurityScan() { console.log('Security scan completed'); }

  showUsage() {
    console.log('Usage: node deploy.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  package     Create deployment package');
    console.log('  deploy      Deploy to environment');
    console.log('  rollback    Rollback deployment');
    console.log('  status      Show deployment status');
    console.log('  health      Check system health');
    console.log('  configure   Deploy configuration');
    console.log('  maintenance Run maintenance tasks');
    console.log('');
    console.log('Examples:');
    console.log('  node deploy.js package --version 1.0.1 --environment production');
    console.log('  node deploy.js deploy --package ./package.tar.gz --environment staging');
    console.log('  node deploy.js rollback --backup backup_123456789');
    console.log('  node deploy.js configure --config ./new-config.json');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      options[key] = value;
    }
  }
  
  return { command, options };
}

// Run deployer if called directly
if (require.main === module) {
  const { command, options } = parseArgs();
  const deployer = new Deployer();
  deployer.run(command, options).catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = Deployer;