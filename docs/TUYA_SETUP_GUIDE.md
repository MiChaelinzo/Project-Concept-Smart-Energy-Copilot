# Tuya Developer Platform Setup Guide

## 🚀 Setting up Tuya Developer Platform for AI Agent Integration

### Prerequisites
- Tuya Developer Account
- T5 AI Core DevKit connected to Raspberry Pi
- Smart Energy Copilot project built and running

## Step 1: Create Tuya Developer Account

1. **Go to Tuya Developer Platform**
   ```
   https://developer.tuya.com/
   ```

2. **Register/Login**
   - Create account or login with existing credentials
   - Verify your email address

3. **Create New Project**
   - Click "Create" → "Create Cloud Project"
   - Project Name: "Smart Energy Copilot AI Agent"
   - Description: "AI-powered energy management with voice control"
   - Industry: "Smart Home" or "Energy Management"
   - Development Method: "Custom Development"

## Step 2: Configure Project Settings

### API Authorization
1. **Go to Project → API → Authorization Management**
2. **Enable Required APIs:**
   - ✅ Device Management
   - ✅ Device Control  
   - ✅ Device Status Query
   - ✅ Scene Automation
   - ✅ Energy Management (if available)
   - ✅ Real-time Message Subscription

### Get API Credentials
1. **Navigate to Project → Overview**
2. **Copy the following:**
   - Client ID
   - Client Secret
   - Data Center (US/EU/CN)

## Step 3: Configure AI Agent Features

### Voice Control Setup
1. **Enable Voice Assistant Integration**
   - Go to Project → Features → Voice Assistant
   - Enable "Custom Voice Commands"
   - Configure wake words: "Hey Energy", "Smart Home", "Copilot"

### Energy Management
1. **Enable Energy APIs**
   - Go to Project → API → Energy Management
   - Enable "Energy Consumption Monitoring"
   - Enable "Device Power Control"
   - Enable "Optimization Recommendations"

### Device Categories
Configure support for these device types:
- ✅ Smart Plugs/Outlets (`cz`)
- ✅ Smart Switches (`kg`) 
- ✅ Smart Lights (`dj`)
- ✅ Thermostats (`wk`)
- ✅ Curtains/Blinds (`cl`)
- ✅ Energy Monitors (`dlq`)

## Step 4: Set up Device Integration

### Add Test Devices
1. **Use Tuya Smart App**
   - Download "Tuya Smart" or "Smart Life" app
   - Add your IoT devices to the app
   - Ensure devices are online and controllable

2. **Link Devices to Project**
   - Go to Project → Devices → Link Tuya App Account
   - Scan QR code with Tuya Smart app
   - Authorize device access

### Device Discovery
Your devices should now appear in:
- Project → Devices → Device List
- Each device will have a unique Device ID

## Step 5: Configure Smart Energy Copilot

### Update Configuration
Edit `config/tuya-config.json`:

```json
{
  "tuya": {
    "clientId": "YOUR_CLIENT_ID_HERE",
    "clientSecret": "YOUR_CLIENT_SECRET_HERE", 
    "endpoint": "https://openapi.tuyaus.com",
    "region": "us",
    "deviceRefreshInterval": 30000,
    "enableRealTimeUpdates": true,
    "aiAgent": {
      "enableVoiceControl": true,
      "enableEnergyOptimization": true,
      "enableScheduling": true,
      "confidenceThreshold": 0.7
    }
  }
}
```

### Test Configuration
```bash
# Run setup script
node scripts/setup-tuya-t5.js

# Test integration
npm run desktop:start
```

## Step 6: AI Agent Voice Commands

### Supported Commands

**Device Control:**
- "Hey Energy, turn on living room light"
- "Smart Home, turn off bedroom fan"
- "Copilot, set brightness to 50%"
- "Turn on all lights"
- "Switch off kitchen outlet"

**Energy Management:**
- "What's my energy consumption today?"
- "Optimize my energy usage"
- "Show me device power status"
- "Which devices are using the most power?"

**Scheduling:**
- "Schedule lights to turn off at 10 PM"
- "Set up energy saving mode"
- "Create automation for weekdays"

## Step 7: Advanced Features

### Real-time Monitoring
Enable real-time device status updates:

```javascript
// In your application
await tuyaIntegration.subscribeToTelemetry(deviceId, (data) => {
  console.log('Device update:', data);
  // Process real-time data with T5 AI Core
});
```

### Energy Optimization
The AI agent will automatically:
- Monitor device power consumption
- Suggest optimization opportunities
- Execute energy-saving commands
- Learn from usage patterns

### Custom Automations
Create custom rules:
- Turn off devices when not in use
- Adjust brightness based on time of day
- Optimize HVAC settings for efficiency

## Step 8: Troubleshooting

### Common Issues

**Authentication Errors:**
```bash
# Check credentials
curl -X POST "https://openapi.tuyeus.com/v1.0/token" \
  -H "client_id: YOUR_CLIENT_ID" \
  -H "sign: YOUR_SIGNATURE"
```

**Device Not Found:**
- Ensure device is online in Tuya Smart app
- Check device authorization in developer console
- Verify device ID in API responses

**T5 AI Core Connection:**
```bash
# Check USB connection
lsusb | grep -i "t5\|ai\|neural"

# Check device permissions
ls -la /dev/ttyUSB* /dev/ttyACM*
sudo chmod 666 /dev/ttyUSB0
```

### Debug Mode
Enable debug logging:
```bash
DEBUG=tuya:* npm run desktop:start
```

## Step 9: Production Deployment

### Security Considerations
- Store credentials in environment variables
- Use HTTPS for all API calls
- Enable device authentication
- Implement rate limiting

### Performance Optimization
- Cache device statuses locally
- Use WebSocket for real-time updates
- Implement retry logic for failed commands
- Monitor API rate limits

### Monitoring
Set up monitoring for:
- API response times
- Device connectivity status
- Voice command accuracy
- Energy optimization effectiveness

## Next Steps

1. **Test Voice Commands** - Try the supported voice commands
2. **Add More Devices** - Connect additional Tuya devices
3. **Customize AI Responses** - Train T5 AI Core with your specific needs
4. **Set up Automations** - Create energy-saving rules
5. **Monitor Performance** - Track energy savings and system performance

## Support Resources

- **Tuya Developer Docs:** https://developer.tuya.com/en/docs
- **API Reference:** https://developer.tuya.com/en/docs/cloud/
- **Community Forum:** https://www.tuyaos.com/
- **GitHub Issues:** Report issues in your project repository

---

🎉 **Congratulations!** Your AI Agent is now integrated with Tuya Platform and ready for voice-controlled energy management!