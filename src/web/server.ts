import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import { AIAgentTuyaIntegrationImpl } from '../desktop/implementations/AIAgentTuyaIntegrationImpl';
import { AIChatbotEngineImpl } from '../desktop/implementations/AIChatbotEngineImpl';
import { TuyaCloudIntegrationImpl } from '../cloud/implementations/TuyaCloudIntegrationImpl';
import { T5AICoreImpl } from '../edge/implementations/T5AICoreImpl';
import { EnergyAnalyticsImpl } from '../cloud/implementations/EnergyAnalyticsImpl';
import { EnergyReportGeneratorImpl } from '../cloud/implementations/EnergyReportGeneratorImpl';
import { NotificationSystemImpl } from '../cloud/implementations/NotificationSystemImpl';

/**
 * Smart Energy Copilot Web Dashboard Server
 * Provides real-time web interface for monitoring and controlling the system
 */
export class DashboardServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private aiAgent?: AIAgentTuyaIntegrationImpl;
  private tuyaIntegration?: TuyaCloudIntegrationImpl;
  private t5AICore?: T5AICoreImpl;
  private energyAnalytics?: EnergyAnalyticsImpl;
  private reportGenerator?: EnergyReportGeneratorImpl;
  private notificationSystem?: NotificationSystemImpl;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve static files from web directory
    this.app.use(express.static(path.join(__dirname, '../web/public')));
  }

  private setupRoutes(): void {
    // Dashboard home page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/public/index.html'));
    });

    // API Routes
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = {
          aiAgent: this.aiAgent?.getStatus() || { isInitialized: false },
          t5AICore: this.t5AICore?.isReady() || false,
          tuyaIntegration: !!this.tuyaIntegration,
          timestamp: new Date().toISOString()
        };
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
      }
    });

    // Device management
    this.app.get('/api/devices', async (req, res) => {
      try {
        if (!this.tuyaIntegration) {
          return res.status(503).json({ error: 'Tuya integration not available' });
        }
        
        const devices = await this.tuyaIntegration.discoverDevices();
        res.json(devices);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get devices' });
      }
    });

    this.app.get('/api/devices/:deviceId/status', async (req, res) => {
      try {
        if (!this.tuyaIntegration) {
          return res.status(503).json({ error: 'Tuya integration not available' });
        }
        
        const status = await this.tuyaIntegration.getDeviceStatus(req.params.deviceId);
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get device status' });
      }
    });

    this.app.post('/api/devices/:deviceId/control', async (req, res) => {
      try {
        if (!this.tuyaIntegration) {
          return res.status(503).json({ error: 'Tuya integration not available' });
        }
        
        await this.tuyaIntegration.sendCommand(req.params.deviceId, req.body);
        
        // Broadcast device update to all connected clients
        this.io.emit('deviceUpdate', {
          deviceId: req.params.deviceId,
          command: req.body,
          timestamp: new Date().toISOString()
        });
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to control device' });
      }
    });

    // Voice command processing
    this.app.post('/api/voice/command', async (req, res) => {
      try {
        if (!this.aiAgent) {
          return res.status(503).json({ error: 'AI Agent not available' });
        }
        
        const { command, context } = req.body;
        const result = await this.aiAgent.executeDeviceControl(command, context || {});
        
        // Broadcast voice command result
        this.io.emit('voiceCommandResult', {
          command,
          result,
          timestamp: new Date().toISOString()
        });
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to process voice command' });
      }
    });

    // Energy monitoring
    this.app.get('/api/energy/overview', async (req, res) => {
      try {
        if (!this.aiAgent) {
          return res.status(503).json({ error: 'AI Agent not available' });
        }
        
        const deviceStatus = await this.aiAgent.getDeviceStatus();
        const energyData = {
          totalDevices: deviceStatus.totalDevices,
          onlineDevices: deviceStatus.onlineDevices,
          estimatedConsumption: this.calculateEstimatedConsumption(deviceStatus.devices),
          timestamp: new Date().toISOString()
        };
        
        res.json(energyData);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get energy overview' });
      }
    });

    // T5 AI Core status
    this.app.get('/api/t5/status', async (req, res) => {
      try {
        const status = {
          connected: this.t5AICore?.isReady() || false,
          capabilities: ['voice_recognition', 'energy_optimization', 'text_to_speech'],
          lastActivity: new Date().toISOString()
        };
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get T5 status' });
      }
    });

    // System logs
    this.app.get('/api/logs', (req, res) => {
      // In a real implementation, you'd read from log files
      const logs = [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Dashboard server started' },
        { timestamp: new Date().toISOString(), level: 'info', message: 'T5 AI Core connected' },
        { timestamp: new Date().toISOString(), level: 'info', message: 'Tuya integration initialized' }
      ];
      res.json(logs);
    });

    // Energy Analytics endpoints
    this.app.get('/api/analytics/usage', async (req, res) => {
      try {
        if (!this.energyAnalytics) {
          return res.status(503).json({ error: 'Energy analytics not available' });
        }
        const period = (req.query.period as string) || 'today';
        const usage = await this.energyAnalytics.getTotalEnergyUsage(period);
        res.json(usage);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get energy usage' });
      }
    });

    this.app.get('/api/analytics/pricing', async (req, res) => {
      try {
        if (!this.energyAnalytics) {
          return res.status(503).json({ error: 'Energy analytics not available' });
        }
        const pricing = await this.energyAnalytics.getCurrentEnergyPricing();
        res.json(pricing);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get pricing' });
      }
    });

    this.app.get('/api/analytics/grid-status', async (req, res) => {
      try {
        if (!this.energyAnalytics) {
          return res.status(503).json({ error: 'Energy analytics not available' });
        }
        const gridStatus = await this.energyAnalytics.getGridStatus();
        res.json(gridStatus);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get grid status' });
      }
    });

    this.app.get('/api/analytics/trends', async (req, res) => {
      try {
        if (!this.energyAnalytics) {
          return res.status(503).json({ error: 'Energy analytics not available' });
        }
        const deviceId = req.query.deviceId as string | undefined;
        const trends = await this.energyAnalytics.getEnergyTrends(deviceId);
        res.json(trends);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get energy trends' });
      }
    });

    // Energy Report endpoints
    this.app.get('/api/reports/:type', async (req, res) => {
      try {
        if (!this.reportGenerator) {
          return res.status(503).json({ error: 'Report generator not available' });
        }
        const type = req.params.type as 'daily' | 'weekly' | 'monthly';
        const userId = (req.query.userId as string) || 'default-user';
        const report = await this.reportGenerator.generateReport(userId, type);
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate report' });
      }
    });

    this.app.get('/api/reports/:type/export', async (req, res) => {
      try {
        if (!this.reportGenerator) {
          return res.status(503).json({ error: 'Report generator not available' });
        }
        const type = req.params.type as 'daily' | 'weekly' | 'monthly';
        const format = (req.query.format as 'json' | 'csv') || 'json';
        const userId = (req.query.userId as string) || 'default-user';
        const report = await this.reportGenerator.generateReport(userId, type);
        const exported = await this.reportGenerator.exportReport(report, format);
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=energy-report-${type}.csv`);
        }
        res.send(exported);
      } catch (error) {
        res.status(500).json({ error: 'Failed to export report' });
      }
    });

    // Notification endpoints
    this.app.get('/api/notifications', async (req, res) => {
      try {
        if (!this.notificationSystem) {
          return res.status(503).json({ error: 'Notification system not available' });
        }
        const userId = (req.query.userId as string) || 'default-user';
        const unreadOnly = req.query.unread === 'true';
        const limit = parseInt(req.query.limit as string) || 50;
        
        const notifications = await this.notificationSystem.getNotifications({
          userId,
          read: unreadOnly ? false : undefined,
          dismissed: false,
          limit
        });
        res.json(notifications);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get notifications' });
      }
    });

    this.app.get('/api/notifications/stats', async (req, res) => {
      try {
        if (!this.notificationSystem) {
          return res.status(503).json({ error: 'Notification system not available' });
        }
        const userId = (req.query.userId as string) || 'default-user';
        const stats = await this.notificationSystem.getNotificationStats(userId);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get notification stats' });
      }
    });

    this.app.post('/api/notifications/:id/read', async (req, res) => {
      try {
        if (!this.notificationSystem) {
          return res.status(503).json({ error: 'Notification system not available' });
        }
        await this.notificationSystem.markAsRead(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification as read' });
      }
    });

    this.app.post('/api/notifications/:id/dismiss', async (req, res) => {
      try {
        if (!this.notificationSystem) {
          return res.status(503).json({ error: 'Notification system not available' });
        }
        await this.notificationSystem.dismissNotification(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to dismiss notification' });
      }
    });

    this.app.post('/api/notifications/read-all', async (req, res) => {
      try {
        if (!this.notificationSystem) {
          return res.status(503).json({ error: 'Notification system not available' });
        }
        const userId = (req.query.userId as string) || 'default-user';
        await this.notificationSystem.markAllAsRead(userId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
      }
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected to dashboard:', socket.id);
      
      // Send initial status
      socket.emit('systemStatus', {
        aiAgent: this.aiAgent?.getStatus() || { isInitialized: false },
        t5AICore: this.t5AICore?.isReady() || false,
        tuyaIntegration: !!this.tuyaIntegration
      });

      // Handle voice commands from web interface
      socket.on('voiceCommand', async (data: { command: string; context?: any }) => {
        try {
          if (this.aiAgent) {
            const result = await this.aiAgent.executeDeviceControl(data.command, data.context || {});
            socket.emit('voiceCommandResult', result);
            
            // Broadcast to all clients
            this.io.emit('voiceActivity', {
              command: data.command,
              result,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Voice command failed' });
        }
      });

      // Handle device control from web interface
      socket.on('deviceControl', async (data: { deviceId: string; command: any }) => {
        try {
          if (this.tuyaIntegration) {
            await this.tuyaIntegration.sendCommand(data.deviceId, data.command);
            
            // Broadcast device update
            this.io.emit('deviceUpdate', {
              deviceId: data.deviceId,
              command: data.command,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Device control failed' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected from dashboard:', socket.id);
      });
    });
  }

  async initialize(config: any): Promise<void> {
    try {
      // Initialize AI components
      if (config.enableAIAgent) {
        const aiChatbot = new AIChatbotEngineImpl();
        await aiChatbot.initialize(config.aiChatbot);
        
        this.aiAgent = new AIAgentTuyaIntegrationImpl(
          aiChatbot,
          config.tuya,
          config.t5AICore
        );
        await this.aiAgent.initialize();
      }

      // Initialize Tuya integration
      if (config.tuya) {
        this.tuyaIntegration = new TuyaCloudIntegrationImpl(config.tuya);
        await this.tuyaIntegration.initialize();
      }

      // Initialize T5 AI Core
      if (config.t5AICore) {
        this.t5AICore = new T5AICoreImpl();
        await this.t5AICore.initializeWithConfig(config.t5AICore);
      }

      // Initialize Energy Analytics
      this.energyAnalytics = new EnergyAnalyticsImpl();
      
      // Initialize Report Generator
      this.reportGenerator = new EnergyReportGeneratorImpl(this.energyAnalytics);
      
      // Initialize Notification System
      this.notificationSystem = new NotificationSystemImpl();
      
      // Set up notification subscriptions for real-time updates
      this.setupNotificationBroadcasting();

      // Start real-time monitoring
      this.startRealTimeMonitoring();

      console.log('Dashboard server initialized successfully');
      console.log('✅ Energy Analytics initialized');
      console.log('✅ Report Generator initialized');
      console.log('✅ Notification System initialized');
    } catch (error) {
      console.error('Failed to initialize dashboard server:', error);
      throw error;
    }
  }

  private setupNotificationBroadcasting(): void {
    if (!this.notificationSystem) return;
    
    // Subscribe to notifications for real-time broadcasting
    this.notificationSystem.subscribe('default-user', (notification) => {
      this.io.emit('notification', notification);
    });
  }

  private startRealTimeMonitoring(): void {
    // Update system status every 30 seconds
    setInterval(async () => {
      try {
        const status = {
          aiAgent: this.aiAgent?.getStatus() || { isInitialized: false },
          t5AICore: this.t5AICore?.isReady() || false,
          tuyaIntegration: !!this.tuyaIntegration,
          timestamp: new Date().toISOString()
        };

        this.io.emit('systemStatusUpdate', status);

        // Update energy data
        if (this.aiAgent) {
          const deviceStatus = await this.aiAgent.getDeviceStatus();
          const energyData = {
            totalDevices: deviceStatus.totalDevices,
            onlineDevices: deviceStatus.onlineDevices,
            estimatedConsumption: this.calculateEstimatedConsumption(deviceStatus.devices),
            timestamp: new Date().toISOString()
          };

          this.io.emit('energyUpdate', energyData);
        }
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 30000);
  }

  private calculateEstimatedConsumption(devices: any[]): number {
    // Simple estimation based on device types and status
    let totalConsumption = 0;
    
    devices.forEach(device => {
      if (device.currentStatus?.isOnline && device.currentStatus?.powerState === 'on') {
        switch (device.type) {
          case 'light':
            totalConsumption += 10; // 10W average for LED lights
            break;
          case 'outlet':
            totalConsumption += 50; // 50W average for plugged devices
            break;
          case 'thermostat':
            totalConsumption += 1500; // 1.5kW for HVAC
            break;
          default:
            totalConsumption += 25; // 25W default
        }
      }
    });
    
    return totalConsumption;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🌐 Smart Energy Copilot Dashboard running at http://localhost:${this.port}`);
        console.log(`📊 Real-time monitoring and control interface available`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Dashboard server stopped');
        resolve();
      });
    });
  }
}