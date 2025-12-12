# Smart Energy Copilot - Installation Guide

## 🚀 Complete Installation Guide

This guide will walk you through installing the Smart Energy Copilot system from hardware setup to software configuration.

---

## 📋 Pre-Installation Checklist

### ✅ Requirements Assessment
- [ ] **Home Network**: WiFi 6 router or mesh system (recommended)
- [ ] **Internet Speed**: Minimum 25 Mbps download, 5 Mbps upload
- [ ] **Electrical Panel Access**: For whole-home monitoring installation
- [ ] **Mobile Device**: iOS 14+ or Android 8.0+ for setup app
- [ ] **Cloud Account**: AWS, Azure, or Google Cloud account (for advanced features)

### ✅ Hardware Preparation
- [ ] **Edge Controller**: Tuya T5AI-CORE or Raspberry Pi 4 (see [Hardware List](HARDWARE_LIST.md))
- [ ] **IoT Devices**: Smart plugs, sensors, cameras (minimum 5 devices recommended)
- [ ] **Network Equipment**: UPS, ethernet cables, mounting hardware
- [ ] **Tools**: Screwdrivers, wire strippers, multimeter (for electrical work)

### ✅ Safety Considerations
- [ ] **Electrical Safety**: Licensed electrician for panel work
- [ ] **Network Security**: Change default passwords on all devices
- [ ] **Data Privacy**: Review privacy settings and data retention policies

---

## 🔧 Phase 1: Hardware Installation

### Step 1: Edge Controller Setup

#### Option A: Tuya T5AI-CORE Kit (Recommended)
```bash
# 1. Unbox and inspect the T5AI-CORE kit
# 2. Connect power adapter (12V DC, 2A)
# 3. Connect ethernet cable to router
# 4. Insert microSD card (if using additional storage)
# 5. Power on and wait for boot sequence (LED indicators)
```

**LED Status Indicators:**
- 🔴 **Red Solid**: Booting
- 🟡 **Yellow Blinking**: Network connecting
- 🟢 **Green Solid**: Ready for configuration

#### Option B: Raspberry Pi 4 Setup
```bash
# 1. Flash Raspberry Pi OS to microSD card (32GB minimum)
# 2. Enable SSH and WiFi in boot partition
# 3. Insert SD card and connect peripherals
# 4. Power on and complete initial setup
# 5. Update system packages
sudo apt update && sudo apt upgrade -y
```

### Step 2: Network Configuration

#### Basic Network Setup
```bash
# Configure static IP for edge controller
sudo nano /etc/dhcpcd.conf

# Add these lines:
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

#### Advanced Network (VLAN Segmentation)
```bash
# Create IoT VLAN (recommended for security)
# Configure on managed switch or router:
# VLAN 10: IoT devices (192.168.10.0/24)
# VLAN 20: Management (192.168.20.0/24)
# VLAN 30: User devices (192.168.30.0/24)
```

### Step 3: IoT Device Installation

#### Smart Plugs Installation
1. **Download Tuya Smart App** (iOS/Android)
2. **Create Tuya Account** and verify email
3. **Add Device Process**:
   ```
   App → Add Device → Electrical → Smart Plug
   → Follow pairing instructions
   → Test on/off functionality
   ```

#### Energy Monitoring Installation
⚠️ **Requires Licensed Electrician**

1. **Whole-Home Monitor**:
   - Install current transformers (CTs) on main breaker
   - Mount monitoring device in electrical panel
   - Connect to WiFi network
   - Calibrate with known loads

2. **Circuit-Level Monitors**:
   - Install on individual circuit breakers
   - Configure in mobile app
   - Set circuit names and types

#### Sensor Installation
1. **Temperature/Humidity Sensors**:
   - Mount 5 feet from floor, away from heat sources
   - Avoid direct sunlight and air vents
   - Test connectivity before final mounting

2. **Motion Sensors**:
   - Install in corners for maximum coverage
   - Adjust sensitivity settings
   - Test detection range and angles

3. **Smart Cameras**:
   - Position for optimal occupancy detection
   - Ensure privacy compliance
   - Configure local processing settings

---

## 💻 Phase 2: Software Installation

### Step 1: Edge Controller Software

#### Install Smart Energy Copilot
```bash
# Clone the repository
git clone https://github.com/your-repo/smart-energy-copilot.git
cd smart-energy-copilot

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Build the project
npm run build

