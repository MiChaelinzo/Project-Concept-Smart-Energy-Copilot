# Smart Energy Copilot - Hardware Requirements & Compatibility List

## 🏗️ System Architecture Overview

The Smart Energy Copilot operates on a three-tier architecture:
- **Edge Tier**: Local processing and device management
- **Cloud Tier**: Advanced analytics and data storage
- **Device Tier**: IoT sensors and smart devices

---

## 🖥️ Edge Computing Hardware

### Primary Edge Controller Options

#### Option 1: Tuya T5AI-CORE Kit (Recommended)
- **Processor**: ARM Cortex-A55 Quad-core 1.8GHz
- **Memory**: 2GB LPDDR4 RAM
- **Storage**: 16GB eMMC + microSD slot (up to 128GB)
- **AI Accelerator**: Dedicated NPU for edge AI inference
- **Connectivity**: 
  - WiFi 6 (802.11ax)
  - Bluetooth 5.2
  - Zigbee 3.0
  - Ethernet (Gigabit)
- **Power**: 12V DC, 2A (24W max)
- **Operating Temperature**: -10°C to +60°C
- **Dimensions**: 120mm x 80mm x 25mm
- **Price Range**: $150-200

#### Option 2: Raspberry Pi 4 Model B (Alternative)
- **Processor**: ARM Cortex-A72 Quad-core 1.5GHz
- **Memory**: 4GB or 8GB LPDDR4 RAM
- **Storage**: microSD card (minimum 32GB, Class 10)
- **Connectivity**:
  - WiFi 5 (802.11ac)
  - Bluetooth 5.0
  - Ethernet (Gigabit)
  - USB 3.0 x2, USB 2.0 x2
- **GPIO**: 40-pin GPIO header for sensor connections
- **Power**: 5V DC, 3A (15W max)
- **Operating Temperature**: 0°C to +50°C
- **Dimensions**: 85mm x 56mm x 17mm
- **Price Range**: $75-100

#### Option 3: NVIDIA Jetson Nano (High-Performance)
- **Processor**: ARM Cortex-A57 Quad-core 1.43GHz
- **GPU**: 128-core Maxwell GPU
- **Memory**: 4GB LPDDR4 RAM
- **Storage**: microSD card + optional eMMC
- **AI Performance**: 472 GFLOPS for AI workloads
- **Connectivity**: WiFi (via USB), Ethernet, USB 3.0 x4
- **Power**: 5V DC, 4A (20W max)
- **Price Range**: $100-150

### Required Accessories for Edge Controller

#### Power Supply & UPS
- **Uninterruptible Power Supply (UPS)**
  - Capacity: 1000VA/600W minimum
  - Runtime: 30+ minutes at full load
  - Models: APC Back-UPS BE600M1, CyberPower CP1000PFCLCD
  - Price Range: $80-150

#### Network Infrastructure
- **Ethernet Switch** (if multiple wired connections needed)
  - Ports: 8-port Gigabit minimum
  - Models: Netgear GS308, TP-Link TL-SG1008D
  - Price Range: $25-40

- **WiFi Router** (if upgrading existing network)
  - Standard: WiFi 6 (802.11ax) recommended
  - Models: ASUS AX6000, Netgear Nighthawk AX12
  - Price Range: $200-400

#### Storage Expansion
- **High-Endurance microSD Cards**
  - Capacity: 64GB-128GB
  - Type: Industrial/High-Endurance (for continuous write operations)
  - Models: SanDisk High Endurance, Samsung PRO Endurance
  - Price Range: $15-40

---

## 📱 IoT Devices & Sensors

### Smart Plugs & Power Monitoring

#### Tuya Smart Plugs (Primary Recommendation)
- **Models**: 
  - Tuya Smart Plug 16A (EU/UK)
  - Tuya Smart Plug 15A (US)
- **Features**:
  - Real-time power monitoring
  - Remote on/off control
  - Energy consumption tracking
  - WiFi connectivity
  - Voice assistant compatibility
- **Specifications**:
  - Max Load: 16A/15A (3680W/1800W)
  - Accuracy: ±1% power measurement
  - Connectivity: WiFi 2.4GHz
- **Price Range**: $8-15 each
- **Recommended Quantity**: 10-20 per household

#### Alternative Smart Plugs
- **TP-Link Kasa Smart Plugs**
  - Models: HS110 (with energy monitoring)
  - Features: Similar to Tuya, good app integration
  - Price Range: $12-18 each

- **Amazon Smart Plug**
  - Basic on/off control
  - No energy monitoring
  - Price Range: $25 each

### Energy Monitoring Devices

#### Whole-Home Energy Monitors
- **Sense Home Energy Monitor**
  - Installation: Main electrical panel
  - Features: Device-level detection, real-time monitoring
  - Connectivity: WiFi + dedicated CTs
  - Price Range: $300-350

- **Emporia Vue Energy Monitor**
  - Installation: Main electrical panel
  - Features: 16-circuit monitoring capability
  - Connectivity: WiFi
  - Price Range: $150-200

