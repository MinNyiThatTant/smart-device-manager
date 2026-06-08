const mqtt = require('mqtt');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');

let mqttClient = null;

const connectMQTT = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

  mqttClient = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ MQTT Broker Connected');

    // Subscribe to ESP32 topics
    const topics = [
      `${process.env.ESP32_DEVICE_TOPIC_PREFIX || 'esp32/devices'}/+/status`,
      `${process.env.ESP32_TELEMETRY_TOPIC || 'esp32/telemetry'}/+`,
      `${process.env.ESP32_DEVICE_TOPIC_PREFIX || 'esp32/devices'}/+/register`
    ];

    topics.forEach(topic => {
      mqttClient.subscribe(topic, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to: ${topic}`);
        } else {
          console.error(`❌ Failed to subscribe to ${topic}:`, err);
        }
      });
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const topicParts = topic.split('/');

      // Handle device registration
      if (topic.includes('/register')) {
        await handleDeviceRegistration(data);
      }
      // Handle device status updates
      else if (topic.includes('/status')) {
        await handleDeviceStatus(topicParts[2], data);
      }
      // Handle telemetry data
      else if (topic.includes('/telemetry')) {
        await handleTelemetry(topicParts[2], data);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
  });

  mqttClient.on('disconnect', () => {
    console.log('MQTT Disconnected');
  });

  return mqttClient;
};

const handleDeviceRegistration = async (data) => {
  try {
    const { deviceId, name, type, capabilities } = data;

    let device = await Device.findOne({ deviceId });

    if (!device) {
      device = new Device({
        deviceId,
        name: name || `ESP32-${deviceId}`,
        type: type || 'esp32',
        status: 'online',
        capabilities: capabilities || ['sensor', 'actuator'],
        lastSeen: new Date()
      });
      await device.save();
      console.log(`✅ New device registered: ${deviceId}`);
    } else {
      device.status = 'online';
      device.lastSeen = new Date();
      await device.save();
      console.log(`🔄 Device reconnected: ${deviceId}`);
    }
  } catch (error) {
    console.error('Device registration error:', error);
  }
};

const handleDeviceStatus = async (deviceId, data) => {
  try {
    await Device.findOneAndUpdate(
      { deviceId },
      {
        status: data.status || 'online',
        lastSeen: new Date(),
        ...(data.firmware && { firmware: data.firmware }),
        ...(data.ip && { ipAddress: data.ip })
      }
    );
  } catch (error) {
    console.error('Status update error:', error);
  }
};

const handleTelemetry = async (deviceId, data) => {
  try {
    const telemetry = new Telemetry({
      deviceId,
      temperature: data.temperature,
      humidity: data.humidity,
      pressure: data.pressure,
      light: data.light,
      motion: data.motion,
      voltage: data.voltage,
      current: data.current,
      power: data.power,
      rawData: data
    });
    await telemetry.save();

    // Update device last seen
    await Device.findOneAndUpdate(
      { deviceId },
      { lastSeen: new Date() }
    );
  } catch (error) {
    console.error('Telemetry save error:', error);
  }
};

const publishCommand = (deviceId, command, payload = {}) => {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT not connected');
    return false;
  }

  const topic = `${process.env.ESP32_COMMAND_TOPIC || 'esp32/commands'}/${deviceId}`;
  const message = JSON.stringify({
    command,
    payload,
    timestamp: new Date().toISOString()
  });

  mqttClient.publish(topic, message, (err) => {
    if (err) {
      console.error('Command publish error:', err);
    } else {
      console.log(`📤 Command sent to ${deviceId}: ${command}`);
    }
  });

  return true;
};

module.exports = {
  connectMQTT,
  publishCommand,
  getMqttClient: () => mqttClient
};