# Install as system service
sudo npm run install-service
```

#### Configure Environment
```bash
# Create configuration file
sudo nano /etc/smart-energy-copilot/config.json
```

```json
{
  "edge": {
    "deviceId": "edge-controller-001",
    "location": "home",
    "timezone": "America/New_York"
  },
  "tuya": {
    "apiKey": "your-tuya-api-key",
    "apiSecret": "your-tuya-api-secret",
    "region": "us"
  },
  "cloud": {
    "provider": "aws",
    "region": "us-east-1",
    "endpoint": "https://api.smartenergycopilot.com"
  },
  "security": {
    "enableEncryption": true,
    "certificatePath": "/etc/ssl/certs/device.crt",
    "privateKeyPath": "/etc/ssl/private/device.key"
  }
}
```

#### Start Services
```bash
# Start the Smart Energy Copilot service
sudo systemctl start smart-energy-copilot
sudo systemctl enable smart-energy-copilot

# Check service status
sudo systemctl status smart-energy-copilot

# View logs
sudo journalctl -u smart-energy-copilot -f
```

### Step 2: Cloud Infrastructure Setup

#### AWS Setup (Recommended)
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format

# Deploy cloud infrastructure
cd deployment/aws
./deploy-infrastructure.sh
```

#### Manual Cloud Setup
1. **Create AWS Account** and set up billing alerts
2. **Deploy CloudFormation Stack**:
   ```bash
   aws cloudformation create-stack \
     --stack-name smart-energy-copilot \
     --template-body file://infrastructure.yaml \
     --capabilities CAPABILITY_IAM
   ```

3. **Configure Services**:
   - **IoT Core**: Device registry and certificates
   - **Timestream**: Time-series database for energy data
   - **Lambda**: Serverless analytics functions
   - **S3**: Storage for ML models and logs

### Step 3: Mobile App Setup

#### Download and Install
- **iOS**: Download from App Store
- **Android**: Download from Google Play Store
- **Web App**: Access at https://app.smartenergycopilot.com

#### Initial Configuration
1. **Create Account**:
   ```
   Open App → Sign Up → Verify Email
   → Complete Profile → Accept Terms
   ```

2. **Connect to Edge Controller**:
   ```
   Settings → Add System → Scan QR Code
   → Enter Network Credentials → Test Connection
   ```

3. **Device Discovery**:
   ```
   Devices → Discover → Select Devices
   → Assign Rooms → Set Device Names
   ```

---

## ⚙️ Phase 3: System Configuration

### Step 1: Device Configuration

#### Energy Monitoring Setup
```javascript
// Configure energy monitoring thresholds
const energyConfig = {
  devices: [
    {
      id: "smart-plug-001",
      name: "Living Room TV",
      type: "entertainment",
      normalRange: { min: 0, max: 200 }, // watts
      anomalyThreshold: 50 // percent above normal
    }
  ],
  monitoring: {
    interval: 10, // seconds
    aggregation: 60, // seconds
    retention: 90 // days
  }
};
```

#### Automation Rules Setup
```javascript
// Create basic automation rules
const automationRules = [
  {
    name: "Energy Saver Mode",
    conditions: [
      { type: "occupancy", value: false, duration: 300 }, // 5 minutes
      { type: "time", value: "22:00-06:00" } // Night hours
    ],
    actions: [
      { type: "device_control", devices: ["all_lights"], action: "turn_off" },
      { type: "device_control", devices: ["entertainment"], action: "turn_off" }
    ]
  }
];
```

### Step 2: Security Configuration

#### Generate Device Certificates
```bash
# Generate device certificates for secure communication
sudo smart-energy-copilot generate-certificates \
  --device-id edge-controller-001 \
  --output-dir /etc/ssl/smart-energy-copilot/

# Install certificates
sudo smart-energy-copilot install-certificates \
  --cert-file /etc/ssl/smart-energy-copilot/device.crt \
  --key-file /etc/ssl/smart-energy-copilot/device.key
```

#### Configure Firewall
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8883/tcp  # MQTT over TLS
sudo ufw allow 1883/tcp  # MQTT (local only)

# Allow local network access
sudo ufw allow from 192.168.1.0/24
```

### Step 3: Analytics Configuration

#### Machine Learning Setup
```bash
# Download pre-trained models
sudo smart-energy-copilot download-models \
  --models occupancy,anomaly,forecasting \
  --output-dir /var/lib/smart-energy-copilot/models/