#### Individual Circuit Monitors
- **Tuya WiFi Energy Meter**
  - Installation: DIN rail mount
  - Features: Single-phase monitoring
  - Accuracy: Class 1 (±1%)
  - Price Range: $25-35 each

### Smart HVAC Controls

#### Smart Thermostats
- **Tuya Smart Thermostat**
  - Features: WiFi, scheduling, geofencing
  - Compatibility: Most HVAC systems
  - Display: Color touchscreen
  - Price Range: $80-120

- **Nest Learning Thermostat** (Alternative)
  - Features: AI learning, remote control
  - Compatibility: 95% of HVAC systems
  - Price Range: $250-300

#### Smart HVAC Sensors
- **Temperature/Humidity Sensors**
  - Models: Tuya Temperature Humidity Sensor
  - Features: WiFi connectivity, data logging
  - Accuracy: ±0.3°C, ±3% RH
  - Price Range: $10-15 each
  - Recommended Quantity: 1 per room

### Occupancy Detection Hardware

#### Smart Cameras with AI
- **Tuya Smart Camera 1080P**
  - Features: Person detection, night vision
  - AI: On-device person recognition
  - Storage: Local + cloud options
  - Price Range: $30-50 each

- **Raspberry Pi Camera Module v3**
  - Resolution: 12MP, 1080p video
  - Features: Wide-angle lens, low-light performance
  - Integration: Direct connection to Pi GPIO
  - Price Range: $25-35 each

#### PIR Motion Sensors
- **Tuya PIR Motion Sensor**
  - Detection Range: 6-8 meters
  - Battery Life: 1-2 years
  - Connectivity: WiFi or Zigbee
  - Price Range: $8-12 each

#### Ultrasonic Occupancy Sensors
- **Tuya Microwave Sensor**
  - Technology: 5.8GHz microwave
  - Detection: Through walls/obstacles
  - Range: 5-8 meters
  - Price Range: $15-25 each

### Smart Lighting

#### Smart Light Bulbs
- **Tuya Smart LED Bulbs**
  - Types: E27, E14, GU10
  - Features: Dimming, color changing, scheduling
  - Power: 9W-15W LED
  - Price Range: $8-15 each

#### Smart Light Switches
- **Tuya Smart Wall Switch**
  - Types: 1-gang, 2-gang, 3-gang
  - Features: Touch control, WiFi, scheduling
  - Installation: Standard wall box
  - Price Range: $12-25 each

### Environmental Sensors

#### Air Quality Monitors
- **Tuya Air Quality Monitor**
  - Measurements: PM2.5, PM10, CO2, TVOC
  - Display: LCD screen with real-time data
  - Connectivity: WiFi
  - Price Range: $40-60 each

#### Weather Stations
- **Tuya Weather Station**
  - Measurements: Temperature, humidity, pressure, wind
  - Features: Outdoor sensor, WiFi connectivity
  - Display: Indoor display unit
  - Price Range: $50-80

---

## ☁️ Cloud Infrastructure Requirements

### AWS Services (Recommended Cloud Platform)

#### Compute Services
- **AWS Lambda**
  - Purpose: Serverless analytics processing
  - Configuration: Node.js 18.x runtime
  - Memory: 512MB-3008MB depending on workload
  - Estimated Cost: $10-50/month

- **AWS EC2** (for persistent services)
  - Instance Type: t3.medium or t3.large
  - vCPUs: 2-4
  - Memory: 4-8GB RAM
  - Storage: 50-100GB SSD
  - Estimated Cost: $30-100/month

#### Storage Services
- **AWS Timestream** (Time-series database)
  - Purpose: Energy consumption data storage
  - Retention: 30 days memory, 1 year magnetic
  - Estimated Cost: $20-100/month

- **AWS S3** (Object storage)
  - Purpose: ML models, backups, logs
  - Storage Class: Standard + Intelligent Tiering
  - Estimated Cost: $5-25/month

#### Networking & Security
- **AWS IoT Core**
  - Purpose: Device connectivity and management
  - Features: MQTT broker, device shadows
  - Estimated Cost: $10-30/month

- **AWS Certificate Manager**
  - Purpose: SSL/TLS certificates
  - Cost: Free for AWS services

### Alternative Cloud Platforms

#### Microsoft Azure
- **Azure IoT Hub**: Device connectivity
- **Azure Time Series Insights**: Time-series data
- **Azure Functions**: Serverless computing
- **Estimated Cost**: Similar to AWS

#### Google Cloud Platform
- **Google Cloud IoT Core**: Device management
- **Google Cloud Functions**: Serverless processing
- **BigQuery**: Analytics and data warehouse
- **Estimated Cost**: Competitive with AWS/Azure

---

## 📱 Mobile & User Interface Hardware

### Mobile Devices (Compatibility)
- **iOS**: iPhone 8 or newer, iOS 14+
- **Android**: Android 8.0+, 3GB RAM minimum
- **Tablets**: iPad (6th gen+), Android tablets 10"+

### Optional Dashboard Hardware
- **Dedicated Tablet Display**
  - Models: Amazon Fire HD 10, iPad (9th gen)
  - Purpose: Wall-mounted energy dashboard
  - Price Range: $100-300

