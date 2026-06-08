const WebSocket = require('ws');

let wss = null;

const setupWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            ws.deviceId = data.deviceId;
            ws.send(JSON.stringify({ type: 'subscribed', deviceId: data.deviceId }));
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Smart Device Manager',
      timestamp: new Date().toISOString()
    }));
  });

  console.log('🌐 WebSocket server initialized');
};

const broadcastToAll = (data) => {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

const broadcastToDevice = (deviceId, data) => {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.deviceId === deviceId) {
      client.send(JSON.stringify(data));
    }
  });
};

module.exports = {
  setupWebSocket,
  broadcastToAll,
  broadcastToDevice
};
