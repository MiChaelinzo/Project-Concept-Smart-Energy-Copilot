# Smart Energy Copilot - System Architecture Diagram

## 🏗️ Complete System Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        MA[Mobile App<br/>iOS/Android]
        WD[Web Dashboard<br/>React/Vue]
        VA[Voice Assistant<br/>Alexa/Google]
        SD[Smart Display<br/>Wall Mount]
    end

    subgraph "Cloud Infrastructure - AWS"
        subgraph "API Gateway & Load Balancer"
            ALB[Application Load Balancer]
            AG[API Gateway]
        end
        
        subgraph "Compute Services"
            LF[Lambda Functions<br/>Analytics Engine]
            EC2[EC2 Instances<br/>Core Services]
            ECS[ECS Containers<br/>Microservices]
        end
        
        subgraph "Data Storage"
            TS[Timestream<br/>Time-Series Data]
            RDS[RDS PostgreSQL<br/>Relational Data]
            S3[S3 Buckets<br/>ML Models & Logs]
            EC[ElastiCache<br/>Redis Cache]
        end
        
        subgraph "AI/ML Services"
            SM[SageMaker<br/>ML Training]
            CF[CloudFormation<br/>Infrastructure]
            CW[CloudWatch<br/>Monitoring]
        end
        
        subgraph "IoT & Security"
            IOT[IoT Core<br/>Device Management]
            CM[Certificate Manager<br/>SSL/TLS]
            IAM[IAM<br/>Access Control]
            KMS[KMS<br/>Encryption Keys]
        end
    end

    subgraph "Edge Computing Layer"
        subgraph "Primary Edge Controller"
            T5AI[Tuya T5AI-CORE<br/>ARM Cortex-A55<br/>2GB RAM, NPU]
            RPI[Raspberry Pi 4<br/>Alternative Option<br/>4GB RAM]
            JN[NVIDIA Jetson Nano<br/>High Performance<br/>GPU Acceleration]
        end
        
        subgraph "Edge Services"
            EM[Energy Monitor<br/>Real-time Processing]
            OD[Occupancy Detector<br/>Computer Vision]
            VAS[Voice Assistant<br/>Speech Recognition]
            AD[Anomaly Detector<br/>ML Inference]
            SE[Schedule Executor<br/>Automation Engine]
            BLE[Behavior Learning<br/>Pattern Analysis]
            ARE[Automation Rules<br/>Complex Logic]
        end
        
        subgraph "Local Storage & Cache"
            LCD[Local Cache<br/>24hr Data Buffer]
            CQ[Command Queue<br/>Offline Operations]
            LDB[Local Database<br/>SQLite/LevelDB]
        end
    end

    subgraph "Network Infrastructure"
        subgraph "Home Network"
            RT[WiFi 6 Router<br/>Mesh Network]
            SW[Ethernet Switch<br/>Gigabit]
            UPS[UPS System<br/>Power Backup]
        end
        
        subgraph "Connectivity Protocols"
            WIFI[WiFi 2.4/5GHz]
            ZB[Zigbee 3.0]
            BT[Bluetooth 5.2]
            ETH[Ethernet]
            MQTT[MQTT Protocol]
            HTTPS[HTTPS/TLS]
        end
    end

    subgraph "Smart Grid Integration"
        subgraph "Utility Services"
            GP[Grid Pricing API<br/>Dynamic Rates]
            DR[Demand Response<br/>Grid Events]
            CI[Carbon Intensity<br/>Real-time Data]
        end
        
        subgraph "Energy Trading"
            P2P[P2P Energy Market<br/>Blockchain]
            RE[Renewable Sources<br/>Solar/Wind/Battery]
            ES[Energy Storage<br/>Home Batteries]
        end
    end

    subgraph "IoT Device Ecosystem"
        subgraph "Energy Monitoring"
            WEM[Whole-Home Monitor<br/>Main Panel]
            CLM[Circuit Monitors<br/>Individual Circuits]
            SP[Smart Plugs<br/>Device Level]
        end
        
        subgraph "HVAC & Climate"
            ST[Smart Thermostat<br/>Temperature Control]
            THS[Temp/Humidity Sensors<br/>Room Level]
            AQM[Air Quality Monitor<br/>PM2.5, CO2, VOC]
        end
        
        subgraph "Lighting & Controls"
            SL[Smart LED Bulbs<br/>Dimming/Color]
            SLS[Smart Light Switches<br/>Wall Mounted]
            MS[Motion Sensors<br/>PIR/Microwave]
        end
        
        subgraph "Security & Monitoring"
            SC[Smart Cameras<br/>AI Person Detection]
            DS[Door/Window Sensors<br/>Entry Monitoring]
            SS[Smoke/CO Detectors<br/>Safety Monitoring]
        end
        
        subgraph "Appliances & Outlets"
            SA[Smart Appliances<br/>Washer/Dryer/Fridge]
            SO[Smart Outlets<br/>High Power Devices]
            WL[Water Leak Sensors<br/>Flood Prevention]
        end
    end

    subgraph "External Integrations"
        subgraph "Weather Services"
            WS[Weather API<br/>OpenWeather/AccuWeather]
            WF[Weather Forecast<br/>7-day Predictions]
        end
        
        subgraph "Utility Integration"
            UI[Utility APIs<br/>Billing Data]
            SM_EXT[Smart Meters<br/>AMI Integration]
        end
        
        subgraph "Third-Party Services"
            IFTTT[IFTTT Integration<br/>Automation Platform]
            HA[Home Assistant<br/>Open Source Hub]
            ALEXA[Amazon Alexa<br/>Voice Control]
            GOOGLE[Google Assistant<br/>Voice Control]
        end
    end

    %% User Interface Connections
    MA --> AG
    WD --> AG
    VA --> AG
    SD --> AG

    %% API Gateway Connections
    AG --> ALB
    ALB --> LF
    ALB --> EC2
    ALB --> ECS

    %% Cloud Service Connections
    LF --> TS
    LF --> RDS
    LF --> S3
    LF --> EC
    EC2 --> TS
    EC2 --> RDS
    ECS --> TS
    
    %% AI/ML Connections
    SM --> S3
    LF --> SM
    CW --> LF
    CW --> EC2

    %% IoT & Security Connections
    IOT --> T5AI
    IOT --> RPI
    IOT --> JN
    CM --> AG
    IAM --> LF
    KMS --> RDS

    %% Edge Controller Connections
    T5AI --> EM
    T5AI --> OD
    T5AI --> VAS
    T5AI --> AD
    T5AI --> SE
    T5AI --> BLE
    T5AI --> ARE
    
    %% Edge Storage Connections
    EM --> LCD
    SE --> CQ
    BLE --> LDB

    %% Network Connections
    T5AI --> RT
    RT --> SW
    SW --> UPS
    T5AI -.-> WIFI
    T5AI -.-> ZB
    T5AI -.-> BT
    T5AI -.-> ETH
    T5AI -.-> MQTT
    T5AI -.-> HTTPS

    %% Smart Grid Connections
    LF --> GP
    LF --> DR
    LF --> CI
    EC2 --> P2P
    T5AI --> RE
    T5AI --> ES

    %% IoT Device Connections
    T5AI --> WEM
    T5AI --> CLM
    T5AI --> SP
    T5AI --> ST
    T5AI --> THS
    T5AI --> AQM
    T5AI --> SL
    T5AI --> SLS
    T5AI --> MS
    T5AI --> SC
    T5AI --> DS
    T5AI --> SS
    T5AI --> SA
    T5AI --> SO
    T5AI --> WL

    %% External Integration Connections
    LF --> WS
    LF --> WF
    EC2 --> UI
    EC2 --> SM_EXT
    AG --> IFTTT
    AG --> HA
    VAS --> ALEXA
    VAS --> GOOGLE

    %% Styling
    classDef cloudService fill:#ff9999,stroke:#333,stroke-width:2px
    classDef edgeDevice fill:#99ccff,stroke:#333,stroke-width:2px
    classDef iotDevice fill:#99ff99,stroke:#333,stroke-width:2px
    classDef userInterface fill:#ffcc99,stroke:#333,stroke-width:2px
    classDef network fill:#cc99ff,stroke:#333,stroke-width:2px
    classDef external fill:#ffff99,stroke:#333,stroke-width:2px

    class LF,EC2,ECS,TS,RDS,S3,EC,SM,IOT,CM,IAM,KMS cloudService
    class T5AI,RPI,JN,EM,OD,VAS,AD,SE,BLE,ARE,LCD,CQ,LDB edgeDevice
    class WEM,CLM,SP,ST,THS,AQM,SL,SLS,MS,SC,DS,SS,SA,SO,WL iotDevice
    class MA,WD,VA,SD userInterface
    class RT,SW,UPS,WIFI,ZB,BT,ETH,MQTT,HTTPS network
    class GP,DR,CI,P2P,RE,ES,WS,WF,UI,SM_EXT,IFTTT,HA,ALEXA,GOOGLE external
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User/Mobile App
    participant C as Cloud Services
    participant E as Edge Controller
    participant D as IoT Devices
    participant G as Smart Grid

    Note over U,G: Real-time Energy Monitoring Flow
    
    D->>E: Energy readings (every 10s)
    E->>E: Local processing & caching
    E->>C: Aggregated data (every 60s)
    C->>C: Analytics & ML processing
    C->>U: Real-time dashboard updates
    
    Note over U,G: Automation & Control Flow
    
    U->>C: Set automation rule
    C->>E: Deploy rule to edge
    E->>E: Evaluate conditions
    E->>D: Execute device commands
    D->>E: Confirm action
    E->>C: Log execution
    C->>U: Notification
    
    Note over U,G: Smart Grid Integration Flow
    
    G->>C: Pricing/demand signals
    C->>C: Optimize schedule
    C->>E: Updated automation
    E->>D: Adjust device operation
    D->>E: Consumption feedback
    E->>C: Performance metrics
    C->>G: Participation confirmation
    
    Note over U,G: Anomaly Detection Flow
    
    D->>E: Unusual energy pattern
    E->>E: Local anomaly detection
    E->>D: Emergency shutdown
    E->>C: Alert notification
    C->>U: Push notification
    U->>C: Acknowledge/override
    C->>E: User response