# Configure analytics engine
sudo nano /etc/smart-energy-copilot/analytics.json
```

```json
{
  "forecasting": {
    "enabled": true,
    "horizon": 30,
    "confidence": 0.85,
    "updateInterval": 3600
  },
  "anomalyDetection": {
    "enabled": true,
    "sensitivity": "medium",
    "threshold": 2.0,
    "cooldown": 300
  },
  "occupancyDetection": {
    "enabled": true,
    "model": "yolov5-nano",
    "confidence": 0.7,
    "processingInterval": 5
  }
}
```

---

## 🧪 Phase 4: Testing & Validation

### Step 1: System Health Check
```bash
# Run comprehensive system test
sudo smart-energy-copilot test --comprehensive

# Check individual components
sudo smart-energy-copilot test --component device-manager
sudo smart-energy-copilot test --component energy-monitor
sudo smart-energy-copilot test --component analytics-engine
```

### Step 2: Device Communication Test
```bash
# Test device connectivity
sudo smart-energy-copilot test-devices --all

# Test specific device
sudo smart-energy-copilot test-device --id smart-plug-001

# Test automation rules
sudo smart-energy-copilot test-automation --rule-id energy-saver-mode
```

### Step 3: Performance Validation
```bash
# Monitor system performance
sudo smart-energy-copilot monitor --duration 300 --output performance.log

# Check response times
sudo smart-energy-copilot benchmark --test response-time
sudo smart-energy-copilot benchmark --test throughput
```

### Step 4: Security Validation
```bash
# Run security audit
sudo smart-energy-copilot security-audit --full

# Test encryption
sudo smart-energy-copilot test-encryption --all-devices

# Validate certificates
sudo smart-energy-copilot validate-certificates
```

---

## 📊 Phase 5: Monitoring & Maintenance

### Step 1: Set Up Monitoring
```bash
# Configure system monitoring
sudo smart-energy-copilot setup-monitoring \
  --enable-alerts \
  --email your-email@example.com \
  --sms +1234567890

# Set up log rotation
sudo nano /etc/logrotate.d/smart-energy-copilot
```

### Step 2: Backup Configuration
```bash
# Create system backup
sudo smart-energy-copilot backup \
  --output /backup/smart-energy-copilot-$(date +%Y%m%d).tar.gz \
  --include-config \
  --include-data \
  --include-certificates

# Schedule automatic backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/smart-energy-copilot backup --auto
```

### Step 3: Update Management
```bash
# Check for updates
sudo smart-energy-copilot check-updates

# Update system (with automatic backup)
sudo smart-energy-copilot update --backup-first

# Update device firmware
sudo smart-energy-copilot update-devices --all
```

---

## 🔧 Troubleshooting

### Common Issues

#### Edge Controller Not Responding
```bash
# Check system status
sudo systemctl status smart-energy-copilot

# Restart service
sudo systemctl restart smart-energy-copilot

# Check logs for errors
sudo journalctl -u smart-energy-copilot --since "1 hour ago"
```

#### Device Connection Issues
```bash
# Scan for devices
sudo smart-energy-copilot scan-devices

# Reset device pairing
sudo smart-energy-copilot reset-device --id device-id

# Check network connectivity
ping 192.168.1.1  # Router
ping 8.8.8.8      # Internet
```

#### Cloud Connectivity Problems
```bash
# Test cloud connection
sudo smart-energy-copilot test-cloud-connection

# Check API credentials
sudo smart-energy-copilot validate-credentials

# Regenerate certificates if needed
sudo smart-energy-copilot regenerate-certificates
```

### Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Optimize database
sudo smart-energy-copilot optimize-database

# Clear cache
sudo smart-energy-copilot clear-cache
```

### Getting Help
- **Documentation**: [Features Guide](FEATURES.md)
- **Community Forum**: https://community.smartenergycopilot.com
- **Technical Support**: support@smartenergycopilot.com
- **Emergency Support**: +1-800-ENERGY-1 (24/7)

---

## ✅ Installation Complete!

Congratulations! Your Smart Energy Copilot system is now installed and configured. 

### Next Steps:
1. **Explore the Mobile App**: Familiarize yourself with the dashboard and controls
2. **Set Up Automation Rules**: Create custom rules for your energy-saving goals
3. **Monitor Performance**: Watch your energy usage patterns and savings
4. **Join the Community**: Connect with other users for tips and best practices

### Quick Reference:
- **System Status**: `sudo systemctl status smart-energy-copilot`
- **View Logs**: `sudo journalctl -u smart-energy-copilot -f`
- **Test System**: `sudo smart-energy-copilot test --quick`
- **Get Help**: `sudo smart-energy-copilot --help`

**Welcome to intelligent energy management!** 🌟⚡🏠