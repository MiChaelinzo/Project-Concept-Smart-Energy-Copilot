# Smart Energy Copilot Web Dashboard

A comprehensive web-based dashboard for monitoring and controlling your Smart Energy Copilot system with real-time updates, device management, and voice control capabilities.

## Features

### 🏠 System Overview
- Real-time system status monitoring
- Connected device count and status
- Energy consumption tracking
- AI assistant confidence metrics
- Carbon footprint savings

### 🔌 Device Management
- View all connected Tuya IoT devices
- Control devices (lights, outlets, thermostats)
- Real-time device status updates
- Device grouping and organization

### ⚡ Energy Monitoring
- Live energy consumption charts
- Historical usage data (1H, 24H, 7D, 30D)
- Energy optimization insights
- Cost savings calculations

### 🎤 Voice Control Interface
- Voice command processing via T5 AI Core
- Text-based command input
- Command suggestions and history
- Natural language device control

### 📊 System Logs
- Real-time system event logging
- Filterable log levels (Error, Warning, Info)
- Device activity tracking
- AI agent decision logs

## Quick Start

### Prerequisites
- Node.js 18+ installed
- T5 AI Core DevKit connected via USB-C
- Tuya Developer Platform account and devices
- Raspberry Pi 4 Model B (recommended)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Configure Tuya integration:**
   ```bash
   # Copy and edit the Tuya configuration
   cp config/tuya-config.json.example config/tuya-config.json
   # Edit with your Tuya credentials
   ```

4. **Start the dashboard:**
   ```bash
   # Production mode (port 3000)
   npm run web
   
   # Development mode (port 3001)
   npm run web:dev
   ```

5. **Access the dashboard:**
   Open your browser to `http://localhost:3000`

## Configuration

### Tuya Cloud Integration
Create `config/tuya-config.json` with your Tuya Developer Platform credentials:

```json
{
  "accessId": "your_tuya_access_id",
  "accessSecret": "your_tuya_access_secret", 
  "endpoint": "https://openapi.tuyaus.com",
  "uid": "your_tuya_user_id"
}
```

### T5 AI Core Setup
The dashboard automatically detects T5 AI Core on common USB-C serial ports:
- Linux/Raspberry Pi: `/dev/ttyUSB0`, `/dev/ttyACM0`
- Windows: `COM3`, `COM4`, `COM5`

## API Endpoints

The dashboard provides a REST API for integration:

### System Status
- `GET /api/status` - Get overall system status
- `GET /api/t5/status` - Get T5 AI Core status

### Device Management  
- `GET /api/devices` - List all devices
- `GET /api/devices/:id/status` - Get device status
- `POST /api/devices/:id/control` - Control device

### Energy Monitoring
- `GET /api/energy/overview` - Get energy consumption overview

### Voice Commands
- `POST /api/voice/command` - Process voice/text command

### System Logs
- `GET /api/logs` - Get system logs

## Real-time Updates

The dashboard uses Socket.IO for real-time communication:

### Client Events (Dashboard → Server)
- `voiceCommand` - Send voice command for processing
- `deviceControl` - Send device control command

### Server Events (Server → Dashboard)
- `systemStatusUpdate` - System status changes
- `energyUpdate` - Energy consumption updates  
- `deviceUpdate` - Device status changes
- `voiceCommandResult` - Voice command results
- `voiceActivity` - Voice command activity

## Voice Commands

### Supported Commands
- **Device Control:**
  - "Turn on living room lights"
  - "Turn off all lights"
  - "Set thermostat to 72 degrees"
  - "Turn on bedroom outlet"

- **Information:**
  - "Show energy usage"
  - "What's my current consumption?"
  - "How many devices are online?"

- **System Control:**
  - "Optimize energy usage"
  - "Run energy analysis"
  - "Show device status"

### Voice Interface Usage
1. **Hold to Speak:** Press and hold the microphone button
2. **Text Input:** Type commands in the text field
3. **Quick Commands:** Click suggested command buttons
4. **History:** View recent commands and results

## Troubleshooting

### Common Issues

**Dashboard won't start:**
- Check if port 3000 is available
- Verify all dependencies are installed: `npm install`
- Ensure TypeScript compilation succeeded: `npm run build`

**T5 AI Core not detected:**
- Check USB-C connection to Raspberry Pi
- Verify device permissions: `sudo chmod 666 /dev/ttyUSB0`
- Try different USB ports

**Tuya devices not showing:**
- Verify Tuya configuration in `config/tuya-config.json`
- Check Tuya Developer Platform credentials
- Ensure devices are online and linked to your account

**Voice commands not working:**
- Check T5 AI Core connection and status
- Verify microphone permissions in browser
- Try text commands first to test AI processing

### Debug Mode

Start dashboard in development mode for detailed logging:
```bash
npm run web:dev
```

### Log Files
System logs are available in the dashboard under the "System Logs" section.

## Browser Compatibility

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Note:** Voice recognition requires HTTPS in production or localhost for development.

## Performance

### Recommended System Requirements
- **CPU:** ARM Cortex-A72 (Raspberry Pi 4) or equivalent
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 32GB microSD card (Class 10)
- **Network:** Stable internet connection for Tuya Cloud

### Optimization Tips
- Use wired Ethernet connection when possible
- Close unused browser tabs
- Enable hardware acceleration in browser
- Monitor system resources in dashboard

## Security

### Network Security
- Dashboard runs on local network by default
- Use reverse proxy (nginx) for external access
- Enable HTTPS for production deployments
- Configure firewall rules appropriately

### API Security
- API endpoints require local network access
- Consider authentication for production use
- Monitor system logs for suspicious activity

## Development

### Project Structure
```
src/web/
├── server.ts              # Express server and Socket.IO
├── start-dashboard.ts     # Dashboard launcher
├── public/
│   ├── index.html        # Main dashboard HTML
│   ├── styles.css        # Dashboard styling
│   └── dashboard.js      # Frontend JavaScript
└── README.md             # This file
```

### Adding Features
1. **Backend:** Add API endpoints in `server.ts`
2. **Frontend:** Update HTML/CSS/JS in `public/` directory
3. **Real-time:** Use Socket.IO events for live updates

### Testing
```bash
# Run all tests
npm test

# Test specific components
npm test -- --testPathPattern=web
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review system logs in the dashboard
3. Check T5 AI Core and Tuya device status
4. Verify network connectivity and configuration

## License

MIT License - see LICENSE file for details.