```

## 🏠 Physical Deployment Architecture

```mermaid
graph TB
    subgraph "Electrical Panel"
        MP[Main Panel<br/>200A Service]
        WEM[Whole-Home Monitor<br/>Current Transformers]
        CLM1[Circuit Monitor 1<br/>HVAC]
        CLM2[Circuit Monitor 2<br/>Kitchen]
        CLM3[Circuit Monitor 3<br/>Living Room]
    end

    subgraph "Living Room"
        EC[Edge Controller<br/>Tuya T5AI-CORE]
        RT[WiFi 6 Router<br/>Mesh Node]
        SC1[Smart Camera<br/>Occupancy Detection]
        ST[Smart Thermostat<br/>Climate Control]
        SL1[Smart Lights<br/>LED Bulbs]
        SP1[Smart Plugs<br/>Entertainment Center]
    end

    subgraph "Kitchen"
        MS1[Motion Sensor<br/>PIR Detection]
        SLS1[Smart Light Switch<br/>Under-cabinet LED]
        SP2[Smart Plug<br/>Coffee Maker]
        SP3[Smart Plug<br/>Microwave]
        AQM1[Air Quality Monitor<br/>Cooking Fumes]
    end

    subgraph "Bedrooms"
        THS1[Temp/Humidity Sensor<br/>Master Bedroom]
        SL2[Smart Lights<br/>Bedside Lamps]
        SP4[Smart Plug<br/>Phone Charger]
        MS2[Motion Sensor<br/>Hallway]
    end

    subgraph "Utility Room"
        UPS[UPS System<br/>Battery Backup]
        SW[Network Switch<br/>Ethernet Hub]
        WL1[Water Leak Sensor<br/>Water Heater]
        SP5[Smart Plug<br/>Washer/Dryer]
    end

    subgraph "Outdoor"
        WS[Weather Station<br/>Temp/Wind/Rain]
        SC2[Security Camera<br/>Perimeter Monitoring]
        SL3[Smart Outdoor Lights<br/>Motion Activated]
    end

    %% Power Connections
    MP --> WEM
    MP --> CLM1
    MP --> CLM2
    MP --> CLM3
    MP --> UPS
    UPS --> EC
    UPS --> RT

    %% Network Connections
    EC --> RT
    RT --> SW
    SW -.-> SC1
    SW -.-> SC2

    %% Wireless Connections
    EC -.-> ST
    EC -.-> SL1
    EC -.-> SP1
    EC -.-> MS1
    EC -.-> SLS1
    EC -.-> SP2
    EC -.-> SP3
    EC -.-> AQM1
    EC -.-> THS1
    EC -.-> SL2
    EC -.-> SP4
    EC -.-> MS2
    EC -.-> WL1
    EC -.-> SP5
    EC -.-> WS
    EC -.-> SL3

    %% Monitoring Connections
    WEM -.-> EC
    CLM1 -.-> EC
    CLM2 -.-> EC
    CLM3 -.-> EC

    %% Styling
    classDef electrical fill:#ff6b6b,stroke:#333,stroke-width:2px
    classDef network fill:#4ecdc4,stroke:#333,stroke-width:2px
    classDef sensor fill:#45b7d1,stroke:#333,stroke-width:2px
    classDef control fill:#96ceb4,stroke:#333,stroke-width:2px
    classDef power fill:#feca57,stroke:#333,stroke-width:2px

    class MP,WEM,CLM1,CLM2,CLM3 electrical
    class EC,RT,SW,SC1,SC2 network
    class MS1,MS2,THS1,AQM1,WL1,WS sensor
    class ST,SL1,SL2,SL3,SLS1,SP1,SP2,SP3,SP4,SP5 control
    class UPS power
