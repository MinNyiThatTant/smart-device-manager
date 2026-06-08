# 🔌 Smart IoT Device Manager

A comprehensive IoT device management platform built with **Node.js**, **Express**, and **MongoDB**. Designed to seamlessly integrate with **ESP32** and other IoT devices via **MQTT** and **WebSocket** protocols.

## ✨ Features

### Core Features
- 📡 **Device Management** - Register, monitor, and control IoT devices
- 📊 **Real-time Telemetry** - Live sensor data visualization
- 🎮 **Remote Commands** - Send commands to devices (reboot, LED control, etc.)
- 🔔 **Alert System** - Threshold-based alerts and notifications
- 🗺️ **Device Mapping** - GPS location tracking
- 📈 **Dashboard Analytics** - Visual statistics and charts
- 🔐 **User Authentication** - JWT-based secure auth with role management
- 🌐 **WebSocket** - Real-time bidirectional communication
- 📶 **MQTT Integration** - ESP32-compatible MQTT broker support

### ESP32 Ready
- Auto device registration via MQTT
- Firmware version tracking
- OTA update support (planned)
- Deep sleep & power management
- WiFi signal strength monitoring
- Sensor calibration support

## 🏗️ Project Structure

```
smart-device-manager/
├── package.json              # Dependencies & scripts
├── .env                      # Environment variables
├── .env.example              # Environment template
├── README.md                 # This file
├── index.html                # Main dashboard (SPA)
├── login.html                # Authentication page
│
├── server/
│   ├── server.js             # Express app entry point
│   │
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   ├── mqtt.js           # MQTT broker client
│   │   └── websocket.js      # WebSocket server
│   │
│   ├── models/
│   │   ├── Device.js         # Device schema
│   │   ├── User.js           # User schema
│   │   ├── Telemetry.js      # Sensor data schema
│   │   ├── Command.js        # Command queue schema
│   │   └── Alert.js          # Alert schema
│   │
│   ├── controllers/
│   │   ├── authController.js # Authentication logic
│   │   ├── userController.js # User management
│   │   ├── deviceController.js # Device CRUD + commands
│   │   ├── telemetryController.js # Data handling
│   │   └── commandController.js # Command management
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── validate.js       # Input validation
│   │   ├── errorHandler.js   # Error handling
│   │   └── logger.js         # Request logging
│   │
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth/*
│   │   ├── userRoutes.js     # /api/users/*
│   │   ├── deviceRoutes.js   # /api/devices/*
│   │   ├── telemetryRoutes.js # /api/telemetry/*
│   │   └── commandRoutes.js  # /api/commands/*
│   │
│   └── public/
│       ├── css/
│       │   └── style.css     # Dashboard styles
│       └── js/
│           └── app.js        # Frontend application
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB 5.0+
- MQTT Broker (Mosquitto recommended)

### 1. Install Dependencies
```bash
cd smart-device-manager
npm install
```

### 2. Configure Environment
```bash
cp .env .env.local
# Edit .env.local with your settings
```

### 3. Start MongoDB
```bash
# Ubuntu/Debian
sudo systemctl start mongod

# macOS (with Homebrew)
brew services start mongodb-community

# Or use MongoDB Atlas cloud database
```

### 4. Start MQTT Broker (Optional for ESP32)
```bash
# Ubuntu
sudo apt install mosquitto
sudo systemctl start mosquitto

# macOS
brew install mosquitto
brew services start mosquitto
```

### 5. Run the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Access the Dashboard
- Open http://localhost:3000
- Default login page: http://localhost:3000/login
- Register a new account or use API directly

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/password` | Update password |
| POST | `/api/auth/logout` | Logout |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:id` | Get device details |
| POST | `/api/devices` | Create device |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Delete device |
| POST | `/api/devices/:id/command` | Send command |
| GET | `/api/devices/:id/telemetry` | Get telemetry |
| GET | `/api/devices/:id/stats` | Get statistics |
| GET | `/api/devices/dashboard/summary` | Dashboard data |
| PUT | `/api/devices/bulk/update` | Bulk update |

### Telemetry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/telemetry` | All telemetry |
| POST | `/api/telemetry` | Record telemetry |
| GET | `/api/telemetry/device/:id` | Device telemetry |
| GET | `/api/telemetry/latest/:id` | Latest reading |
| GET | `/api/telemetry/stats/:id` | Statistics |
| DELETE | `/api/telemetry/cleanup` | Cleanup old data |

