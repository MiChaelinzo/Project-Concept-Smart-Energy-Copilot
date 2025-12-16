# T5 AI Core DevKit Deployment Guide

## 🚀 Running Smart Energy Copilot on T5 AI Core DevKit

The T5 AI Core DevKit is a powerful edge AI computing device that can run the complete Smart Energy Copilot system locally, providing better performance and lower latency than traditional setups.

## 📋 Prerequisites

### Hardware Requirements
- **T5 AI Core DevKit** (primary device)
- **Power Supply** (included with DevKit)
- **Network Connection** (Ethernet or WiFi)
- **Optional**: USB-C cable for development/debugging

### Software Requirements
- **Linux-based OS** (usually pre-installed)
- **Node.js 18+** 
- **npm** package manager
- **Git** for repository access

## 🔧 T5 AI Core DevKit Setup

### Step 1: Access T5 AI Core DevKit

```bash
# Connect via SSH (replace with your T5's IP address)
ssh root@192.168.1.xxx

# Or connect via USB-C serial console
# Use screen, minicom, or similar terminal emulator
screen /dev/ttyUSB0 115200
```

### Step 2: Install Node.js on T5 AI Core

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/MiChaelinzo/Project-Concept-Smart-Energy-Copilot.git
cd Project-Concept-Smart-Energy-Copilot

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 4: Configure for T5 AI Core

```bash
# Create T5-specific configuration
cp config/tuya-config.json config/tuya-config-t5.json

# Edit configuration for T5 environment
nano config/tuya-config-t5.json
```

## 🎯 T5 AI Core Optimized Configuration

### T5-Specific Config (`config/tuya-config-t5.json`)

```json
{
  "accessId": "your_tuya_access_id",
  "accessSecret": "your_tuya_access_secret",
  "endpoint": "https://openapi.tuyaus.com",
  "uid": "your_tuya_user_id",
  "t5_optimization": {
    "enable_local_ai": true,
    "use_hardware_acceleration": true,
    "voice_processing_local": true,
    "edge_inference": true,
    "low_latency_mode": true
  },
  "network": {
    "interface": "eth0",
    "fallback_interface": "wlan0",
    "port": 3000,
    "enable_hotspot": false
  },
  "performance": {
    "max_concurrent_devices": 100,
    "ai_model_cache": true,
    "optimize_for_edge": true
  }
}
```

## 🚀 Running on T5 AI Core DevKit

### Method 1: Direct Web Dashboard

```bash
# Start the web dashboard optimized for T5
npm run web -- --config config/tuya-config-t5.json

# Access via T5's IP address
# http://[T5_IP_ADDRESS]:3000
```

### Method 2: T5 Native Mode

```bash
# Run in T5 native mode (optimized for edge processing)
npm run desktop:start -- --mode t5-native --config config/tuya-config-t5.json
```

### Method 3: Service Mode (Recommended for Production)

```bash
# Install as system service
npm run desktop:install -- --target t5-core

# Start as service
systemctl start smart-energy-copilot
systemctl enable smart-energy-copilot

# Check service status
systemctl status smart-energy-copilot
```

## 🎤 T5 AI Core Voice Processing

The T5 AI Core DevKit has built-in AI acceleration that we can leverage:

### Enable Hardware-Accelerated Voice Processing

```bash
# Check T5 AI capabilities
cat /proc/cpuinfo | grep -i ai
lsmod | grep -i npu

# Configure voice processing for T5
export T5_AI_ACCELERATION=true
export T5_VOICE_LOCAL=true
export T5_INFERENCE_ENGINE=native

# Start with T5 optimizations
npm run web -- --t5-optimized
```

## 🌐 Network Configuration

### Access Dashboard from Other Devices

```bash
# Find T5 IP address
ip addr show

# Configure firewall (if needed)
ufw allow 3000/tcp
ufw reload

# Access dashboard from any device on network
# http://[T5_IP_ADDRESS]:3000
```

### WiFi Hotspot Mode (Optional)

```bash
# Enable T5 as WiFi hotspot for direct access
hostapd /etc/hostapd/hostapd.conf
dnsmasq -C /etc/dnsmasq.conf

# Access via hotspot
# SSID: SmartEnergyCopilot-T5
# Password: (set in config)
# Dashboard: http://192.168.4.1:3000
```

## 🔧 T5-Specific Optimizations

### Performance Tuning

```bash
# Optimize for T5 hardware
echo 'performance' > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Enable AI acceleration
echo 1 > /sys/class/npu/npu0/enable

# Optimize memory
echo 1 > /proc/sys/vm/drop_caches
```

### Storage Optimization

```bash
# Use T5's eMMC storage efficiently
# Create swap file if needed
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Add to /etc/fstab for persistence
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 📊 Monitoring T5 Performance

### System Resources

```bash
# Monitor T5 resources
htop

# Check AI accelerator usage
cat /sys/class/npu/npu0/utilization

# Monitor network
iftop -i eth0
```

### Dashboard Metrics

Access the web dashboard at `http://[T5_IP]:3000` to monitor:
- AI processing performance
- Voice recognition accuracy
- Device response times
- Energy optimization effectiveness

## 🔍 Troubleshooting T5 Issues

### Common Problems

**1. Node.js Installation Issues**
```bash
# Alternative Node.js installation
wget https://nodejs.org/dist/v18.20.4/node-v18.20.4-linux-arm64.tar.xz
tar -xf node-v18.20.4-linux-arm64.tar.xz
sudo cp -r node-v18.20.4-linux-arm64/* /usr/local/
```

**2. Permission Issues**
```bash
# Fix permissions
sudo chown -R $USER:$USER /home/$USER/.npm
sudo chmod -R 755 /home/$USER/.npm
```

**3. Memory Issues**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build
```

**4. Network Connectivity**
```bash
# Check network interfaces
ip link show
systemctl status networking

# Reset network if needed
systemctl restart networking
```

## 🎯 T5 AI Core Advantages

### Why Run on T5 AI Core DevKit:

1. **🚀 Better Performance**: Dedicated AI acceleration hardware
2. **⚡ Lower Latency**: Local processing without external dependencies  
3. **🔒 Enhanced Privacy**: All AI processing stays on device
4. **💡 Energy Efficient**: Optimized power consumption
5. **🌐 Standalone Operation**: No need for separate Raspberry Pi
6. **🎤 Superior Voice Processing**: Hardware-accelerated speech recognition
7. **📱 Direct Access**: Built-in web server accessible from any device

## 🔄 Migration from Raspberry Pi

If you were previously running on Raspberry Pi 4:

```bash
# On Raspberry Pi - backup configuration
scp -r config/ user@t5-ip-address:/path/to/project/
scp -r data/ user@t5-ip-address:/path/to/project/

# On T5 AI Core - restore and optimize
npm run desktop:config -- --import-from-pi --optimize-t5
```

## 📞 Support

For T5 AI Core specific issues:
- Check T5 documentation and forums
- Verify hardware acceleration is working
- Monitor system resources during operation
- Use T5's built-in diagnostic tools

---

**Ready to unleash the full power of T5 AI Core DevKit!** 🚀  
Your Smart Energy Copilot system will run faster and more efficiently on dedicated AI hardware.