```

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            FW[Firewall<br/>Edge Protection]
            VPN[VPN Gateway<br/>Remote Access]
            IDS[Intrusion Detection<br/>Network Monitoring]
        end
        
        subgraph "Device Security"
            DC[Device Certificates<br/>RSA-2048]
            DE[Device Encryption<br/>AES-256-GCM]
            DA[Device Authentication<br/>Mutual TLS]
        end
        
        subgraph "Application Security"
            JWT[JWT Tokens<br/>API Authentication]
            RBAC[Role-Based Access<br/>User Permissions]
            API[API Rate Limiting<br/>DDoS Protection]
        end
        
        subgraph "Data Security"
            EAR[Encryption at Rest<br/>Database/Storage]
            EIT[Encryption in Transit<br/>TLS 1.3]
            DLP[Data Loss Prevention<br/>Sensitive Data]
        end
    end

    subgraph "Security Monitoring"
        SIEM[SIEM System<br/>Security Events]
        AL[Audit Logging<br/>All Activities]
        TM[Threat Monitoring<br/>Real-time Analysis]
        IR[Incident Response<br/>Automated Actions]
    end

    subgraph "Compliance & Privacy"
        GDPR[GDPR Compliance<br/>EU Privacy]
        CCPA[CCPA Compliance<br/>CA Privacy]
        SOC[SOC 2 Type II<br/>Security Controls]
        ISO[ISO 27001<br/>Security Management]
    end

    %% Security Flow Connections
    FW --> IDS
    VPN --> DA
    DC --> DE
    JWT --> RBAC
    EAR --> DLP
    EIT --> DLP
    
    %% Monitoring Connections
    IDS --> SIEM
    DA --> AL
    RBAC --> AL
    DLP --> TM
    SIEM --> IR
    
    %% Compliance Connections
    AL --> GDPR
    DLP --> CCPA
    SIEM --> SOC
    IR --> ISO

    %% Styling
    classDef security fill:#ff7675,stroke:#333,stroke-width:2px
    classDef monitoring fill:#fdcb6e,stroke:#333,stroke-width:2px
    classDef compliance fill:#6c5ce7,stroke:#333,stroke-width:2px

    class FW,VPN,IDS,DC,DE,DA,JWT,RBAC,API,EAR,EIT,DLP security
    class SIEM,AL,TM,IR monitoring
    class GDPR,CCPA,SOC,ISO compliance
```