- **Smart Display**
  - Models: Amazon Echo Show 10, Google Nest Hub Max
  - Features: Voice control + visual dashboard
  - Price Range: $200-250

---

## 🔧 Installation Hardware & Tools

### Electrical Installation
- **Current Transformers (CTs)**
  - Types: Split-core CTs for non-invasive installation
  - Sizes: 30A, 50A, 100A, 200A
  - Accuracy: Class 1 (±1%)
  - Price Range: $15-40 each

- **DIN Rail Mounts**
  - Purpose: Mounting energy meters in electrical panels
  - Standard: 35mm DIN rail
  - Price Range: $5-10 each

### Network Installation
- **Ethernet Cables**
  - Type: Cat6 or Cat6a
  - Length: Various (1m-50m)
  - Price Range: $5-30 depending on length

- **Cable Management**
  - Conduit, cable ties, wall mounts
  - Price Range: $20-50 for complete installation

### Mounting Hardware
- **Wall Mounts** for edge controllers
- **Enclosures** for outdoor sensors
- **Adhesive Mounts** for wireless sensors

---

## 💰 Complete System Pricing

### Starter Kit (Small Home - 1-2 bedrooms)
| Component | Quantity | Unit Price | Total |
|-----------|----------|------------|-------|
| Tuya T5AI-CORE Kit | 1 | $175 | $175 |
| Smart Plugs | 8 | $12 | $96 |
| Smart Thermostat | 1 | $100 | $100 |
| Occupancy Sensors | 3 | $10 | $30 |
| Energy Monitor | 1 | $200 | $200 |
| UPS | 1 | $100 | $100 |
| Installation Materials | 1 | $50 | $50 |
| **Total Starter Kit** | | | **$751** |

### Standard Kit (Medium Home - 3-4 bedrooms)
| Component | Quantity | Unit Price | Total |
|-----------|----------|------------|-------|
| Tuya T5AI-CORE Kit | 1 | $175 | $175 |
| Smart Plugs | 15 | $12 | $180 |
| Smart Thermostat | 1 | $100 | $100 |
| Smart Light Switches | 8 | $18 | $144 |
| Occupancy Sensors | 6 | $10 | $60 |
| Smart Cameras | 3 | $40 | $120 |
| Energy Monitor | 1 | $200 | $200 |
| Air Quality Monitor | 2 | $50 | $100 |
| UPS | 1 | $120 | $120 |
| Network Upgrade | 1 | $100 | $100 |
| Installation Materials | 1 | $100 | $100 |
| **Total Standard Kit** | | | **$1,399** |

### Professional Kit (Large Home/Small Business)
| Component | Quantity | Unit Price | Total |
|-----------|----------|------------|-------|
| Tuya T5AI-CORE Kit | 2 | $175 | $350 |
| Smart Plugs | 25 | $12 | $300 |
| Smart Thermostat | 2 | $100 | $200 |
| Smart Light Switches | 15 | $18 | $270 |
| Occupancy Sensors | 10 | $10 | $100 |
| Smart Cameras | 6 | $40 | $240 |
| Whole-Home Energy Monitor | 1 | $300 | $300 |
| Circuit-Level Monitors | 8 | $30 | $240 |
| Air Quality Monitors | 4 | $50 | $200 |
| Weather Station | 1 | $70 | $70 |
| UPS Systems | 2 | $120 | $240 |
| Network Infrastructure | 1 | $300 | $300 |
| Professional Installation | 1 | $500 | $500 |
| **Total Professional Kit** | | | **$3,310** |

---

## 🔧 Installation Requirements

### Electrical Work
- **Licensed Electrician Required** for:
  - Main panel energy monitor installation
  - Hardwired smart switches
  - Circuit-level monitoring devices

### Network Setup
- **IT Professional Recommended** for:
  - Enterprise network configuration
  - VPN setup for remote access
  - Security configuration

### DIY Installation
- **User-Installable Components**:
  - Smart plugs
  - Wireless sensors
  - Edge controller setup
  - Mobile app configuration

---

## 📋 Maintenance & Support

### Regular Maintenance
- **Monthly**: Check sensor battery levels
- **Quarterly**: Update firmware on all devices
- **Annually**: Professional system health check

### Warranty Information
- **Edge Controllers**: 2-3 years manufacturer warranty
- **IoT Devices**: 1-2 years manufacturer warranty
- **Professional Installation**: 1 year service warranty

### Technical Support
- **24/7 Remote Support**: For system monitoring and troubleshooting
- **On-site Support**: Available for professional installations
- **Community Forum**: User community and knowledge base

---

## 🌍 Regional Availability

### North America (US/Canada)
- All components available
- UL/CSA certified devices
- 110V/220V compatibility

### Europe (EU/UK)
- CE marked devices
- 230V compatibility
- GDPR compliant data handling

### Asia-Pacific
- Regional Tuya distributors
- Local voltage compatibility
- Localized mobile apps

### Other Regions
- Contact regional distributors
- Voltage converter may be required
- Shipping and import duties apply

---

*This hardware list is regularly updated to reflect the latest compatible devices and pricing. For the most current information and regional availability, please contact our technical support team.*