### Commands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commands` | List commands |
| POST | `/api/commands` | Send command |
| GET | `/api/commands/:id` | Get command |
| PUT | `/api/commands/:id/status` | Update status |
| POST | `/api/commands/:id/retry` | Retry command |
| DELETE | `/api/commands/:id` | Delete command |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/users/profile/me` | My profile |
| PUT | `/api/users/profile/me` | Update profile |

## 🔧 ESP32 Integration

### MQTT Topics
```
esp32/devices/{deviceId}/register    # Device registration
esp32/devices/{deviceId}/status      # Status updates
esp32/telemetry/{deviceId}           # Sensor data
esp32/commands/{deviceId}            # Incoming commands
```

### Sample ESP32 Registration Payload
```json
{
  "deviceId": "ESP32-001",
  "name": "Living Room Sensor",
  "type": "esp32",
  "capabilities": ["sensor", "wifi"],
  "firmware": "1.0.0"
}
```

### Sample Telemetry Payload
```json
{
  "temperature": 25.5,
  "humidity": 60,
  "pressure": 1013.25,
  "light": 450,
  "voltage": 3.3,
  "batteryLevel": 85
}
```

### Supported Commands
- `reboot` - Restart device
- `led_on` / `led_off` / `led_blink` - LED control
- `relay_on` / `relay_off` / `relay_toggle` - Relay control
- `sleep` / `wake` - Power management
- `get_status` / `get_config` - Device info
- `update_config` - Configuration update
- `factory_reset` - Reset to defaults
- `calibrate` - Sensor calibration

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcrypt (salt rounds: 12)
- Role-based access control (admin, user, viewer)
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS protection
- Input validation with express-validator

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| mqtt | MQTT client |
| ws | WebSocket server |
| dotenv | Environment variables |
| cors | CORS middleware |
| helmet | Security headers |
| express-rate-limit | Rate limiting |
| morgan | HTTP logging |
| express-validator | Input validation |

## 📝 Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart_device_manager
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=admin
MQTT_PASSWORD=admin123
ESP32_DEVICE_TOPIC_PREFIX=esp32/devices
ESP32_COMMAND_TOPIC=esp32/commands
ESP32_TELEMETRY_TOPIC=esp32/telemetry
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

```bash
# Register a test user
curl -X POST http://localhost:3000/api/auth/register   -H "Content-Type: application/json"   -d '{"username":"admin","email":"admin@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@example.com","password":"password123"}'

# Create device (use token from login)
curl -X POST http://localhost:3000/api/devices   -H "Content-Type: application/json"   -H "Authorization: Bearer YOUR_TOKEN"   -d '{"deviceId":"ESP32-001","name":"Test Device","type":"esp32"}'

# Send command
curl -X POST http://localhost:3000/api/commands   -H "Content-Type: application/json"   -H "Authorization: Bearer YOUR_TOKEN"   -d '{"deviceId":"ESP32-001","command":"led_on"}'
```

## 🗺️ Roadmap

- [ ] ESP32 Arduino library
- [ ] OTA firmware updates
- [ ] Mobile app (React Native)
- [ ] Device grouping & scenes
- [ ] Advanced analytics & ML
- [ ] Multi-tenant support
- [ ] Docker deployment
- [ ] Kubernetes support

## 📄 License

MIT License - feel free to use for personal and commercial projects.

## 🤝 Contributing

Contributions welcome! Please submit issues and pull requests.

## 📞 Support

For questions and support, please open an issue on GitHub.

---

**Built with ❤️ for the IoT community**