## 📊 Performance & Scalability Architecture

```mermaid
graph LR
    subgraph "Performance Tiers"
        subgraph "Starter (1-10 devices)"
            S_EC[Single Edge Controller<br/>Raspberry Pi 4]
            S_D[Basic Devices<br/>Smart Plugs + Sensors]
            S_C[Basic Cloud<br/>Lambda + RDS]
        end
        
        subgraph "Standard (10-50 devices)"
            ST_EC[Enhanced Edge Controller<br/>Tuya T5AI-CORE]
            ST_D[Extended Devices<br/>Full IoT Ecosystem]
            ST_C[Standard Cloud<br/>EC2 + Timestream]
        end
        
        subgraph "Professional (50-500 devices)"
            P_EC[Multiple Edge Controllers<br/>Load Balanced]
            P_D[Enterprise Devices<br/>Industrial Grade]
            P_C[Scalable Cloud<br/>Auto-scaling Groups]
        end
        
        subgraph "Enterprise (500+ devices)"
            E_EC[Distributed Edge Network<br/>High Availability]
            E_D[Massive Device Fleet<br/>Multi-site Deployment]
            E_C[Enterprise Cloud<br/>Multi-region Setup]
        end
    end

    %% Performance Metrics
    S_EC -.-> |"<100ms response"| S_D
    ST_EC -.-> |"<50ms response"| ST_D
    P_EC -.-> |"<25ms response"| P_D
    E_EC -.-> |"<10ms response"| E_D

    %% Cloud Scaling
    S_C -.-> |"1K events/min"| ST_C
    ST_C -.-> |"10K events/min"| P_C
    P_C -.-> |"100K events/min"| E_C

    %% Styling
    classDef starter fill:#dff0d8,stroke:#3c763d,stroke-width:2px
    classDef standard fill:#d9edf7,stroke:#31708f,stroke-width:2px
    classDef professional fill:#fcf8e3,stroke:#8a6d3b,stroke-width:2px
    classDef enterprise fill:#f2dede,stroke:#a94442,stroke-width:2px

    class S_EC,S_D,S_C starter
    class ST_EC,ST_D,ST_C standard
    class P_EC,P_D,P_C professional
    class E_EC,E_D,E_C enterprise
```

## 🌐 Network Topology

```mermaid
graph TB
    subgraph "Internet"
        ISP[Internet Service Provider<br/>Fiber/Cable/DSL]
        CDN[Content Delivery Network<br/>Global Edge Caching]
    end

    subgraph "Home Network DMZ"
        FW[Firewall/Router<br/>Security Gateway]
        WIFI[WiFi 6 Access Point<br/>Mesh Network]
        SW[Managed Switch<br/>VLAN Capable]
    end

    subgraph "IoT Network (VLAN 10)"
        EC[Edge Controller<br/>192.168.10.1]
        IOT_DEV[IoT Devices<br/>192.168.10.x]
    end

    subgraph "Management Network (VLAN 20)"
        MGMT[Management Interface<br/>192.168.20.1]
        MON[Monitoring Tools<br/>192.168.20.x]
    end

    subgraph "User Network (VLAN 30)"
        USER[User Devices<br/>192.168.30.x]
        GUEST[Guest Network<br/>192.168.40.x]
    end

    %% Internet Connections
    ISP --> CDN
    CDN --> FW

    %% Network Infrastructure
    FW --> WIFI
    FW --> SW
    WIFI -.-> EC
    SW --> EC

    %% VLAN Segmentation
    SW --> IOT_DEV
    SW --> MGMT
    SW --> MON
    SW --> USER
    SW --> GUEST

    %% Inter-VLAN Communication
    EC -.-> |"Controlled Access"| USER
    MGMT -.-> |"Monitoring Only"| IOT_DEV

    %% Styling
    classDef internet fill:#e74c3c,stroke:#333,stroke-width:2px
    classDef infrastructure fill:#3498db,stroke:#333,stroke-width:2px
    classDef iot fill:#2ecc71,stroke:#333,stroke-width:2px
    classDef management fill:#f39c12,stroke:#333,stroke-width:2px
    classDef user fill:#9b59b6,stroke:#333,stroke-width:2px

    class ISP,CDN internet
    class FW,WIFI,SW infrastructure
    class EC,IOT_DEV iot
    class MGMT,MON management
    class USER,GUEST user
```

---

## 📋 Architecture Summary

### Key Architectural Principles

1. **Edge-First Computing**: Critical processing happens locally for low latency and reliability
2. **Cloud-Enhanced Analytics**: Advanced ML and long-term storage in the cloud
3. **Layered Security**: Multiple security layers from device to cloud
4. **Scalable Design**: Architecture scales from home to enterprise deployments
5. **Resilient Operations**: System continues operating during network outages
6. **Privacy by Design**: Sensitive data processed locally when possible

### Performance Characteristics

- **Edge Response Time**: <50ms for device control
- **Cloud Analytics**: <500ms for complex queries
- **Data Throughput**: 100K+ events per minute
- **Device Capacity**: 10,000+ devices per installation
- **Uptime Target**: 99.9% availability

### Security Features

- **End-to-End Encryption**: AES-256-GCM for all sensitive data
- **Certificate-Based Auth**: RSA-2048 device certificates
- **Network Segmentation**: Isolated VLANs for different device types
- **Real-time Monitoring**: Continuous security event analysis
- **Compliance Ready**: GDPR, CCPA, SOC 2, ISO 27001

This architecture provides a robust, scalable, and secure foundation for the Smart Energy Copilot system, supporting everything from small residential installations to large enterprise deployments.